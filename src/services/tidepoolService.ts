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

const RATE_KEY = 'tidepool_login';

/**
 * TIDEPOOL — API 100% oficial y abierta
 * Tidepool es una organización non-profit que agrega datos de:
 * Medtronic, OmniPod, Tandem, Dexcom, Libre, Animas, y más
 * Documentación oficial: https://developer.tidepool.org
 */

const STORAGE_KEY = 'tidepool_session';
const BASE_URL = 'https://api.tidepool.org';

interface TidepoolSession {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface TidepoolReading {
  sgv: number;
  timestamp: number;
  source: string;
}

export interface TidepoolInsulinDose {
  type: 'bolus' | 'basal';
  units: number;
  timestamp: number;
  duration?: number; // ms, para basales
}

// ── Session ───────────────────────────────────────────────────────────────────

async function saveSession(s: TidepoolSession) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

async function loadSession(): Promise<TidepoolSession | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearTidepoolSession() {
  await persistStorage.removeItem(STORAGE_KEY);
}

export async function isTidepoolConnected(): Promise<boolean> {
  const s = await loadSession();
  return !!s && Date.now() < s.expiresAt;
}

// ── Auth — Tidepool usa Basic Auth, no OAuth2 ─────────────────────────────────

export async function loginTidepool(
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
    const credentials = btoa(`${email.trim()}:${password}`);
    const res = await proxyFetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: 'Email o contraseña incorrectos' };
    }

    const token = res.headers.get('x-tidepool-session-token');
    const data = await res.json();

    if (!token || !data.userid) {
      recordFailedAttempt(RATE_KEY);
      return { ok: false, error: 'Respuesta inválida de Tidepool' };
    }

    clearRateLimit(RATE_KEY);
    await saveSession({
      token,
      userId: data.userid,
      expiresAt: Date.now() + (8 * 3600 * 1000),
    });
    return { ok: true };
  } catch (e) {
    if (isCorsOrNetworkError(e)) {
      return {
        ok: false,
        error: '❌ No se pudo conectar con Tidepool. Comprueba que tus credenciales son correctas y que la plataforma permite conexiones externas en la web.',
      };
    }
    return { ok: false, error: sanitizeError(e) };
  }
}

// ── Datos CGM ─────────────────────────────────────────────────────────────────

export async function fetchTidepoolReadings(): Promise<TidepoolReading[]> {
  const session = await loadSession();
  if (!session || Date.now() >= session.expiresAt) return [];

  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const params = new URLSearchParams({
      type: 'cbg,smbg',
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
    });

    const res = await proxyFetch(
      `${BASE_URL}/data/${session.userId}?${params}`,
      { headers: { 'x-tidepool-session-token': session.token } },
    );

    if (res.status === 401) { await clearTidepoolSession(); return []; }
    if (!res.ok) return [];

    const data: any[] = await res.json();

    return data
      .filter(r => r.value > 0)
      .map(r => ({
        sgv: Math.round(r.value * 18.01559), // mmol/L → mg/dL
        timestamp: new Date(r.time).getTime(),
        source: r.deviceId?.includes('Libre')
          ? 'Libre (Tidepool)'
          : r.deviceId?.includes('Medtronic') || r.deviceId?.includes('minimed')
          ? 'Medtronic (Tidepool)'
          : r.deviceId?.includes('Dexcom')
          ? 'Dexcom (Tidepool)'
          : 'CGM (Tidepool)',
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

// ── Datos de insulina ─────────────────────────────────────────────────────────

export async function fetchTidepoolInsulin(): Promise<TidepoolInsulinDose[]> {
  const session = await loadSession();
  if (!session || Date.now() >= session.expiresAt) return [];

  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const params = new URLSearchParams({
      type: 'bolus,basal',
      startDate: start.toISOString(),
      endDate: new Date().toISOString(),
    });

    const res = await proxyFetch(
      `${BASE_URL}/data/${session.userId}?${params}`,
      { headers: { 'x-tidepool-session-token': session.token } },
    );

    if (!res.ok) return [];

    const data: any[] = await res.json();

    return data.map(r => ({
      type: r.type === 'basal' ? 'basal' : 'bolus',
      units: r.normal ?? r.rate ?? 0,
      timestamp: new Date(r.time).getTime(),
      duration: r.duration,
    }));
  } catch {
    return [];
  }
}
