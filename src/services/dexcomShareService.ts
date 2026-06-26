import { persistStorage } from '@/store/storage';
import { proxyFetch } from '@/utils/proxyFetch';
import {
  validatePassword,
  sanitizeError,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
} from '@/utils/securityUtils';

const STORAGE_KEY = 'dexcom_share_session';
const RATE_KEY    = 'dexcom_share_login';

// Dexcom Share Web Services — endpoints oficiales
// US:  https://share1.dexcom.com  (EE.UU.)
// EU:  https://shareous1.dexcom.com  (España / Europa / resto del mundo)
const SHARE_BASE_US = 'https://share1.dexcom.com/ShareWebServices/Services';
const SHARE_BASE_EU = 'https://shareous1.dexcom.com/ShareWebServices/Services';
const APP_ID        = 'd8665ade-15a3-47e4-b54b-a8001e5c1b4c';
const LOGIN_TIMEOUT_MS = 12_000;

export interface DexcomShareSession {
  sessionId: string;
  expiresAt: number;
  region:    'US' | 'EU';
}

export interface DexcomShareReading {
  value:     number;
  timestamp: number;
  trend?:    string;
}

// ── Persistencia ──────────────────────────────────────────────────────────────

async function saveSession(session: DexcomShareSession) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function loadSession(): Promise<DexcomShareSession | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearDexcomShareSession() {
  await persistStorage.removeItem(STORAGE_KEY);
}

export async function isDexcomShareConnected(): Promise<boolean> {
  const session = await loadSession();
  return !!session && Date.now() < session.expiresAt;
}

// ── Login — intenta US primero, luego EU ──────────────────────────────────────

type AttemptResult =
  | { sessionId: string; error?: never }
  | { sessionId?: never; error: 'credentials' | 'network' | 'server' };

async function attemptLogin(
  base: string,
  username: string,
  password: string,
): Promise<AttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const res = await proxyFetch(
      `${base}/General/AuthenticatePublisherAccount`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName:   username.trim(),
          password,
          applicationId: APP_ID,
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timer);

    // Dexcom Share devuelve 200 con body "BadCredentials" o "AccountNotFound"
    // cuando las credenciales son incorrectas (no siempre usa 401).
    if (res.status === 401 || res.status === 400) return { error: 'credentials' };
    if (res.status >= 500) return { error: 'server' };
    if (!res.ok)           return { error: 'credentials' };

    const text = await res.text();
    // La API puede devolver el sessionId como JSON string con comillas
    const trimmed = text.replace(/"/g, '').trim();

    // Detectar respuestas de error conocidas de Dexcom Share
    const knownErrors = ['BadCredentials', 'AccountNotFound', 'AccountLockout', 'AccountPasswordChangeRequired'];
    if (knownErrors.some(e => trimmed.includes(e)) || trimmed.length < 10) {
      console.error('[DexcomShare] Login rejected by server:', trimmed);
      return { error: 'credentials' };
    }

    return { sessionId: trimmed };
  } catch (e: any) {
    clearTimeout(timer);
    // AbortError = timeout. Resto = error de red (sin conexión, DNS, etc.)
    console.error('[DexcomShare] Network error on', base, e?.name, e?.message);
    return { error: 'network' };
  }
}

export async function loginDexcomShare(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string; errorCode?: 'credentials' | 'network' | 'server' | 'rate_limit' | 'validation' }> {
  // Dexcom Share uses usernames (not necessarily emails), so only validate password
  if (!username || username.trim().length < 3) {
    return { ok: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.', errorCode: 'validation' };
  }
  const validation = validatePassword(password);
  if (!validation.ok) return { ok: false, error: validation.error, errorCode: 'validation' };

  const rateCheck = checkRateLimit(RATE_KEY);
  if (!rateCheck.allowed) {
    const mins = Math.ceil((rateCheck.waitSeconds ?? 0) / 60);
    return { ok: false, error: `Demasiados intentos fallidos. Espera ${mins} minuto${mins !== 1 ? 's' : ''} antes de volver a intentarlo.`, errorCode: 'rate_limit' };
  }

  // Intentar US primero, luego EU (Dexcom usa regiones distintas)
  let result = await attemptLogin(SHARE_BASE_US, username, password);
  let region: 'US' | 'EU' = 'US';

  if (!result.sessionId) {
    const euResult = await attemptLogin(SHARE_BASE_EU, username, password);
    if (euResult.sessionId) {
      result = euResult;
      region = 'EU';
    } else {
      // Devolver el error más informativo de los dos intentos
      const errorCode =
        result.error === 'credentials' || euResult.error === 'credentials'
          ? 'credentials'
          : result.error === 'network' && euResult.error === 'network'
            ? 'network'
            : 'server';

      recordFailedAttempt(RATE_KEY);
      console.error(`[DexcomShare] Login failed — US: ${result.error}, EU: ${euResult.error} → errorCode: ${errorCode}`);

      const errorMessages: Record<typeof errorCode, string> = {
        credentials: '❌ Correo o contraseña incorrectos. Verifica tus datos en dexcom.com (no uses las credenciales de la app Dexcom G-series).',
        network:     '❌ Sin conexión. Comprueba tu Wi-Fi o datos y vuelve a intentarlo.',
        server:      '❌ No se pudo conectar con el servidor de Dexcom. Inténtalo de nuevo más tarde.',
      };

      return { ok: false, error: errorMessages[errorCode], errorCode };
    }
  }

  clearRateLimit(RATE_KEY);
  await saveSession({ sessionId: result.sessionId!, expiresAt: Date.now() + 3600 * 1000, region });
  return { ok: true };
}

// ── Datos CGM ─────────────────────────────────────────────────────────────────

export async function fetchDexcomShareReadings(
  minutes = 1440,
): Promise<DexcomShareReading[]> {
  const session = await loadSession();
  if (!session || Date.now() >= session.expiresAt) {
    await clearDexcomShareSession();
    return [];
  }

  const base = session.region === 'EU' ? SHARE_BASE_EU : SHARE_BASE_US;

  try {
    const params = new URLSearchParams({
      sessionId: session.sessionId,
      minutes:   minutes.toString(),
      maxCount:  '288',
    });

    const res = await proxyFetch(
      `${base}/Publisher/ReadPublisherLatestGlucoseValues?${params}`,
    );

    if (res.status === 500) {
      // sessionId expirado — Dexcom Share devuelve 500 en lugar de 401
      await clearDexcomShareSession();
      return [];
    }
    if (!res.ok) return [];

    const data = await res.json();
    return (Array.isArray(data) ? data : [])
      .map((r: any) => ({
        value:     r.Value,
        timestamp: parseShareTimestamp(r.WT),
        trend:     r.Trend,
      }))
      .filter((r: DexcomShareReading) => r.value > 0);
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseShareTimestamp(wtString: string): number {
  // Formato: "/Date(1234567890123)/"
  const match = wtString?.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
