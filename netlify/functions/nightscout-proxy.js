/**
 * nightscout-proxy — proxy dinámico para servidores Nightscout en PWA/Netlify.
 *
 * Problema: Netlify _redirects es estático; cada usuario tiene una URL Nightscout
 * diferente. Solución: esta función lee el servidor destino del header
 * X-Nightscout-Target y lo proxifica en tiempo real, evitando CORS.
 *
 * Seguridad SSRF básica: solo se permiten URLs https:// con hostname público.
 */

'use strict';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
  'x-nightscout-target', // nuestro header interno — nunca reenviar
  'host',                // Netlify lo reconstruye con el host destino
]);

function isSafeTargetUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    // Bloquear localhost y rangos privados (protección SSRF básica)
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return false;
    if (/^10\./.test(h)) return false;
    if (/^192\.168\./.test(h)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
    if (/^169\.254\./.test(h)) return false; // link-local
    return h.includes('.'); // debe tener al menos un punto (no solo 'nightscout')
  } catch {
    return false;
  }
}

exports.handler = async function (event) {
  // Soporta preflight CORS (por si la PWA hace requests cross-origin en dev)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, api-secret, Authorization, X-Nightscout-Target',
      },
      body: '',
    };
  }

  const targetBase = (event.headers || {})['x-nightscout-target'];
  if (!targetBase) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing X-Nightscout-Target header' }) };
  }
  if (!isSafeTargetUrl(targetBase)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid or unsafe Nightscout URL' }) };
  }

  // Extraer la ruta real: /api/nightscout/api/v1/entries.json → /api/v1/entries.json
  const apiPath = (event.path || '').replace(/^\/api\/nightscout/, '') || '/';
  const rawQuery = event.rawQuery || '';
  const fullUrl = `${new URL(targetBase).origin}${apiPath}${rawQuery ? '?' + rawQuery : ''}`;

  // Filtrar headers hop-by-hop antes de reenviar
  const forwardHeaders = {};
  for (const [key, value] of Object.entries(event.headers || {})) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }

  try {
    const response = await fetch(fullUrl, {
      method: event.httpMethod,
      headers: forwardHeaders,
      body: ['GET', 'HEAD'].includes(event.httpMethod) ? undefined : (event.body || undefined),
    });

    const body = await response.text();

    // Construir headers de respuesta sin hop-by-hop
    const responseHeaders = { 'Access-Control-Allow-Origin': '*' };
    response.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    return { statusCode: response.status, headers: responseHeaders, body };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Proxy error', message: err.message }),
    };
  }
};
