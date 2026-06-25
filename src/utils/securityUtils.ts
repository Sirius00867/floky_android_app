/**
 * SECURITY UTILITIES
 * Centraliza validación de inputs, sanitización de errores y rate limiting.
 */

// ── Sanitización y validación de URL ─────────────────────────────────────────

/**
 * Limpia una URL externa antes de cualquier petición HTTP:
 *  - Elimina espacios al inicio y al final
 *  - Añade automáticamente "https://" si el usuario omitió el protocolo
 *  - Elimina la barra final para evitar rutas duplicadas (e.g. /api/v1//entries)
 */
export function sanitizeExternalUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return url;
  // Si no tiene protocolo, añadir https://
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  // Eliminar barra final
  return url.replace(/\/+$/, '');
}

export function validateHttpsUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  try {
    const sanitized = sanitizeExternalUrl(raw);
    if (!sanitized) return { ok: false, error: 'URL inválida — ejemplo: https://minightscout.fly.dev' };
    const u = new URL(sanitized);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return { ok: false, error: 'URL inválida — ejemplo: https://minightscout.fly.dev' };
    }
    if (!u.hostname || u.hostname.length < 3) return { ok: false, error: 'Hostname inválido' };
    return { ok: true, url: sanitized };
  } catch {
    return { ok: false, error: 'URL inválida — ejemplo: https://minightscout.fly.dev' };
  }
}

/**
 * Detecta si un error de red es causado por CORS o bloqueo del navegador
 * (aplica solo en entorno web/PWA).
 */
export function isCorsOrNetworkError(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const msg = (e as Error).message ?? '';
  // Chrome: "Failed to fetch" / Firefox: "NetworkError when attempting to fetch resource."
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('fetch') && msg.includes('network') ||
    (e as Error).name === 'TypeError'
  );
}

// ── Validación de credenciales ────────────────────────────────────────────────

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (!password || password.length < 1) return { ok: false, error: 'Contraseña vacía' };
  if (password.length > 256) return { ok: false, error: 'Contraseña demasiado larga' };
  // Rechaza caracteres de control (NUL, etc.)
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(password)) {
    return { ok: false, error: 'Contraseña contiene caracteres inválidos' };
  }
  return { ok: true };
}

export function validateCredentials(
  email: string,
  password: string,
): { ok: boolean; error?: string } {
  if (!validateEmail(email)) return { ok: false, error: 'Email inválido' };
  return validatePassword(password);
}

// ── Sanitización de errores ────────────────────────────────────────────────────
// Nunca expone el cuerpo de respuestas API (puede contener datos médicos)

export function sanitizeError(e: unknown): string {
  if (typeof e === 'string') return e.slice(0, 100);
  if (e instanceof Error) {
    // No exponer stack ni mensajes con datos de red
    const msg = e.message ?? '';
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('NetworkError')) {
      return 'Sin conexión o servidor no disponible';
    }
    return msg.slice(0, 100);
  }
  return 'Error desconocido';
}

// ── Rate limiting — exponential backoff ──────────────────────────────────────

const ATTEMPT_MAP = new Map<string, { count: number; lockedUntil: number }>();

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export function checkRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const entry = ATTEMPT_MAP.get(key);

  if (!entry) return { allowed: true };
  if (entry.lockedUntil > now) {
    return { allowed: false, waitSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const entry = ATTEMPT_MAP.get(key) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCK_MINUTES * 60 * 1000;
    entry.count = 0; // reset para el próximo ciclo
  }

  ATTEMPT_MAP.set(key, entry);
}

export function clearRateLimit(key: string): void {
  ATTEMPT_MAP.delete(key);
}

// ── Backoff delay entre intentos (segundos) ───────────────────────────────────

export function backoffDelay(attempt: number): number {
  return Math.min(Math.pow(2, attempt) * 1000, 30_000); // máx 30 s
}
