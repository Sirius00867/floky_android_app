import { persistStorage } from '@/store/storage';
import { proxyFetch } from '@/utils/proxyFetch';
import {
  validateCredentials,
  sanitizeError,
  isCorsOrNetworkError,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from '@/utils/securityUtils';

const STORAGE_KEY = 'librelink_official_session';
const RATE_KEY = 'librelink_login';
const REFRESH_MARGIN_MS = 10 * 60 * 1000;

// LibreView API — detecta región automáticamente
const BASE_URL_EU = 'https://api-eu.libreview.io';
const BASE_URL_US = 'https://api.libreview.io';

// Headers sin hop-by-hop (Connection, Accept-Encoding, Transfer-Encoding).
// Netlify los eliminará igualmente al proxificar, pero enviarlos puede provocar
// errores 400 o respuestas gzip sin decodificar en algunos proxies.
const LLU_HEADERS = {
  'Content-Type': 'application/json',
  'Accept':       'application/json',
  'product':      'llu.android',
  'version':      '4.12.0',
};

export interface LibreLinkSession {
  userId:    string;
  authToken: string;
  patientId: string;
  expiresAt: number;
  region:    'EU' | 'US'; // servidor real con el que se autenticó
}

export interface LibreLinkReading {
  sgv:       number;
  timestamp: number;
  trend?:    string;
}

// ── Session ───────────────────────────────────────────────────────────────────

function regionBaseUrl(region: 'EU' | 'US'): string {
  return region === 'US' ? BASE_URL_US : BASE_URL_EU;
}

async function saveSession(session: LibreLinkSession) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<LibreLinkSession | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as LibreLinkSession;
  // Sesiones antiguas sin campo `region` asumen EU
  if (!parsed.region) parsed.region = 'EU';
  return parsed;
}

export async function clearLibreLinkOfficialSession() {
  await persistStorage.removeItem(STORAGE_KEY);
}

export async function isLibreLinkOfficialConnected(): Promise<boolean> {
  const s = await loadSession();
  return !!s && Date.now() < s.expiresAt;
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function loginLibreLinkOfficial(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const validation = validateCredentials(email, password);
  if (!validation.ok) return { ok: false, error: validation.error };

  const rateCheck = checkRateLimit(RATE_KEY);
  if (!rateCheck.allowed) {
    const mins = Math.ceil((rateCheck.waitSeconds ?? 0) / 60);
    return { ok: false, error: `Demasiados intentos. Espera ${mins} minutos.` };
  }

  const tryLogin = (baseUrl: string) =>
    proxyFetch(`${baseUrl}/llu/auth/login`, {
      method: 'POST',
      headers: LLU_HEADERS,
      body: JSON.stringify({ email: email.trim(), password }),
    });

  try {
    // 1. Intentar con servidor EU
    const resEu = await tryLogin(BASE_URL_EU);

    if (resEu.ok) {
      const data = await resEu.json();
      // Status 4 + redirect = usuario en región US
      if (data.status === 4 && data.data?.redirect) {
        const resUs = await tryLogin(BASE_URL_US);
        if (!resUs.ok) {
          recordFailedAttempt(RATE_KEY);
          return { ok: false, error: 'No se pudo conectar con LibreView. Comprueba tus credenciales.' };
        }
        const dataUs = await resUs.json();
        return processLoginResponse(dataUs, 'US');
      }
      return processLoginResponse(data, 'EU');
    }

    if (resEu.status === 401) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: 'Email o contraseña incorrectos' };
    }
    recordFailedAttempt(RATE_KEY);
    return { ok: false, error: `Error del servidor (${resEu.status})` };
  } catch (e) {
    if (isCorsOrNetworkError(e)) {
      return {
        ok: false,
        error: '❌ No se pudo conectar con FreeStyle LibreLink. Comprueba que tus credenciales son correctas y que la plataforma permite conexiones externas en la web.',
      };
    }
    return { ok: false, error: sanitizeError(e) };
  }
}

