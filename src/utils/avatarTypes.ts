// ─────────────────────────────────────────────────────────────────────────────
// avatarTypes.ts — Tipos, enums y constantes del sistema de avatares
// ─────────────────────────────────────────────────────────────────────────────

// ── Modos de la app ──────────────────────────────────────────────────────────

export type AvatarMode = 'adolescent' | 'adult' | 'parent';

// ── Compañeros disponibles por modo ──────────────────────────────────────────

export type AdolescentCompanion = 'gerbera' | 'rosa' | 'tulipan';
export type ParentCompanion     = 'dino'    | 'oso'  | 'pato';
export type AdultCompanion      = 'zen_gem' | 'plasma_orb' | 'origami';

export type AvatarCompanion = AdolescentCompanion | ParentCompanion | AdultCompanion;

// ── Estado glucémico — fuente de verdad para las reacciones ──────────────────

export enum BloodGlucoseStatus {
  CRITICAL_LOW  = 'CRITICAL_LOW',   // < 54 mg/dL — urgente
  LOW           = 'LOW',            // 54–69 mg/dL
  IN_RANGE      = 'IN_RANGE',       // targetLow – targetHigh
  HIGH          = 'HIGH',           // targetHigh – targetHigh+70
  CRITICAL_HIGH = 'CRITICAL_HIGH',  // > targetHigh+70
  RAPID_RISE    = 'RAPID_RISE',     // flecha DoubleUp / SingleUp
  RAPID_DROP    = 'RAPID_DROP',     // flecha DoubleDown / SingleDown
  UNKNOWN       = 'UNKNOWN',        // sin datos o primera carga
}

// ── Estados de animación ─────────────────────────────────────────────────────

/** Los 6 estados naturales/idle — se ciclan aleatoriamente */
export enum IdleState {
  IDLE_1 = 'IDLE_1',
  IDLE_2 = 'IDLE_2',
  IDLE_3 = 'IDLE_3',
  IDLE_4 = 'IDLE_4',
  IDLE_5 = 'IDLE_5',
  IDLE_6 = 'IDLE_6',
}

/** Estados reactivos a glucemia — tienen prioridad sobre idle */
export enum GlucoseReactionState {
  REACTION_CRITICAL_LOW  = 'REACTION_CRITICAL_LOW',
  REACTION_LOW           = 'REACTION_LOW',
  REACTION_IN_RANGE      = 'REACTION_IN_RANGE',
  REACTION_HIGH          = 'REACTION_HIGH',
  REACTION_CRITICAL_HIGH = 'REACTION_CRITICAL_HIGH',
  REACTION_RAPID_RISE    = 'REACTION_RAPID_RISE',
  REACTION_RAPID_DROP    = 'REACTION_RAPID_DROP',
  REACTION_POINTS_EARNED = 'REACTION_POINTS_EARNED',  // celebración gamificación
}

export type AvatarAnimationState = IdleState | GlucoseReactionState;

// ── Prioridades — cuanto mayor, más urgente ──────────────────────────────────

export const ANIMATION_PRIORITY: Record<AvatarAnimationState, number> = {
  // Idle: prioridad base 0
  [IdleState.IDLE_1]: 0,
  [IdleState.IDLE_2]: 0,
  [IdleState.IDLE_3]: 0,
  [IdleState.IDLE_4]: 0,
  [IdleState.IDLE_5]: 0,
  [IdleState.IDLE_6]: 0,
  // Reacciones: prioridad creciente
  [GlucoseReactionState.REACTION_IN_RANGE]:      10,
  [GlucoseReactionState.REACTION_POINTS_EARNED]: 15,
  [GlucoseReactionState.REACTION_HIGH]:          20,
  [GlucoseReactionState.REACTION_RAPID_RISE]:    25,
  [GlucoseReactionState.REACTION_RAPID_DROP]:    25,
  [GlucoseReactionState.REACTION_LOW]:           30,
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]: 35,
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:  40,  // máxima urgencia
};

// ── Duración de cada reacción antes de volver a idle ────────────────────────

export const REACTION_DURATION_MS: Record<GlucoseReactionState, number> = {
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:  5000,
  [GlucoseReactionState.REACTION_LOW]:           4000,
  [GlucoseReactionState.REACTION_IN_RANGE]:      3000,
  [GlucoseReactionState.REACTION_HIGH]:          4000,
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]: 5000,
  [GlucoseReactionState.REACTION_RAPID_RISE]:    3500,
  [GlucoseReactionState.REACTION_RAPID_DROP]:    3500,
  [GlucoseReactionState.REACTION_POINTS_EARNED]: 2500,
};

// ── Duración de cada idle antes de pasar al siguiente ────────────────────────

export const IDLE_DURATION_MS: Record<IdleState, number> = {
  [IdleState.IDLE_1]: 4000,
  [IdleState.IDLE_2]: 3500,
  [IdleState.IDLE_3]: 5000,
  [IdleState.IDLE_4]: 3000,
  [IdleState.IDLE_5]: 4500,
  [IdleState.IDLE_6]: 3500,
};

// ── Mapeo glucemia → reacción ─────────────────────────────────────────────────

export function glucoseStatusToReaction(
  status: BloodGlucoseStatus,
): GlucoseReactionState {
  switch (status) {
    case BloodGlucoseStatus.CRITICAL_LOW:  return GlucoseReactionState.REACTION_CRITICAL_LOW;
    case BloodGlucoseStatus.LOW:           return GlucoseReactionState.REACTION_LOW;
    case BloodGlucoseStatus.HIGH:          return GlucoseReactionState.REACTION_HIGH;
    case BloodGlucoseStatus.CRITICAL_HIGH: return GlucoseReactionState.REACTION_CRITICAL_HIGH;
    case BloodGlucoseStatus.RAPID_RISE:    return GlucoseReactionState.REACTION_RAPID_RISE;
    case BloodGlucoseStatus.RAPID_DROP:    return GlucoseReactionState.REACTION_RAPID_DROP;
    default:                               return GlucoseReactionState.REACTION_IN_RANGE;
  }
}

// ── Cálculo de estado glucémico desde un valor y umbrales ────────────────────

export function calcBloodGlucoseStatus(
  value:  number,
  trend:  string | undefined,
  low:    number,
  high:   number,
): BloodGlucoseStatus {
  if (trend === 'DoubleUp' || trend === 'SingleUp')     return BloodGlucoseStatus.RAPID_RISE;
  if (trend === 'DoubleDown' || trend === 'SingleDown') return BloodGlucoseStatus.RAPID_DROP;
  if (value < 54)        return BloodGlucoseStatus.CRITICAL_LOW;
  if (value < low)       return BloodGlucoseStatus.LOW;
  if (value <= high)     return BloodGlucoseStatus.IN_RANGE;
  if (value <= high + 70) return BloodGlucoseStatus.HIGH;
  return BloodGlucoseStatus.CRITICAL_HIGH;
}

// ── Tipo de evento externo que puede disparar el sistema ─────────────────────

export interface AvatarEvent {
  type: 'glucose' | 'points_earned' | 'manual';
  glucoseStatus?: BloodGlucoseStatus;
  pointsDelta?:   number;
  forceState?:    AvatarAnimationState;
}
