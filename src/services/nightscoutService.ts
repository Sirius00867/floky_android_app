import { persistStorage } from '@/store/storage';
import * as ExpoCrypto from 'expo-crypto';
import { validateHttpsUrl, sanitizeExternalUrl, isCorsOrNetworkError, sanitizeError } from '@/utils/securityUtils';

const STORAGE_KEY = 'nightscout_config';

export interface NightscoutConfig {
  url: string;
  apiSecret: string;
}

export interface NightscoutEntry {
  sgv: number;
  date: number;        // epoch ms
  dateString: string;
  direction?: string;  // 'Flat' | 'FortyFiveUp' | 'SingleUp' | 'DoubleUp' | etc.
  device?: string;
  type?: string;
}

export interface NightscoutTreatment {
  _id: string;
  eventType: string;
  insulin?: number;
  carbs?: number;
  created_at: string;
  notes?: string;
}

export type LoopMode = 'Closed' | 'Open' | 'LGS' | 'Suspended' | 'Unknown';

export interface NightscoutDeviceStatus {
  // Insulina / carbohidratos
  iob?: number;
  cob?: number;
  // Bomba
  reservoir?: number;
  pumpBattery?: number;
  uploaderBattery?: number;
  sensorAge?: number;
  // Loop
  loopMode?: LoopMode;
  lastLoopAgo?: number;       // minutos desde el último ciclo exitoso
  loopReason?: string;        // razón del último enacted/suggested
  // Basal temporal
  tempBasalRate?: number;     // U/h absoluta
  tempBasalPct?: number;      // % sobre basal programada
  tempBasalMins?: number;     // minutos restantes
  // Predicciones
  eventualBG?: number;        // mg/dL predicho eventual
  minPredBG?: number;
  maxPredBG?: number;
  // SMB / últimos bolos
  lastSMB?: number;           // U
  lastSMBAgo?: number;        // minutos
}

// ── SHA-1 — funciona en React Native (expo-crypto) y web (crypto.subtle) ──────

async function sha1hex(text: string): Promise<string> {
  // En web (navegador), usar crypto.subtle
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // En React Native, usar expo-crypto
  const hash = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    text,
    { encoding: ExpoCrypto.CryptoEncoding.HEX },
  );
  return hash.toLowerCase();
}

// ── Persistencia ──────────────────────────────────────────────────────────────

