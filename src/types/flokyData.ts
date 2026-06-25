/**
 * flokyData.ts — Contrato de tipos del ecosistema Floky JSON
 *
 * Tres capas:
 *  1. RawNightscoutTreatment  → entrada cruda del servidor (Nightscout / AAPS / AndroidAPS)
 *  2. NightscoutBundle        → agrupación tipada de las 3 llamadas paralelas al API
 *  3. FlokyJson               → salida pública ultra-compacta, pre-redondeada, enriquecida con UX
 *
 * FlokyJson es el "contrato público" que consume todo el frontend:
 *  componentes, avatares, dashboards y notificaciones.
 */

import type { NightscoutEntry, NightscoutDeviceStatus } from '@/services/nightscoutService';

// ─────────────────────────────────────────────────────────────────────────────
// 1.  RAW INPUT — Nightscout / AAPS treatments (campo rawDeviceData extendido)
// ─────────────────────────────────────────────────────────────────────────────

/** Estado de la bomba de insulina tal como lo reporta AAPS/AndroidAPS */
export interface RawPumpStatus {
  battery?: {
    percent?: number;   // 0-100
    voltage?: number;   // V
  };
  reservoir?: number;   // U restantes
  status?: {
    status?:    string; // 'normal' | 'suspended' | 'tbr'
    timestamp?: string;
  };
  bolusing?: boolean;
}

/** Estado del sensor CGM dentro del rawDeviceData */
export interface RawSensorStatus {
  sensorAge?:         number; // minutos que lleva puesto
  sensorRemaining?:   number; // minutos que le quedan
  sensorUploadedTo?:  string; // 'xDrip' | 'AAPS' | etc.
}

/**
 * Cálculos del algoritmo de cierre de lazo (OpenAPS / AAPS)
 * anidados dentro del treatment rawDeviceData.
 */
export interface RawCalculation {
  iob?:              number; // U insulina activa
  cob?:              number; // g carbohidratos activos
  eventualBG?:       number; // mg/dL BG predicho eventual
  sensitivityRatio?: number; // ratio de sensibilidad (0.5 = 50 % más sensible)
  isf?:              number; // Factor de Sensibilidad a la Insulina (mg/dL por U)
  ic?:               number; // ratio Insulina/Carbohidratos (g de carb por U)
  minPredBG?:        number; // mg/dL predicción mínima
  maxPredBG?:        number; // mg/dL predicción máxima
}

/**
 * Objeto completo de datos de dispositivo embebido en algunos tratamientos AAPS.
 * Se usa como fuente de fallback si no hay devicestatus.json disponible.
 */
export interface RawDeviceData {
  pumpStatus?: RawPumpStatus;
  sensor?:     RawSensorStatus;
  calculation?: RawCalculation;
}

/**
 * Treatment de Nightscout con todos los campos posibles de AAPS / AndroidAPS.
 * Extiende el NightscoutTreatment básico con campos opcionales del ecosistema.
 */
export interface RawNightscoutTreatment {
  _id:          string;
  eventType:    string;   // 'Meal Bolus' | 'Carb Correction' | 'Temp Basal' | etc.
  created_at:   string;   // ISO 8601

  // Insulina y carbohidratos
  insulin?:     number;   // U de bolo
  carbs?:       number;   // g de carbohidratos
  notes?:       string;

  // Basal temporal
  duration?:    number;   // minutos de duración
  percent?:     number;   // % sobre basal programada
  absolute?:    number;   // U/h absoluta

  // Perfil / contexto
  profile?:     string;
  enteredBy?:   string;   // 'AAPS' | 'xDrip' | 'manual' | etc.

  // BG en el momento del tratamiento (opcional)
  glucose?:     number;
  glucoseType?: 'Sensor' | 'Finger' | 'Manual';

