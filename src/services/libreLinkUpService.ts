import { persistStorage } from '@/store/storage';

const STORAGE_KEY = 'librelink_tokens';
const BASE_URL = 'https://api.librelink.io';

export interface LibreLinkTokens {
  accessToken: string;
  expiresAt: number; // epoch ms
}

export interface LibreLinkReading {
  sgv: number;           // mg/dL
  timestamp: number;     // epoch ms
  trend?: string;        // 'UP' | 'DOWN' | 'FLAT' | etc.
}

// ── Token storage ─────────────────────────────────────────────────────────

async function saveTokens(tokens: LibreLinkTokens) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

async function loadTokens(): Promise<LibreLinkTokens | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearLibreLinkUpTokens() {
  await persistStorage.removeItem(STORAGE_KEY);
}

// ── Login ─────────────────────────────────────────────────────────────────

export async function loginLibreLinkUp(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/v2/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        platform: 'android',
      }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    if (!data.data?.authTicket?.token) return false;

    await saveTokens({
      accessToken: data.data.authTicket.token,
      expiresAt: Date.now() + (3600 * 1000), // 1 hora (LibreLink no devuelve expiry)
    });
    return true;
  } catch {
    return false;
  }
}

// ── Glucose data ──────────────────────────────────────────────────────────

export async function isLibreLinkConnected(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null;
}

async function getValidToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  // Refresh if expiring in less than 5 minutes
  if (Date.now() > tokens.expiresAt - 300_000) {
    // LibreLink no soporta refresh, así que devolvemos null y el usuario debe re-login
    await clearLibreLinkUpTokens();
    return null;
  }
  return tokens.accessToken;
}

export async function fetchLibreLinkUpReadings(): Promise<LibreLinkReading[]> {
  const token = await getValidToken();
  if (!token) return [];

  try {
    // Obtener lista de dispositivos
    const devRes = await fetch(`${BASE_URL}/v2/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!devRes.ok) return [];

    const devData = await devRes.json();
    const devices = devData.data ?? [];
    if (devices.length === 0) return [];

    // Obtener lecturas del primer dispositivo
    const deviceId = devices[0].id;
    const readRes = await fetch(
      `${BASE_URL}/v2/connections/${deviceId}/graph`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!readRes.ok) return [];

    const readData = await readRes.json();
    const measurements = readData.data?.connection?.glucoseMeasurement ?? [];

    return measurements
      .filter((m: any) => m.value > 0)
      .map((m: any) => ({
        sgv: m.value,
        timestamp: m.timestamp * 1000, // LibreLink envía en segundos
        trend: m.trend,
      }));
  } catch {
    return [];
  }
}

export async function fetchLibreLinkUpCurrent(): Promise<LibreLinkReading | null> {
  const readings = await fetchLibreLinkUpReadings();
  return readings.length > 0 ? readings[readings.length - 1] : null;
}

// ── Helpers ───────────────────────────────────────────────────────────────

export function trendSymbol(trend?: string): string {
  const MAP: Record<string, string> = {
    UP: '⬆',
    DOWN: '⬇',
    FLAT: '→',
    UNKNOWN: '?',
  };
  return MAP[trend ?? ''] ?? '→';
}