export async function saveNightscoutConfig(config: NightscoutConfig) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function loadNightscoutConfig(): Promise<NightscoutConfig | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearNightscoutConfig() {
  await persistStorage.removeItem(STORAGE_KEY);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanUrl(url: string) {
  return sanitizeExternalUrl(url);
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

/**
 * Wrapper de fetch específico para Nightscout.
 *
 * En web (PWA/Netlify): la petición va a /api/nightscout<path> y Netlify la
 * redirige a la Netlify Function nightscout-proxy.js, que lee el servidor real
 * del header X-Nightscout-Target. De este modo la URL del usuario nunca se
 * hardcodea en _redirects y funciona para cualquier servidor Nightscout.
 *
 * En nativo (iOS/Android): llama directamente al servidor sin CORS.
 */
function nsProxyFetch(
  nsUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const cleanedBase = cleanUrl(nsUrl);
  if (isBrowser()) {
    const headers = new Headers(init.headers as HeadersInit | undefined);
    headers.set('X-Nightscout-Target', cleanedBase);
    return fetch(`/api/nightscout${path}`, { ...init, headers });
  }
  return fetch(`${cleanedBase}${path}`, init);
}

async function buildHeaders(apiSecret: string): Promise<Record<string, string>> {
  const hashed = await sha1hex(apiSecret);
  return {
    'Content-Type': 'application/json',
    'api-secret': hashed,
  };
}

function todayMidnightIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function testNightscoutConnection(
  url: string,
  apiSecret: string,
): Promise<{ ok: boolean; siteName?: string; error?: string; errorCode?: 'cors' | 'network' | 'auth' | 'server' | 'url' }> {
  // Sanitizar URL automáticamente (añade https://, elimina espacios y barra final)
  const urlCheck = validateHttpsUrl(url);
  if (!urlCheck.ok) return { ok: false, error: urlCheck.error, errorCode: 'url' };

  const base = cleanUrl(urlCheck.url);
  const secretTrimmed = apiSecret.trim();

  try {
    // 1. Ping sin auth para detectar errores de red/URL antes del SHA-1
    let pingRes: Response | null = null;
    try {
      pingRes = await nsProxyFetch(base, '/api/v1/status.json');
    } catch (pingErr) {
      if (isCorsOrNetworkError(pingErr)) {
        return {
          ok: false,
          errorCode: 'cors',
          error: '❌ Error de conexión. Asegúrate de que el servidor Nightscout tiene los permisos CORS habilitados o comprueba la URL introducida.',
        };
      }
      return { ok: false, errorCode: 'network', error: 'No se puede conectar al servidor. Comprueba la URL.' };
    }

    if (!pingRes) {
      return { ok: false, errorCode: 'network', error: 'No se puede conectar al servidor. Comprueba la URL.' };
    }

    // 2. Comprobar con autenticación SHA-1
    const sha1hash = await sha1hex(secretTrimmed);
    const headers = {
      'Content-Type': 'application/json',
      'api-secret': sha1hash,
    };

    let res: Response;
    try {
      res = await nsProxyFetch(base, '/api/v1/status.json', { headers });
    } catch (authErr) {
      if (isCorsOrNetworkError(authErr)) {
        return {
          ok: false,
          errorCode: 'cors',
          error: '❌ Error de conexión. Asegúrate de que el servidor Nightscout tiene los permisos CORS habilitados o comprueba la URL introducida.',
        };
      }
      return { ok: false, errorCode: 'network', error: sanitizeError(authErr) };
    }

    if (res.status === 401) {
      const hasSpace = secretTrimmed !== secretTrimmed.replace(/\s/g, '');
      const debugMsg = hasSpace
        ? 'La API Secret contiene espacios. Cópiala sin espacios.'
        : `API Secret: ${secretTrimmed.length} caracteres. Cómprala exactamente igual en tu Nightscout (mayúsculas y caracteres especiales incluidos).`;
      return { ok: false, errorCode: 'auth', error: `Contraseña rechazada (401). ${debugMsg}` };
    }
    if (res.status === 403) {
      return { ok: false, errorCode: 'auth', error: 'Acceso denegado (403). La API Secret no tiene permisos.' };
    }
    if (!res.ok) {
      return { ok: false, errorCode: 'server', error: `Error del servidor (${res.status})` };
    }

    const data = await res.json();
    return { ok: true, siteName: data.settings?.customTitle ?? data.name ?? 'Nightscout' };
  } catch (e) {
    if (isCorsOrNetworkError(e)) {
      return {
        ok: false,
        errorCode: 'cors',
        error: '❌ Error de conexión. Asegúrate de que el servidor Nightscout tiene los permisos CORS habilitados o comprueba la URL introducida.',
      };
    }
    return { ok: false, errorCode: 'network', error: sanitizeError(e) };
  }
}

export async function fetchNightscoutEntries(
  url: string,
  apiSecret: string,
  count = 288,
): Promise<NightscoutEntry[]> {
  if (!validateHttpsUrl(url).ok) return [];
  try {
    const headers = await buildHeaders(apiSecret);
    const params = new URLSearchParams({
      count: count.toString(),
      'find[dateString][$gte]': todayMidnightIso(),
    });
    const res = await nsProxyFetch(url, `/api/v1/entries.json?${params}`, { headers });
    if (!res.ok) return [];
    const data: NightscoutEntry[] = await res.json();
    return data.filter(e => e.sgv > 0);
  } catch {
    return [];
  }
}

export async function fetchNightscoutCurrent(
  url: string,
  apiSecret: string,
): Promise<NightscoutEntry | null> {
  try {
    const headers = await buildHeaders(apiSecret);
    const res = await nsProxyFetch(url, '/api/v1/entries/current.json', { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const entry: NightscoutEntry = Array.isArray(data) ? data[0] : data;
    return entry?.sgv > 0 ? entry : null;
  } catch {
    return null;
  }
}

export async function fetchNightscoutTreatments(
  url: string,
  apiSecret: string,
  count = 50,
): Promise<NightscoutTreatment[]> {
  try {
    const headers = await buildHeaders(apiSecret);
    const params = new URLSearchParams({
      count: count.toString(),
      'find[created_at][$gte]': todayMidnightIso(),
    });
    const res = await nsProxyFetch(url, `/api/v1/treatments.json?${params}`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchNightscoutDeviceStatus(
  url: string,
  apiSecret: string,
): Promise<NightscoutDeviceStatus> {
  try {
    const baseHeaders = await buildHeaders(apiSecret);
    const headers = {
      ...baseHeaders,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    };
    // _ts rompe cualquier caché a nivel CDN o proxy
    const res = await nsProxyFetch(
      url,
      `/api/v1/devicestatus.json?count=1&_ts=${Date.now()}`,
      { headers, cache: 'no-store' as RequestCache },
    );
    if (!res.ok) return {};
    const data = await res.json();
    const latest = Array.isArray(data) ? data[0] : data;
    if (!latest) return {};

    const aaps    = latest.AAPS ?? {};
    const openaps = latest.openaps ?? {};
    const loop    = latest.loop ?? {};          // Loop iOS
    const pump    = latest.pump ?? {};
    const enacted = openaps.enacted ?? openaps.suggested ?? {};

    // ── IOB / COB ────────────────────────────────────────────────────────────
    const iob: number | undefined =
      openaps.iob?.iob ?? loop.iob?.iob ?? aaps.iob ?? undefined;

    const cob: number | undefined =
      enacted.COB ?? loop.cob?.cob ?? aaps.cob ?? undefined;

    // ── Bomba ────────────────────────────────────────────────────────────────
    const reservoir: number | undefined =
      pump.reservoir ?? aaps.reservoir ?? enacted.reservoir ?? undefined;

    const pumpBattery: number | undefined =
      pump.battery?.percent ?? aaps.pumpBattery ?? undefined;

    const uploaderBattery: number | undefined =
      latest.uploader?.battery ?? undefined;

    // ── Modo loop ─────────────────────────────────────────────────────────────
    const rawMode: string =
      aaps.loop ?? loop.failureReason ?? '';
    const loopMode: LoopMode =
      rawMode === 'Closed'    ? 'Closed'
      : rawMode === 'Open'    ? 'Open'
      : rawMode === 'LGS'     ? 'LGS'
      : rawMode === 'Suspended' ? 'Suspended'
      : enacted.rate !== undefined ? 'Closed'  // si hay enacted, asumimos cerrado
      : 'Unknown';

    // Tiempo desde último ciclo exitoso
    const loopTs: string | undefined =
      enacted.timestamp ?? aaps.lastLoopTime ?? loop.timestamp;
    const lastLoopAgo = loopTs
      ? Math.round((Date.now() - new Date(loopTs).getTime()) / 60000)
      : undefined;

    // Razón del loop
    const loopReason: string | undefined =
      enacted.reason ?? openaps.suggested?.reason ?? aaps.reason ?? undefined;

    // ── Basal temporal ────────────────────────────────────────────────────────
    const tempBasalRate: number | undefined =
      aaps.tempBasal?.rate ??
      pump.extended?.TempBasalAbsoluteRate ??
      enacted.rate ??
      undefined;

    const tempBasalPct: number | undefined =
      aaps.tempBasal?.percent ?? undefined;

    const tempBasalMins: number | undefined =
      aaps.tempBasal?.duration ??
      pump.extended?.TempBasalRemaining ??
      enacted.duration ??
      undefined;

    // ── Predicciones ─────────────────────────────────────────────────────────
    const eventualBG: number | undefined =
      enacted.eventualBG ?? openaps.suggested?.eventualBG ?? aaps.eventualBG ?? undefined;

    const minPredBG: number | undefined =
      enacted.minPredBG ?? aaps.minPredBG ?? undefined;

    const maxPredBG: number | undefined =
      enacted.maxPredBG ?? aaps.maxPredBG ?? undefined;

    // ── Último SMB ────────────────────────────────────────────────────────────
    const lastSMB: number | undefined = aaps.lastBolusSMB ?? undefined;
    const lastSMBTs: string | undefined = aaps.lastBolusTime ?? undefined;
    const lastSMBAgo = lastSMBTs
      ? Math.round((Date.now() - new Date(lastSMBTs).getTime()) / 60000)
      : undefined;

    return {
      iob, cob, reservoir, pumpBattery, uploaderBattery,
      loopMode, lastLoopAgo, loopReason,
      tempBasalRate, tempBasalPct, tempBasalMins,
      eventualBG, minPredBG, maxPredBG,
      lastSMB, lastSMBAgo,
    };
  } catch {
    return {};
  }
}

// ── Helpers de dirección de tendencia ─────────────────────────────────────────

export function trendArrow(direction?: string): string {
  const MAP: Record<string, string> = {
    DoubleUp:        '⬆⬆',
    SingleUp:        '⬆',
    FortyFiveUp:     '↗',
    Flat:            '→',
    FortyFiveDown:   '↘',
    SingleDown:      '⬇',
    DoubleDown:      '⬇⬇',
    'NOT COMPUTABLE': '?',
    NONE:            '-',
  };
  return MAP[direction ?? ''] ?? '→';
}
