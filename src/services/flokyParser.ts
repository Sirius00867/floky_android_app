/**
 * flokyParser.ts — Motor puro de transformación CGM → FlokyJson
 *
 * 100 % funciones puras: sin I/O, sin efectos secundarios, sin imports de React.
 * Cada función es unitariamente testeable de forma aislada.
 *
 * Flujo principal:
 *   NightscoutBundle  →  parseNightscoutToFloky()  →  FlokyJson
 */

import type {
  NightscoutBundle,
  RawNightscoutTreatment,
  FlokyJson,
  FlokyStatus,
  FlokyTrend,
  FlokyAvatarState,
  FlokyStressLevel,
  FlokyUiContext,
} from '@/types/flokyData';

import {
  BG_THRESHOLDS,
  DELTA_THRESHOLDS,
  IOB_RISK_THRESHOLD,
} from '@/types/flokyData';

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES DE REDONDEO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Redondea a 1 decimal.
 * Usado para: IOB, bolo de insulina, predicciones de precisión media.
 * Devuelve null si la entrada es null/undefined/NaN.
 */
export function round1(n: number | null | undefined): number | null {
  if (n == null || !isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/**
 * Redondea al entero más cercano.
 * Usado para: BG (mg/dL), carbohidratos (g), predicciones (mg/dL),
 * deltas, ISF, ratio IC.
 * Devuelve null si la entrada es null/undefined/NaN.
 */
export function roundInt(n: number | null | undefined): number | null {
  if (n == null || !isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Clampea un número entre un mínimo y un máximo (inclusive).
 * No lanza excepción — devuelve el límite más cercano si está fuera de rango.
 */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN DE ESTADO CLÍNICO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapea un valor de glucemia a uno de 4 estados clínicos discretos.
 *
 * Rangos:
 *   < 70            → 'low'       (hipoglucemia)
 *   70 – 180        → 'ok'        (rango objetivo)
 *   181 – 250       → 'high'      (hiperglucemia moderada)
 *   > 250           → 'critical'  (hiperglucemia severa)
 *
 * @returns null si bg es null/undefined/fuera de rango fisiológico (< 20 o > 600)
 */
export function normalizeStatus(bg: number | null | undefined): FlokyStatus | null {
  if (bg == null || !isFinite(bg)) return null;
  // Rango fisiológico plausible — valores fuera de esto son errores del sensor
  if (bg < 20 || bg > 600) return null;

  if (bg < BG_THRESHOLDS.LOW)           return 'low';
  if (bg < BG_THRESHOLDS.HIGH)          return 'ok';
  if (bg < BG_THRESHOLDS.CRITICAL_HIGH) return 'high';
  return 'critical';
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZACIÓN DE TENDENCIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapa de strings de dirección de Nightscout a FlokyTrend.
 * Incluye variantes de mayúsculas/minúsculas y formatos alternativos de AAPS.
 */
const DIRECTION_MAP: Record<string, FlokyTrend> = {
  // Strings estándar de Nightscout / xDrip
  DoubleUp:          'up2',
  DOUBLE_UP:         'up2',
  SingleUp:          'up1',
  SINGLE_UP:         'up1',
  FortyFiveUp:       'up0',
  FORTY_FIVE_UP:     'up0',
  Flat:              'flat',
  FLAT:              'flat',
  FortyFiveDown:     'down0',
  FORTY_FIVE_DOWN:   'down0',
  SingleDown:        'down1',
  SINGLE_DOWN:       'down1',
  DoubleDown:        'down2',
  DOUBLE_DOWN:       'down2',
  // Variantes de AAPS
  '↑↑':             'up2',
  '↑':              'up1',
  '↗':              'up0',
  '→':              'flat',
  '↘':              'down0',
  '↓':              'down1',
  '↓↓':             'down2',
  // No computable / sin datos
  'NOT COMPUTABLE':  'unknown',
  NONE:              'unknown',
  'NOT_COMPUTABLE':  'unknown',
};

/**
 * Normaliza la dirección de tendencia a FlokyTrend.
 *
 * Estrategia de resolución en cascada:
 *  1. String de dirección del sensor (más fiable cuando disponible)
 *  2. Delta calculado entre últimas 2 lecturas (fallback)
 *  3. 'unknown' si ninguno está disponible
 *
 * @param direction  String de Nightscout (DoubleUp, Flat, etc.) — opcional
 * @param delta      Diferencia BG entre las 2 últimas lecturas en mg/dL/5min — opcional
 */
export function normalizeTrend(
  direction?: string | null,
  delta?: number | null,
): FlokyTrend {
  // Fuente primaria: string del sensor
  if (direction && direction.trim() !== '') {
    const mapped = DIRECTION_MAP[direction.trim()];
    if (mapped) return mapped;
  }

  // Fallback: delta calculado (mg/dL por 5 minutos)
  if (delta != null && isFinite(delta)) {
    if      (delta >=  DELTA_THRESHOLDS.RAPID_UP)      return 'up2';
    else if (delta >=  DELTA_THRESHOLDS.MODERATE_UP)   return 'up1';
    else if (delta >=  DELTA_THRESHOLDS.GENTLE_UP)     return 'up0';
    else if (delta >   DELTA_THRESHOLDS.GENTLE_DOWN)   return 'flat';
    else if (delta >   DELTA_THRESHOLDS.MODERATE_DOWN) return 'down0';
    else if (delta >   DELTA_THRESHOLDS.RAPID_DOWN)    return 'down1';
    else                                                return 'down2';
  }

  return 'unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// MOTOR DE ESTADO DEL AVATAR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parámetros para el cálculo del estado del avatar.
 * Todos son opcionales — el motor degrada elegantemente con datos parciales.
 */
interface AvatarParams {
  status: FlokyStatus | null;
  trend:  FlokyTrend;
  iob?:   number | null;
  /** bg explícito para lógica de hiperglucemia severa */
  bg?:    number | null;
}

/**
 * Determina el estado del avatar a partir de parámetros clínicos.
 *
 * Matriz de prioridad (de mayor a menor):
 *
 *  P1 — CRÍTICO (bg < 55 O bg > 300):
 *       → alert_strong  (máxima urgencia, animación de pánico)
 *
 *  P2 — TENDENCIA RÁPIDA + CONTEXTO DE RIESGO:
 *       Subida rápida (up2 | up1) + fuera de rango   → focus_up
 *       Bajada rápida (down2) o (down1 + iob alto)   → focus_down
 *
 *  P3 — FUERA DE RANGO SIN TENDENCIA CRÍTICA:
 *       status 'low' o 'high'                        → alert_soft
 *
 *  P4 — EN RANGO CON TENDENCIA SUAVE:
 *       up0 o down0 en rango                         → focus_up / focus_down
 *       (requiere iob > umbral para focus_down — si no, es ruido del sensor)
 *
 *  P5 — CALMA:
 *       Todo lo demás                                → calm
 *
 * La función NO aplica cooldown (eso es responsabilidad del hook que la llama)
 * para mantenerla como función pura.
 */
export function computeAvatarState({
  status,
  trend,
  iob,
  bg,
}: AvatarParams): FlokyAvatarState {
  const safeIob = iob ?? 0;
  const safeBg  = bg  ?? null;

  // ── P1: Estado crítico absoluto ──────────────────────────────────────────
  if (
    status === 'critical' ||
    (safeBg != null && safeBg < BG_THRESHOLDS.CRITICAL_LOW)
  ) {
    return 'alert_strong';
  }

  // ── P2a: Subida rápida ───────────────────────────────────────────────────
  // up2 siempre activa focus_up; up1 sólo si está fuera de rango o iob elevado
  if (trend === 'up2') return 'focus_up';
  if (trend === 'up1' && (status !== 'ok' || safeIob > IOB_RISK_THRESHOLD * 2)) {
    return 'focus_up';
  }

  // ── P2b: Bajada rápida ───────────────────────────────────────────────────
  // down2 siempre activa focus_down; down1 sólo con IOB elevado (riesgo real)
  if (trend === 'down2') return 'focus_down';
  if (trend === 'down1' && safeIob > IOB_RISK_THRESHOLD) return 'focus_down';

  // ── P3: Fuera de rango sin velocidad crítica ─────────────────────────────
  if (status === 'low' || status === 'high') return 'alert_soft';

  // ── P4: En rango con tendencia suave ────────────────────────────────────
  // up0 con BG ya en la parte alta del rango (> 150): anticipa advertencia
  if (trend === 'up0' && safeBg != null && safeBg > 150) return 'focus_up';
  // down0 sólo con IOB activo: hay insulina que puede bajar más
  if (trend === 'down0' && safeIob > IOB_RISK_THRESHOLD) return 'focus_down';

  // ── P5: Calma ────────────────────────────────────────────────────────────
  return 'calm';
}

/**
 * Calcula el nivel de estrés visual (0-3) a partir del contexto clínico.
 *
 *  3 → alert_strong  (crítico — rojo / vibración)
 *  2 → alert_soft    (fuera de rango — naranja)
 *  1 → focus_up / focus_down  (atención activa — amarillo)
 *  0 → calm          (reposo — verde / neutro)
 */
export function computeStress(avatar: FlokyAvatarState): FlokyStressLevel {
  switch (avatar) {
    case 'alert_strong': return 3;
    case 'alert_soft':   return 2;
    case 'focus_up':
    case 'focus_down':   return 1;
    case 'calm':
    default:             return 0;
  }
}

/**
 * Construye el bloque `ui` completo a partir de los parámetros clínicos.
 * Conveniente para llamar desde el parser principal.
 */
export function buildUiContext(params: AvatarParams): FlokyUiContext {
  const avatar = computeAvatarState(params);
  return { avatar, stress: computeStress(avatar) };
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACCIÓN DE TRATAMIENTOS RECIENTES
// ─────────────────────────────────────────────────────────────────────────────

interface RecentTreatment {
  ins:  number | null;  // último bolo (U), round1
  carb: number | null;  // últimos carbs (g), roundInt
}

/**
 * Extrae el último bolo de insulina y la última ingesta de carbohidratos
 * de los tratamientos de las últimas 3 horas.
 *
 * Criterios de selección:
 *  - Toma el más reciente de cada tipo por separado
 *  - Ignora micro-bolos SMB < 0.05 U (ruido del closed-loop)
 *  - Ignora correcciones automáticas si enteredBy es 'AAPS'/'AndroidAPS'
 *    y no hay carbs asociados (para no confundir al usuario)
 */
export function extractLastTreatment(
  treatments: RawNightscoutTreatment[],
): RecentTreatment {
  const THREE_HOURS_MS = 3 * 60 * 60_000;
  const cutoff = Date.now() - THREE_HOURS_MS;

  // Filtrar los de las últimas 3 horas y ordenar por recientes primero
  const recent = treatments
    .filter(t => {
      const ts = new Date(t.created_at).getTime();
      return !isNaN(ts) && ts >= cutoff;
    })
    .sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  // Último bolo significativo (manual o con carbs asociados)
  const lastBolus = recent.find(t => {
    if (!t.insulin || t.insulin < 0.05) return false;
    // Ignorar micro-bolos automáticos sin carbs de entry manual
    const isAutoSMB = (t.enteredBy ?? '').toUpperCase().includes('AAPS') && !t.carbs;
    return !isAutoSMB;
  });

  // Última ingesta de carbohidratos
  const lastCarb = recent.find(t => t.carbs && t.carbs > 0);

  return {
    ins:  round1(lastBolus?.insulin),
    carb: roundInt(lastCarb?.carbs),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CÁLCULO DEL DELTA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula la tasa de cambio de glucemia en mg/dL por 5 minutos.
 * Normaliza el intervalo real entre lecturas para que siempre sea comparable
 * con los umbrales de DELTA_THRESHOLDS (que asumen ventanas de 5 min).
 *
 * @returns null si los datos son insuficientes o el intervalo es incoherente
 */
export function calcDelta(
  current: { sgv: number; date: number } | null,
  previous: { sgv: number; date: number } | null | undefined,
): number | null {
  if (!current || !previous) return null;
  const intervalMs = current.date - previous.date;
  // Intervalo incoherente: < 1 min o > 20 min (lectura demasiado antigua)
  if (intervalMs < 60_000 || intervalMs > 20 * 60_000) return null;
  const intervalFactor = (5 * 60_000) / intervalMs; // normaliza a 5 min
  return (current.sgv - previous.sgv) * intervalFactor;
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — parseNightscoutToFloky
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforma un NightscoutBundle completo en un FlokyJson limpio y optimizado.
 *
 * Nunca lanza excepción — todos los errores se degradan a `null` en el campo
 * correspondiente. El objeto retornado siempre es un FlokyJson válido.
 *
 * Si no hay ningún dato de entrada (`entry === null`), retorna un FlokyJson
 * "vacío" con timestamp actual y estado calm (el UI muestra "sin datos").
 *
 * Ejemplo de uso:
 * ```ts
 * const floky = parseNightscoutToFloky(bundle);
 * // → { t: '2024-01-15T10:30:00.000Z', at: 1705312200000,
 * //     bg: 112, trend: 'flat', status: 'ok',
 * //     iob: 1.2, cob: 15, ins: 3.5, carb: 45, p30: 118, p60: 125,
 * //     ui: { stress: 0, avatar: 'calm' } }
 * ```
 */
export function parseNightscoutToFloky(bundle: NightscoutBundle): FlokyJson {
  const { entry, prevEntry, treatments, deviceStatus } = bundle;

  // ── Timestamp ──────────────────────────────────────────────────────────────
  const now  = Date.now();
  const at   = entry?.date    ?? now;
  const t    = entry?.dateString
    ?? (entry?.date ? new Date(entry.date).toISOString() : new Date(now).toISOString());

  // ── Glucemia ───────────────────────────────────────────────────────────────
  const bg     = roundInt(entry?.sgv);
  const status = normalizeStatus(bg);

  // ── Tendencia: primero el string del sensor, luego delta calculado ─────────
  const delta  = calcDelta(entry ?? null, prevEntry ?? null);
  const trend  = normalizeTrend(entry?.direction, delta);

  // ── IOB / COB (deviceStatus prevalece; fallback: rawDeviceData de treatments) ──
  let iob: number | null = round1(deviceStatus?.iob);
  let cob: number | null = roundInt(deviceStatus?.cob);

  if (iob === null || cob === null) {
    // Buscar en el treatment más reciente con rawDeviceData.calculation
    const withCalc = [...treatments]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .find(t => t.rawDeviceData?.calculation);

    if (withCalc?.rawDeviceData?.calculation) {
      const calc = withCalc.rawDeviceData.calculation;
      if (iob === null) iob = round1(calc.iob);
      if (cob === null) cob = roundInt(calc.cob);
    }
  }

  // ── Último bolo / últimos carbs ────────────────────────────────────────────
  const { ins, carb } = extractLastTreatment(treatments);

  // ── Predicciones del loop ──────────────────────────────────────────────────
  // p30: interpolamos entre BG actual y eventualBG si minPredBG / maxPredBG disponible
  // Simplificación conservadora: si hay eventualBG, p60 = eventualBG; p30 = punto medio.
  let p30: number | null = null;
  let p60: number | null = null;

  if (deviceStatus?.eventualBG != null) {
    const eventual = deviceStatus.eventualBG;
    p60 = roundInt(eventual);
    // p30 = media ponderada del BG actual y eventual (mejor estimación sin serie temporal)
    if (bg != null) {
      p30 = roundInt(bg + (eventual - bg) * 0.5);
    } else {
      p30 = p60; // fallback si no tenemos BG actual
    }
    // Clampear a rango fisiológico plausible
    if (p30 != null) p30 = clamp(p30, 20, 600);
    if (p60 != null) p60 = clamp(p60, 20, 600);
  }

  // ── Contexto UI y avatar ───────────────────────────────────────────────────
  const ui = buildUiContext({ status, trend, iob, bg });

  return { t, at, bg, trend, status, iob, cob, ins, carb, p30, p60, ui };
}
