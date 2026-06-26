/**
 * proxyFetch — wrapper de fetch para servicios CGM.
 *
 * Estrategia de proxy (por prioridad):
 *  1. Nativo (iOS/Android): fetch directo, sin restricciones CORS.
 *  2. Web con EXPO_PUBLIC_CORS_PROXY_URL configurada:
 *       → proxy externo (p.ej. Cloudflare Worker propio o corsproxy.io).
 *       Úsalo cuando el hosting sea estático (Netlify, Vercel, GitHub Pages)
 *       y no haya servidor Node.js que ejecute /api/proxy.
 *  3. Web sin esa variable:
 *       → /api/proxy?url=... (Expo Router API Route, requiere servidor Node.js).
 *
 * ── Configuración para Netlify estático ──────────────────────────────────────
 * En Netlify Dashboard → Site settings → Environment variables, añade:
 *   EXPO_PUBLIC_CORS_PROXY_URL = https://corsproxy.io/?
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

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.location !== 'undefined'
  );
}

/**
 * Devuelve la URL de proxy adecuada para una URL externa.
 * Si EXPO_PUBLIC_CORS_PROXY_URL está definida, la antepone a la URL codificada.
 * Si no, usa el proxy local de Expo Router.
 */
export function toProxyUrl(externalUrl: string): string {
  if (ENV_PROXY) {
    // Proxy externo: base + URL destino codificada
    // Ejemplo corsproxy.io: https://corsproxy.io/?https%3A%2F%2Fapi.target.com
    return `${ENV_PROXY}${encodeURIComponent(externalUrl)}`;
  }
  // Proxy local Expo Router API Route (solo funciona con servidor Node.js)
  return `/api/proxy?url=${encodeURIComponent(externalUrl)}`;
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
