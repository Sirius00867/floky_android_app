/**
 * proxyFetch — wrapper de fetch para servicios CGM.
 *
 * Estrategia de proxy (por prioridad):
 *  1. Nativo (iOS/Android): fetch directo, sin restricciones CORS.
 *  2. Web con EXPO_PUBLIC_CORS_PROXY_URL configurada:
 *       → proxy externo (p.ej. Cloudflare Worker propio o corsproxy.io).
 *       Úsalo cuando el hosting sea estático (Netlify, Vercel, GitHub Pages)
 *       y no haya servidor Node.js que ejecute /api/proxy.
 *  3. Web sin esa variable y con servidor Node.js disponible:
 *       → /api/proxy?url=... (Expo Router API Route).
 *  4. Web sin proxy y sin servidor (Netlify estático sin la variable):
 *       → fallback a corsproxy.io para evitar bloqueo CORS total.
 *
 * ── Configuración para Netlify estático ──────────────────────────────────────
 * En netlify.toml [build.environment]:
 *   EXPO_PUBLIC_CORS_PROXY_URL = "https://corsproxy.io/?"
 *
 * ⚠ AVISO DE SEGURIDAD: corsproxy.io es un proxy público compartido.
 *   Las credenciales de los servicios CGM (Nightscout secret, contraseñas de
 *   LibreLink / Dexcom / Tidepool) viajan a través de ese servidor.
 *   Para producción con datos reales usa tu propio Cloudflare Worker:
 *   https://developers.cloudflare.com/workers/
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Resuelto en tiempo de compilación (Expo inyecta EXPO_PUBLIC_* en el bundle)
const ENV_PROXY: string = (process.env.EXPO_PUBLIC_CORS_PROXY_URL ?? '').trim();

// Proxy de emergencia si la variable no está definida en el build web estático
const FALLBACK_PROXY = 'https://corsproxy.io/?';

export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.location !== 'undefined'
  );
}

/**
 * Detecta si hay un servidor Node.js disponible para /api/proxy.
 * En Netlify estático o GitHub Pages no hay servidor → false.
 */
function hasLocalProxyServer(): boolean {
  if (!isBrowser()) return false;
  // Expo Router API Routes solo existen en modo desarrollo con Metro o en
  // despliegues Node.js (ej: Railway, Render). En Netlify estático no.
  // Asumimos que localhost sí tiene servidor, producción estática no.
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );
}

/**
 * Devuelve la URL de proxy adecuada para una URL externa.
 */
export function toProxyUrl(externalUrl: string): string {
  if (ENV_PROXY) {
    return `${ENV_PROXY}${encodeURIComponent(externalUrl)}`;
  }
  if (hasLocalProxyServer()) {
    return `/api/proxy?url=${encodeURIComponent(externalUrl)}`;
  }
  // Producción web estática sin variable configurada → fallback de emergencia
  console.warn('[proxyFetch] EXPO_PUBLIC_CORS_PROXY_URL no definida en el build. Usando corsproxy.io como fallback.');
  return `${FALLBACK_PROXY}${encodeURIComponent(externalUrl)}`;
}

export async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isBrowser()) {
    // Nativo (iOS/Android) o SSR: sin restricciones CORS
    return fetch(url, init);
  }
  // Web: enrutar por el proxy configurado
  return fetch(toProxyUrl(url), init);
}
