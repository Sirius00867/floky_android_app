import AsyncStorage from '@react-native-async-storage/async-storage';
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

// LibreView API — región EU por defecto (cubre España y la mayoría de Europa)
// Para US usar: https://api.libreview.io
const BASE_URL = 'https://api-eu.libreview.io';

const LLU_HEADERS = {
  'Content-Type':  'application/json',
  'Accept':        'application/json',
  'product':       'llu.android',
  'version':       '4.7.0',
  'Accept-Encoding': 'gzip',
  'Connection':    'keep-alive',
};

export interface LibreLinkSession {
  userId:    string;
  authToken: string;
  patientId: string;
  expiresAt: number;
}

export interface LibreLinkReading {
  sgv:       number;
  timestamp: number;
  trend?:    string;
}

// ── Session ───────────────────────────────────────────────────────────────────

async function saveSession(session: LibreLinkSession) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<LibreLinkSession | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearLibreLinkOfficialSession() {
  await AsyncStorage.removeItem(STORAGE_KEY);
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

  try {
    const res = await fetch(`${BASE_URL}/llu/auth/login`, {
      method: 'POST',
      headers: LLU_HEADERS,
      body: JSON.stringify({ email: email.trim(), password }),
    });

    if (res.status === 401) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: 'Email o contraseña incorrectos' };
    }
    if (!res.ok) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: `Error del servidor (${res.status})` };
    }

    const data = await res.json();

    // Respuesta 4xx con redirect (región incorrecta)
    if (data.status === 4 && data.data?.redirect) {
      return { ok: false, error: 'Región incorrecta. Contacta con soporte.' };
    }

    const token = data.data?.authTicket?.token;
    const userId = data.data?.user?.id;
    const patientId = data.data?.user?.patientId ?? userId;

    if (!token || !userId) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: 'Respuesta inválida de LibreView' };
    }

    clearRateLimit(RATE_KEY);
    const expiresIn = data.data?.authTicket?.expires ?? 3600;
    await saveSession({ userId, authToken: token, patientId, expiresAt: Date.now() + expiresIn * 1000 });
    return { ok: true };
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

// ── Token refresh ─────────────────────────────────────────────────────────────

async function getValidSession(): Promise<LibreLinkSession | null> {
  const session = await loadSession();
  if (!session) return null;

  if (Date.now() < session.expiresAt - REFRESH_MARGIN_MS) return session;

  try {
    const res = await fetch(`${BASE_URL}/llu/auth/continue/librelink`, {
      method: 'POST',
      headers: { ...LLU_HEADERS, Authorization: `Bearer ${session.authToken}` },
    });

    if (res.ok) {
      const data = await res.json();
      const token = data.data?.authTicket?.token;
      if (token) {
        const expiresIn = data.data?.authTicket?.expires ?? 3600;
        const renewed: LibreLinkSession = {
          ...session,
          authToken: token,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        await saveSession(renewed);
        return renewed;
      }
    }
  } catch { /* renovación silenciosa */ }

  if (Date.now() < session.expiresAt) return session;
  await clearLibreLinkOfficialSession();
  return null;
}

// ── Data ──────────────────────────────────────────────────────────────────────

export async function fetchLibreLinkOfficialReadings(): Promise<LibreLinkReading[]> {
  const session = await getValidSession();
  if (!session) return [];

  try {
    // Obtener lista de conexiones (pacientes vinculados)
    const connRes = await fetch(`${BASE_URL}/llu/connections`, {
      headers: { ...LLU_HEADERS, Authorization: `Bearer ${session.authToken}` },
    });
    if (!connRes.ok) {
      if (connRes.status === 401) await clearLibreLinkOfficialSession();
      return [];
    }
    const connData = await connRes.json();
    const connections: any[] = connData.data ?? [];

    if (connections.length === 0) return [];

    // Usar el primer paciente (self o familiar vinculado)
    const patientId = connections[0].patientId ?? session.patientId;

    const graphRes = await fetch(`${BASE_URL}/llu/connections/${patientId}/graph`, {
      headers: { ...LLU_HEADERS, Authorization: `Bearer ${session.authToken}` },
    });
    if (!graphRes.ok) return [];

    const graphData = await graphRes.json();
    const measurements: any[] = graphData.data?.graphData ?? [];

    return measurements
      .filter((m: any) => m.Value > 0)
      .map((m: any) => ({
        sgv:       m.Value,
        timestamp: new Date(m.Timestamp).getTime(),
        trend:     m.TrendArrow,
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
