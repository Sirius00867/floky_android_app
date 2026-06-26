/**
 * proxyFetch — reemplaza `fetch` en los servicios CGM.
 *
 * En web (PWA): redirige la petición por el proxy inverso nativo de Expo Router
 * (src/app/api/proxy+api.ts), evitando CORS completamente.
 * En nativo (iOS/Android): llama a fetch directamente (sin CORS).
 *
 * Uso: proxyFetch('https://api-eu.libreview.io/llu/auth/login', { method: 'POST', ... })
 *      → en web  → GET/POST /api/proxy?url=https%3A%2F%2Fapi-eu.libreview.io%2Fllu%2Fauth%2Flogin
 *      → nativo  → fetch directo
 */

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.location !== 'undefined'
  );
}

/**
 * Construye la URL del proxy local para una URL externa.
 * El proxy en /api/proxy reenvía la petición desde el servidor (sin CORS).
 */
export function toProxyUrl(externalUrl: string): string {
  return `/api/proxy?url=${encodeURIComponent(externalUrl)}`;
}

export async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isBrowser()) {
    // Nativo o SSR: conexión directa sin restricciones CORS
    return fetch(url, init);
  }

  // En web: enrutar por el proxy Expo Router
  return fetch(toProxyUrl(url), init);
}