async function processLoginResponse(
  data: Record<string, unknown>,
  region: 'EU' | 'US',
): Promise<{ ok: boolean; error?: string }> {
  const ticket  = (data.data as Record<string, unknown> | undefined)?.authTicket as Record<string, unknown> | undefined;
  const user    = (data.data as Record<string, unknown> | undefined)?.user    as Record<string, unknown> | undefined;
  const token     = ticket?.token   as string | undefined;
  const userId    = user?.id        as string | undefined;
  const patientId = (user?.patientId as string | undefined) ?? userId;

  if (!token || !userId) {
    recordFailedAttempt(RATE_KEY);
    return { ok: false, error: 'Respuesta inválida de LibreView' };
  }

  clearRateLimit(RATE_KEY);
  const expiresIn = (ticket?.expires as number | undefined) ?? 3600;
  await saveSession({
    userId,
    authToken: token,
    patientId: patientId!,
    expiresAt: Date.now() + expiresIn * 1000,
    region,
  });
  return { ok: true };
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function getValidSession(): Promise<LibreLinkSession | null> {
  const session = await loadSession();
  if (!session) return null;

  if (Date.now() < session.expiresAt - REFRESH_MARGIN_MS) return session;

  // Renovar token usando el servidor de la región correcta
  try {
    const res = await proxyFetch(`${regionBaseUrl(session.region)}/llu/auth/continue/librelink`, {
      method: 'POST',
      headers: { ...LLU_HEADERS, Authorization: `Bearer ${session.authToken}` },
    });

    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      const ticket = (data.data as Record<string, unknown> | undefined)?.authTicket as Record<string, unknown> | undefined;
      const token = ticket?.token as string | undefined;
      if (token) {
        const expiresIn = (ticket?.expires as number | undefined) ?? 3600;
        const renewed: LibreLinkSession = {
          ...session,
          authToken: token,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        await saveSession(renewed);
        return renewed;
      }
    }
  } catch { /* renovación silenciosa — se usa sesión actual si no expiró */ }

  if (Date.now() < session.expiresAt) return session;
  await clearLibreLinkOfficialSession();
  return null;
}

// ── Data ──────────────────────────────────────────────────────────────────────

export async function fetchLibreLinkOfficialReadings(): Promise<LibreLinkReading[]> {
  const session = await getValidSession();
  if (!session) return [];

  const base = regionBaseUrl(session.region);
  const authHeaders = { ...LLU_HEADERS, Authorization: `Bearer ${session.authToken}` };

  try {
    // Obtener lista de conexiones (pacientes vinculados)
    const connRes = await proxyFetch(`${base}/llu/connections`, { headers: authHeaders });
    if (!connRes.ok) {
      if (connRes.status === 401) await clearLibreLinkOfficialSession();
      return [];
    }
    const connData = await connRes.json() as Record<string, unknown>;
    const connections = (connData.data as unknown[]) ?? [];

    if (connections.length === 0) return [];

    // Primer paciente (self o familiar vinculado)
    const firstConn = connections[0] as Record<string, unknown>;
    const patientId = (firstConn.patientId as string | undefined) ?? session.patientId;

    const graphRes = await proxyFetch(`${base}/llu/connections/${patientId}/graph`, { headers: authHeaders });
    if (!graphRes.ok) return [];

    const graphData = await graphRes.json() as Record<string, unknown>;
    const nested = graphData.data as Record<string, unknown> | undefined;
    const measurements = (nested?.graphData as unknown[]) ?? [];

    return (measurements as Array<Record<string, unknown>>)
      .filter(m => (m.Value as number) > 0)
      .map(m => ({
        sgv:       m.Value as number,
        timestamp: new Date(m.Timestamp as string).getTime(),
        trend:     m.TrendArrow as string | undefined,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export async function fetchLibreLinkOfficialCurrent(): Promise<LibreLinkReading | null> {
  const readings = await fetchLibreLinkOfficialReadings();
  return readings.length > 0 ? readings[readings.length - 1] : null;
}
