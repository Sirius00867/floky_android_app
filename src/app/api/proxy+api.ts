/**
 * PROXY INVERSO — Expo Router API Route
 *
 * Flujo: PWA (browser) → GET/POST /api/proxy?url=<target> → servidor externo
 *
 * Al ejecutarse en el servidor (Node.js), no tiene restricciones CORS.
 * El proxy añade Access-Control-Allow-Origin: * a la respuesta para que
 * el browser acepte los datos sin bloqueo.
 *
 * Seguridad:
 *  - Protección SSRF: bloquea IPs privadas y localhost
 *  - Solo permite http:// y https://
 *  - Headers hop-by-hop eliminados antes de reenviar
 *  - Credenciales viajan cifradas (HTTPS) y nunca se loguean
 */
import { gunzipSync, brotliDecompressSync, inflateSync } from 'zlib';

// ── SSRF: rangos de IP privados / internos ─────────────────────────────────
const PRIVATE_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^169\.254\./,           // link-local
  /^::1$/,                  // IPv6 loopback
  /^fc00:/i,               // IPv6 ULA
  /^fd[0-9a-f]{2}:/i,     // IPv6 ULA
  /^0\.0\.0\.0$/,
];

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === 'localhost' || PRIVATE_PATTERNS.some(re => re.test(h));
}

// ── Headers que NO deben reenviarse (hop-by-hop RFC 7230) ──────────────────
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 'te',
  'trailer', 'upgrade', 'proxy-authorization', 'proxy-authenticate',
]);

// Node.js fetch descomprime automáticamente gzip/brotli/deflate.
// Si reenviamos Content-Encoding al browser, éste intentaría descomprimir
// datos que ya están descomprimidos → ERR_CONTENT_DECODING_FAILED.
const STRIP_FROM_UPSTREAM = new Set([
  'content-encoding', 'transfer-encoding', 'content-length',
]);

// ── CORS headers añadidos a todas las respuestas ───────────────────────────
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  // Exponer headers de respuesta que los servicios necesitan leer en el cliente
  'Access-Control-Expose-Headers': [
    'x-tidepool-session-token',
    'api-secret',
    'content-type',
    'content-length',
  ].join(', '),
};

// ── Helpers ────────────────────────────────────────────────────────────────

function corsResponse(body: BodyInit | null, status: number, extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...CORS, ...extra } });
}

function jsonError(message: string, status: number): Response {
  return corsResponse(JSON.stringify({ error: message }), status, {
    'Content-Type': 'application/json',
  });
}

// ── Handlers Expo Router API Route ─────────────────────────────────────────

export async function OPTIONS(_req: Request): Promise<Response> {
  return corsResponse(null, 204);
}

export async function GET(request: Request): Promise<Response> {
  return proxyRequest(request, 'GET');
}

export async function POST(request: Request): Promise<Response> {
  return proxyRequest(request, 'POST');
}

export async function PUT(request: Request): Promise<Response> {
  return proxyRequest(request, 'PUT');
}

export async function DELETE(request: Request): Promise<Response> {
  return proxyRequest(request, 'DELETE');
}

// ── Core proxy logic ───────────────────────────────────────────────────────

async function proxyRequest(request: Request, method: string): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return jsonError('Parámetro ?url= requerido', 400);
  }

  // Validar URL destino
  let parsed: URL;
  try {
    parsed = new URL(decodeURIComponent(targetUrl));
  } catch {
    return jsonError('URL de destino inválida', 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return jsonError('Solo se permiten protocolos http y https', 403);
  }

  // Protección SSRF
  if (isPrivateHost(parsed.hostname)) {
    return jsonError('Acceso a hosts internos denegado', 403);
  }

  // Construir headers a reenviar — eliminar hop-by-hop y el host original
  const forwardHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'host' && !HOP_BY_HOP.has(lower)) {
      forwardHeaders[key] = value;
    }
  });

  // Pedir respuesta sin comprimir — Node.js maneja compression automáticamente
  // pero queremos evitar el doble-decode cuando el body se reenvía al browser.
  forwardHeaders['accept-encoding'] = 'identity';

  const upstreamInit: RequestInit = {
    method,
    headers: forwardHeaders,
    redirect: 'follow',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      upstreamInit.body = await request.arrayBuffer();
    } catch {
      // Body vacío — válido para algunos POST sin body
    }
  }

  // Petición al servidor externo (sin restricciones CORS en servidor)
  try {
    const upstream = await fetch(parsed.href, upstreamInit);
    const rawBuffer = Buffer.from(await upstream.arrayBuffer());

    // Node.js fetch (undici) no descomprime automáticamente — hacerlo aquí
    // para que el browser reciba siempre contenido sin comprimir.
    const encoding = (upstream.headers.get('content-encoding') ?? '').toLowerCase();
    let body: Buffer;
    try {
      if (encoding.includes('gzip') || encoding.includes('deflate')) {
        body = gunzipSync(rawBuffer);
      } else if (encoding.includes('br')) {
        body = brotliDecompressSync(rawBuffer);
      } else if (encoding.includes('zstd')) {
        body = inflateSync(rawBuffer);
      } else {
        body = rawBuffer;
      }
    } catch {
      // Si la descompresión falla, reenviar como está
      body = rawBuffer;
    }

    // Construir headers de respuesta: CORS + lo que devuelve el servidor externo
    // Siempre omitir content-encoding (ya descomprimido arriba)
    const responseHeaders: Record<string, string> = { ...CORS };
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!lower.startsWith('access-control-') && !HOP_BY_HOP.has(lower) && !STRIP_FROM_UPSTREAM.has(lower)) {
        responseHeaders[key] = value;
      }
    });

    return new Response(body.buffer as ArrayBuffer, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error desconocido';
    return jsonError(`Upstream fetch falló: ${message}`, 502);
  }
}
