/**
 * flokyGateway.ts — Pasarela cliente hacia el ecosistema CGM
 *
 * Equivalente funcional de:  GET /api/v1/floky-status
 *
 * En esta arquitectura React Native offline-first no existe un servidor Express
 * intermedio — el "endpoint" es esta función async que:
 *   1. Paraleliza las 3 llamadas al API de Nightscout
 *   2. Pasa el bundle resultante por parseNightscoutToFloky()
 *   3. Devuelve exclusivamente FlokyJson (nunca el JSON crudo)
 *
 * Si en el futuro se migra a un BFF (Backend For Frontend), este archivo
 * se convierte en un simple fetch a `${BFF_URL}/api/v1/floky-status`
 * sin tocar el parser ni los tipos.
 *
 * Contrato de uso:
 * ```ts
 * const result = await fetchFlokyStatus(url, apiSecret);
 * if ('code' in result) {
 *   console.error(result.message); // FlokyGatewayError
 * } else {
 *   dispatch(setFlokySnapshot(result)); // FlokyJson ✓
 * }
 * ```
 */

import {
  fetchNightscoutEntries,
  fetchNightscoutTreatments,
  fetchNightscoutDeviceStatus,
} from '@/services/nightscoutService';
import { validateHttpsUrl } from '@/utils/securityUtils';
import { parseNightscoutToFloky } from '@/services/flokyParser';
import type {
  FlokyJson,
  FlokyGatewayError,
  NightscoutBundle,
  RawNightscoutTreatment,
} from '@/types/flokyData';

// ─────────────────────────────────────────────────────────────────────────────
// TIPO DE RESULTADO — discriminated union para manejo seguro en el caller
// ─────────────────────────────────────────────────────────────────────────────

export type FlokyResult = FlokyJson | FlokyGatewayError;

