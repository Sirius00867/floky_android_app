/**
 * Utilidades compartidas para colorear y etiquetar valores de glucosa.
 * Todos los umbrales respetan glucoseTargetLow / glucoseTargetHigh del usuario.
 */

export const GLUCOSE_COLORS = {
  criticalLow: '#DC2626',
  low:         '#EF4444',
  inRange:     '#10B981',
  high:        '#F59E0B',
} as const;

/** Color hex según zona glucémica. */
export function glucoseColor(
  value: number,
  low   = 70,
  high  = 180,
): string {
  if (value < low - 16)      return GLUCOSE_COLORS.criticalLow;
  if (value < low)           return GLUCOSE_COLORS.low;
  if (value <= high)         return GLUCOSE_COLORS.inRange;
  if (value <= high + 70)    return GLUCOSE_COLORS.high;
  return GLUCOSE_COLORS.criticalLow;
}

/** Etiqueta + icono + urgencia según zona glucémica. */
export function glucoseStatus(
  value: number,
  low   = 70,
  high  = 180,
): { label: string; icon: string; urgent: boolean } {
  if (value < low - 16)   return { label: 'MUY BAJA — actúa ya', icon: '🚨', urgent: true };
  if (value < low)        return { label: 'Baja',     icon: '⚠️',  urgent: true  };
  if (value <= high)      return { label: 'En rango', icon: '✅',  urgent: false };
  if (value <= high + 70) return { label: 'Alta',     icon: '↑',   urgent: false };
  return                         { label: 'Muy alta', icon: '⚠️',  urgent: false };
}

/** Texto corto para badge de estado (adolescente). */
export function glucoseStatusShort(
  value: number,
  low   = 70,
  high  = 180,
): string {
  if (value < low)        return '⚠️ Baja';
  if (value <= high)      return '✅ Normal';
  if (value <= high + 70) return '⬆️ Alta';
  return '🚨 Muy alta';
}
