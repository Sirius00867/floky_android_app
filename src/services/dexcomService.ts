import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { persistStorage } from '@/store/storage';

const IS_SANDBOX = process.env.EXPO_PUBLIC_DEXCOM_SANDBOX === 'true';
const BASE_URL    = IS_SANDBOX ? 'https://sandbox-api.dexcom.com' : 'https://api.dexcom.com';
const CLIENT_ID   = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_DEXCOM_CLIENT_SECRET ?? '';
const REDIRECT_URI  = AuthSession.makeRedirectUri({ scheme: 'floky', path: 'auth' });

const STORAGE_KEY = 'dexcom_tokens';

interface DexcomTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
}

interface EGVRecord {
  systemTime: string;
  displayTime: string;
  value: number;        // mg/dL
  status: string | null;
  trend: string;
  trendRate: number | null;
}

// ── Token storage ─────────────────────────────────────────────────────────────

async function saveTokens(tokens: DexcomTokens) {
  await persistStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

async function loadTokens(): Promise<DexcomTokens | null> {
  const raw = await persistStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearDexcomTokens() {
  await persistStorage.removeItem(STORAGE_KEY);
}

// ── OAuth2 login ──────────────────────────────────────────────────────────────

export async function loginWithDexcom(): Promise<boolean> {
  const codeVerifier  = await generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const request = new AuthSession.AuthRequest({
    clientId:            CLIENT_ID,
    redirectUri:         REDIRECT_URI,
    scopes:              ['offline_access', 'egvs'],
    responseType:        AuthSession.ResponseType.Code,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    codeChallenge,
    extraParams: { prompt: 'login' },
  });

  const discovery = {
    authorizationEndpoint: `${BASE_URL}/v2/oauth2/login`,
    tokenEndpoint:         `${BASE_URL}/v2/oauth2/token`,
  };

  const result = await request.promptAsync(discovery);

  if (result.type !== 'success' || !result.params.code) return false;

  return exchangeCode(result.params.code, codeVerifier);
}

async function exchangeCode(code: string, codeVerifier: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  REDIRECT_URI,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code_verifier: codeVerifier,
    });

    const res = await fetch(`${BASE_URL}/v2/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) return false;

    const data = await res.json();
    await saveTokens({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    Date.now() + data.expires_in * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

async function getValidToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens) return null;

  // Refresh if expiring in less than 5 minutes
  if (Date.now() > tokens.expires_at - 300_000) {
    return refreshTokens(tokens.refresh_token);
  }
  return tokens.access_token;
}

async function refreshTokens(refresh_token: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri:  REDIRECT_URI,
    });

    const res = await fetch(`${BASE_URL}/v2/oauth2/token`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });

    if (!res.ok) { await clearDexcomTokens(); return null; }

    const data = await res.json();
    await saveTokens({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_at:    Date.now() + data.expires_in * 1000,
    });
    return data.access_token;
  } catch {
    return null;
  }
}

// ── Glucose data ──────────────────────────────────────────────────────────────

export async function isConnected(): Promise<boolean> {
  const tokens = await loadTokens();
  return tokens !== null;
}

export async function fetchTodayEGV(): Promise<EGVRecord[]> {
  const token = await getValidToken();
  if (!token) return [];

  const now   = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    startDate: start.toISOString().slice(0, 19),
    endDate:   now.toISOString().slice(0, 19),
  });

  try {
    const res = await fetch(`${BASE_URL}/v3/users/self/egvs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.records ?? []) as EGVRecord[];
  } catch {
    return [];
  }
}

export async function fetchLatestEGV(): Promise<EGVRecord | null> {
  const records = await fetchTodayEGV();
  return records.length > 0 ? records[records.length - 1] : null;
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

async function generateCodeVerifier(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