/** Type guard: diferencia el éxito del error */
export function isFlokyError(r: FlokyResult): r is FlokyGatewayError {
  return 'code' in r && 'message' in r;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────────────────────────

function gatewayError(
  code: FlokyGatewayError['code'],
  message: string,
): FlokyGatewayError {
  return { code, message };
}

/**
 * Timeout wrapper para cualquier Promise.
 * Nightscout puede tardar mucho si el servidor está dormido (Heroku free tier, etc.)
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — fetchFlokyStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Consulta Nightscout, procesa los datos crudos y devuelve FlokyJson.
 *
 * Equivale a:  GET /api/v1/floky-status?source=nightscout
 *
 * Timeout por llamada: 10 segundos.
 * Si una llamada falla, el bundle continúa con null en ese campo
 * (degradación segura — el parser siempre retorna un objeto válido).
 *
 * @param url        URL base de Nightscout (https://…)
 * @param apiSecret  API Secret en texto plano (se hashea en nightscoutService)
 * @returns FlokyJson en éxito | FlokyGatewayError en fallo no recuperable
 */
export async function fetchFlokyStatus(
  url: string,
  apiSecret: string,
): Promise<FlokyResult> {

  // ── Validación de URL ──────────────────────────────────────────────────────
  const urlCheck = validateHttpsUrl(url);
  if (!urlCheck.ok) {
    return gatewayError('INVALID_URL', 'La URL de Nightscout no es válida. Compruébala en Ajustes.');
  }

  const cleanUrl = urlCheck.url.replace(/\/$/, '');
  const secret   = apiSecret.trim();

  if (!secret) {
    return gatewayError('AUTH_FAILED', 'Falta la API Secret de Nightscout.');
  }

  // ── Llamadas paralelas al API ──────────────────────────────────────────────
  // Timeout de 10s por llamada para no bloquear la UI
  const TIMEOUT_MS = 10_000;

  let entries:      Awaited<ReturnType<typeof fetchNightscoutEntries>>      = [];
  let treatments:   Awaited<ReturnType<typeof fetchNightscoutTreatments>>   = [];
  let deviceStatus: Awaited<ReturnType<typeof fetchNightscoutDeviceStatus>> = {};

  try {
    [entries, treatments, deviceStatus] = await Promise.all([
      // 2 entradas: actual + anterior (para calcular delta)
      withTimeout(fetchNightscoutEntries(cleanUrl, secret, 2), TIMEOUT_MS)
        .catch(() => [] as typeof entries),

      // Tratamientos de las últimas 3 horas (12 eventos es más que suficiente)
      withTimeout(fetchNightscoutTreatments(cleanUrl, secret, 12), TIMEOUT_MS)
        .catch(() => [] as typeof treatments),

      // Estado del dispositivo / loop (IOB, COB, predicciones)
      withTimeout(fetchNightscoutDeviceStatus(cleanUrl, secret), TIMEOUT_MS)
        .catch(() => ({}) as typeof deviceStatus),
    ]);
  } catch (e) {
    // Fallo de red global (sin conexión a internet, DNS, etc.)
    return gatewayError(
      'NETWORK_ERROR',
      'No se pudo conectar con Nightscout. Comprueba tu conexión a internet.',
    );
  }

  // ── Verificar que hay al menos una lectura de glucosa ─────────────────────
  if (entries.length === 0) {
    return gatewayError(
      'NO_DATA',
      'Nightscout no devolvió lecturas de glucosa recientes.',
    );
  }

  // ── Ensamblar el bundle ────────────────────────────────────────────────────
  const bundle: NightscoutBundle = {
    entry:        entries[0] ?? null,
    prevEntry:    entries[1] ?? null,
    // Los treatments de nightscoutService.ts usan NightscoutTreatment (tipo básico).
    // El cast es seguro: RawNightscoutTreatment es un superconjunto con campos opcionales.
    treatments:   treatments as unknown as RawNightscoutTreatment[],
    deviceStatus: Object.keys(deviceStatus).length > 0 ? deviceStatus : null,
  };

  // ── Parsear y retornar ─────────────────────────────────────────────────────
  try {
    const floky = parseNightscoutToFloky(bundle);
    return floky;
  } catch {
    return gatewayError(
      'PARSE_ERROR',
      'Error al procesar los datos de Nightscout. Inténtalo de nuevo.',
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUENTES FUTURAS — placeholder para AAPS directo y otros sources
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Versión multi-fuente (placeholder — Fase 3).
 *
 * Cuando se integren más fuentes (AAPS socket, LibreView API v2, etc.),
 * este método actuará como dispatcher que selecciona el source activo.
 * La salida siempre será FlokyJson independientemente de la fuente.
 *
 * @param sources Mapa de fuentes disponibles con sus credenciales
 */
export async function fetchFlokyStatusMultiSource(sources: {
  nightscout?: { url: string; apiSecret: string };
  // libre?: { token: string };    // Fase 3
  // dexcom?: { accessToken: string }; // Fase 3
}): Promise<FlokyResult> {
  // Por ahora, delega a Nightscout si está configurado
  if (sources.nightscout?.url && sources.nightscout?.apiSecret) {
    return fetchFlokyStatus(sources.nightscout.url, sources.nightscout.apiSecret);
  }
  return gatewayError('NO_DATA', 'No hay fuentes CGM configuradas.');
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTACIÓN DEL CONTRATO REST (referencia para futura migración a BFF)
// ─────────────────────────────────────────────────────────────────────────────
//
//  GET /api/v1/floky-status
//  Authorization: Bearer <jwt>  (Fase 3 — actualmente sin auth de BFF)
//  Query params:
//    source=nightscout | libre | dexcom  (default: nightscout)
//
//  Response 200 — FlokyJson:
//  {
//    "t":      "2024-01-15T10:30:00.000Z",
//    "at":     1705312200000,
//    "bg":     112,
//    "trend":  "flat",
//    "status": "ok",
//    "iob":    1.2,
//    "cob":    15,
//    "ins":    3.5,
//    "carb":   45,
//    "p30":    118,
//    "p60":    125,
//    "ui":     { "stress": 0, "avatar": "calm" }
//  }
//
//  Response 422 — FlokyGatewayError:
//  { "code": "NO_DATA", "message": "..." }
//
//  Response 401 — FlokyGatewayError:
//  { "code": "AUTH_FAILED", "message": "..." }
