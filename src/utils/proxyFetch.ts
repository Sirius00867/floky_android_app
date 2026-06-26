/**
 * proxyFetch — reemplaza `fetch` en los servicios CGM.
 *
 * En web (PWA/Netlify): redirige la petición por el proxy inverso de Netlify
 * definido en public/_redirects, evitando CORS completamente.
 * En nativo (iOS/Android): llama a fetch directamente (sin CORS).
 *
 * Mapa de rutas (deben coincidir con public/_redirects):
 *   https://shareous1.dexcom.com/...  →  /api/dexcom/...       (Dexcom Share EU)
 *   https://share1.dexcom.com/...     →  /api/dexcom-us/...    (Dexcom Share US)
 *   https://api-eu.libreview.io/...   →  /api/librelink/...    (LibreLink EU)
 *   https://api.libreview.io/...      →  /api/librelink-us/... (LibreLink US)
 *   https://api.tidepool.org/...      →  /api/tidepool/...
 *   Nightscout (URL dinámica)         →  ver nightscoutService.ts (usa nsProxyFetch)
 */

type ProxyRule = [pattern: RegExp, proxyBase: string];

const PROXY_RULES: ProxyRule[] = [
  // Dexcom Share — EU y US en prefijos separados para evitar routing incorrecto
  [/^https:\/\/shareous1\.dexcom\.com/, '/api/dexcom'],
  [/^https:\/\/share1\.dexcom\.com/,    '/api/dexcom-us'],
  // FreeStyle LibreLink — EU y US
  [/^https:\/\/api-eu\.libreview\.io/,  '/api/librelink'],
  [/^https:\/\/api\.libreview\.io/,     '/api/librelink-us'],
  // Tidepool
  [/^https:\/\/api\.tidepool\.org/,     '/api/tidepool'],
];

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined' &&
    typeof window.location !== 'undefined'
  );
}

/**
 * Convierte una URL absoluta externa en una ruta relativa del proxy Netlify.
 * Devuelve null si la URL no está mapeada (p. ej. Nightscout con URL dinámica).
 */
export function toProxyPath(url: string): string | null {
  for (const [pattern, proxyBase] of PROXY_RULES) {
    if (pattern.test(url)) {
      return url.replace(pattern, proxyBase);
    }
  }
  return null;
}

export async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isBrowser()) {
    // Nativo o SSR: conexión directa sin restricciones CORS
    return fetch(url, init);
  }

  // En web: intentar enrutar por el proxy Netlify (_redirects 200!)
  const proxied = toProxyPath(url);
  if (proxied) {
    return fetch(proxied, init);
  }

  // URL no mapeada (p. ej. Nightscout dinámico):
  // el caller debe pasar ya la ruta proxy — ver nightscoutService.ts / nsProxyFetch
  return fetch(url, init);
}