  // Datos de dispositivo (AAPS puede embeberlos aquí)
  rawDeviceData?: RawDeviceData;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.  BUNDLE — agrupación de las 3 llamadas al API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Paquete de datos brutos que recibe el parser.
 * Los 3 campos son nulables/opcionales — el parser maneja cada caso de fallo.
 */
export interface NightscoutBundle {
  /** Lectura SGV más reciente */
  entry:         NightscoutEntry | null;
  /** Lectura anterior (para calcular delta de tasa de cambio) */
  prevEntry?:    NightscoutEntry | null;
  /** Tratamientos de las últimas 3 horas */
  treatments:    RawNightscoutTreatment[];
  /** Estado del dispositivo / loop (IOB, COB, predicciones) */
  deviceStatus:  NightscoutDeviceStatus | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3.  FLOKY JSON — salida pública, contrato del frontend
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estado de glucemia clínico, mapeado a 4 rangos discretos.
 * Evita mostrar al usuario valores numéricos precisos que generan ansiedad.
 *
 *  'low'      →  BG < 70   mg/dL  (hipoglucemia)
 *  'ok'       →  70-180    mg/dL  (rango)
 *  'high'     →  181-250   mg/dL  (hiperglucemia)
 *  'critical' →  > 250     mg/dL  (crítico)
 */
export type FlokyStatus = 'low' | 'ok' | 'high' | 'critical';

/**
 * Dirección de la tendencia en 7 niveles, mapeada desde los strings de Nightscout
 * o calculada a partir del delta entre lecturas.
 *
 *  'up2'   → subida rápida  (≥ 3 mg/dL/5min  |  DoubleUp)
 *  'up1'   → subida media   (1.5–3            |  SingleUp)
 *  'up0'   → subida suave   (0.5–1.5          |  FortyFiveUp)
 *  'flat'  → plana          (–0.5 a 0.5       |  Flat)
 *  'down0' → bajada suave   (–1.5 a –0.5      |  FortyFiveDown)
 *  'down1' → bajada media   (–3 a –1.5        |  SingleDown)
 *  'down2' → bajada rápida  (< –3             |  DoubleDown)
 *  'unknown' → no disponible
 */
export type FlokyTrend =
  | 'up2' | 'up1' | 'up0'
  | 'flat'
  | 'down0' | 'down1' | 'down2'
  | 'unknown';

/**
 * Estado discreto que controla los avatares.
 * 5 estados evitan la reacción caótica del avatar a cada micro-cambio del sensor.
 *
 *  'calm'          → BG en rango, tendencia plana. Avatar en animación idle.
 *  'alert_soft'    → BG ligeramente fuera de rango o tendencia moderada. Animación suave.
 *  'alert_strong'  → BG crítico (hypo severa / hiper marcada). Animación de urgencia.
 *  'focus_up'      → Subida rápida activa. Avatar con alerta de ascenso.
 *  'focus_down'    → Bajada rápida activa. Avatar con alerta de descenso.
 */
export type FlokyAvatarState =
  | 'calm'
  | 'alert_soft'
  | 'alert_strong'
  | 'focus_up'
  | 'focus_down';

/**
 * Nivel de "estrés" visual de la UI (0-3).
 * Controla la intensidad de las animaciones, colores y alertas.
 *
 *  0 → UI en reposo, colores neutros
 *  1 → Ligera atención, color secundario
 *  2 → Alerta moderada, color de advertencia
 *  3 → Urgencia, color crítico + vibración
 */
export type FlokyStressLevel = 0 | 1 | 2 | 3;

/**
 * Bloque de contexto para la UI y los avatares.
 * Encapsula toda la información necesaria para actualizar la capa visual sin
 * que los componentes lean individualmente cada campo clínico.
 */
export interface FlokyUiContext {
  /** Nivel de intensidad de la interfaz (0 = calma, 3 = urgencia crítica) */
  stress:  FlokyStressLevel;
  /**
   * Estado del avatar — actúa como disparador directo de la máquina de estados
   * de animación. El frontend mapea este campo a GlucoseReactionState.
   */
  avatar:  FlokyAvatarState;
}

/**
 * FlokyJson — Contrato público de la capa de abstracción de datos CGM.
 *
 * Principios de diseño:
 *  - Claves cortas (1-4 chars) para serialización compacta
 *  - Todos los valores clínicos pre-redondeados (no se redondea en el frontend)
 *  - null explícito cuando un dato no está disponible (nunca undefined)
 *  - El bloque `ui` contiene todo lo necesario para renderizar sin cálculos adicionales
 *
 * Equivale al response body de: GET /api/v1/floky-status
 */
export interface FlokyJson {
  /** ISO 8601 — timestamp de la lectura CGM más reciente */
  t:      string;
  /** Unix epoch ms — para cálculos de "hace X minutos" sin parsear ISO */
  at:     number;

  // ── Glucemia ──────────────────────────────────────────────────────────────
  /** Glucemia actual en mg/dL, redondeada a entero. null si no hay lectura. */
  bg:     number | null;
  /** Dirección de la tendencia */
  trend:  FlokyTrend;
  /** Estado clínico discreto */
  status: FlokyStatus | null;

  // ── Insulina y carbohidratos ───────────────────────────────────────────────
  /** Insulina activa total en U, redondeada a 1 decimal. */
  iob:    number | null;
  /** Carbohidratos activos en g, redondeado a entero. */
  cob:    number | null;
  /** Último bolo registrado en las últimas 3 horas (U, 1 decimal). */
  ins:    number | null;
  /** Últimos carbohidratos registrados en las últimas 3 horas (g, entero). */
  carb:   number | null;

  // ── Predicciones (loop cerrado) ────────────────────────────────────────────
  /** Predicción de BG a 30 minutos (mg/dL, entero). null sin loop activo. */
  p30:    number | null;
  /** Predicción de BG a 60 minutos / eventual (mg/dL, entero). null sin loop. */
  p60:    number | null;

  // ── Contexto UI ───────────────────────────────────────────────────────────
  /** Contexto para la capa visual y los avatares. Nunca null. */
  ui:     FlokyUiContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4.  ESTADO DE ERROR DEL GATEWAY
// ─────────────────────────────────────────────────────────────────────────────

export type FlokyGatewayErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_FAILED'
  | 'PARSE_ERROR'
  | 'NO_DATA'
  | 'INVALID_URL';

/** Error tipado del gateway — nunca expone mensajes crudos del servidor */
export interface FlokyGatewayError {
  code:    FlokyGatewayErrorCode;
  message: string;  // mensaje seguro para mostrar al usuario
}

// ─────────────────────────────────────────────────────────────────────────────
// 5.  CONSTANTES DE REFERENCIA (exportadas para tests y documentación)
// ─────────────────────────────────────────────────────────────────────────────

/** Umbrales clínicos usados por normalizeStatus */
export const BG_THRESHOLDS = {
  CRITICAL_LOW:  55,
  LOW:           70,
  HIGH:          181,
  CRITICAL_HIGH: 251,
} as const;

/** Umbrales de tasa de cambio en mg/dL por 5 minutos usados por normalizeTrend */
export const DELTA_THRESHOLDS = {
  RAPID_UP:     3.0,
  MODERATE_UP:  1.5,
  GENTLE_UP:    0.5,
  GENTLE_DOWN: -0.5,
  MODERATE_DOWN:-1.5,
  RAPID_DOWN:  -3.0,
} as const;

/** IOB mínimo que considera el motor de avatar para detectar riesgo de hipoglucemia */
export const IOB_RISK_THRESHOLD = 1.5;

/** Minutos de cooldown mínimo entre cambios de estado del avatar (anti-chaos) */
export const AVATAR_COOLDOWN_MS = 90_000; // 90 segundos
