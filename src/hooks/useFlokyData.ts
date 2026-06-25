/**
 * useFlokyData — Hook React que orquesta la capa Floky completa
 *
 * Responsabilidades:
 *  1. Lee credenciales de Nightscout desde Redux (settings)
 *  2. Llama a fetchFlokyStatus() en mount y cada SYNC_INTERVAL_MS
 *  3. Aplica cooldown de avatar (AVATAR_COOLDOWN_MS) para evitar
 *     reacciones caóticas a micro-fluctuaciones del sensor
 *  4. Despacha setFlokySnapshot() al store cuando hay datos nuevos
 *  5. Expone { floky, loading, error, lastSync } al componente caller
 *
 * Reemplaza a useGlucoseSync para las partes de la UI que necesitan
 * el contexto completo (glucosa + IOB + COB + avatar + predicciones).
 * useGlucoseSync sigue activo para la barra de glucosa básica y notificaciones.
 *
 * Uso:
 * ```tsx
 * function GlucoseDashboard() {
 *   const { floky, loading, error } = useFlokyData();
 *   if (loading) return <Spinner />;
 *   if (error)   return <ErrorBanner message={error.message} />;
 *   return <FlokyCard data={floky!} />;
 * }
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { setFlokySnapshot } from '@/store/slices/healthSlice';
import { fetchFlokyStatus, isFlokyError } from '@/services/flokyGateway';
import type { FlokyJson, FlokyGatewayError, FlokyAvatarState } from '@/types/flokyData';
import { AVATAR_COOLDOWN_MS } from '@/types/flokyData';

// ── Constantes ──────────────────────────────────────────────────────────────

/** Intervalo de sincronización principal (60 segundos — 1 ciclo CGM) */
const SYNC_INTERVAL_MS = 60_000;

/**
 * Período de "silencio" tras un error de red antes de reintentar.
 * Evita hammering al servidor si Nightscout está caído.
 */
const ERROR_BACKOFF_MS = 30_000;

// ── Tipos del hook ───────────────────────────────────────────────────────────

export interface FlokyDataState {
  /** Último FlokyJson procesado. null mientras no hay datos. */
  floky:    FlokyJson | null;
  /** true durante la primera carga o cuando se está actualizando */
  loading:  boolean;
  /** Error del último intento. null si el último sync fue exitoso. */
  error:    FlokyGatewayError | null;
  /** ISO timestamp del último sync exitoso. null si nunca se sincronizó. */
  lastSync: string | null;
  /** Forzar una sincronización inmediata (p.ej. al hacer pull-to-refresh) */
  refresh:  () => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFlokyData(): FlokyDataState {
  const dispatch       = useDispatch();
  const nightscoutUrl  = useSelector((s: RootState) => s.settings?.nightscoutUrl    ?? '');
  const nightscoutKey  = useSelector((s: RootState) => s.settings?.nightscoutApiSecret ?? '');
  const storedFloky    = useSelector((s: RootState) => s.health?.flokySnapshot ?? null);

  const [loading,  setLoading]  = useState(storedFloky === null);
  const [error,    setError]    = useState<FlokyGatewayError | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Ref para el cooldown del avatar — evita que el avatar cambie de estado
  // más de una vez por AVATAR_COOLDOWN_MS aunque el parser emita un estado nuevo.
  const lastAvatarChangeRef  = useRef<number>(0);
  const lastAvatarStateRef   = useRef<FlokyAvatarState | null>(null);

  // Ref para controlar si el componente sigue montado (evita setState post-unmount)
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Aplicar cooldown al avatar ─────────────────────────────────────────────

  /**
   * Aplica el cooldown al estado del avatar.
   * Si el avatar calculado es diferente al actual pero el cooldown no ha expirado,
   * devuelve el FlokyJson con el avatar anterior (sin cambio).
   * Esto previene que el avatar reaccione a cada micro-fluctuación del sensor.
   */
  const applyAvatarCooldown = useCallback((floky: FlokyJson): FlokyJson => {
    const now        = Date.now();
    const newAvatar  = floky.ui.avatar;
    const prevAvatar = lastAvatarStateRef.current;
    const elapsed    = now - lastAvatarChangeRef.current;

    // Siempre permitir cambios hacia alert_strong (urgencia crítica, no debouncea)
    const isCritical = newAvatar === 'alert_strong';

    if (
      prevAvatar !== null &&
      newAvatar  !== prevAvatar &&
      !isCritical &&
      elapsed < AVATAR_COOLDOWN_MS
    ) {
      // Retener avatar anterior — todavía en cooldown
      return {
        ...floky,
        ui: { ...floky.ui, avatar: prevAvatar },
      };
    }

    // Nuevo estado de avatar permitido — actualizar refs
    if (newAvatar !== prevAvatar) {
      lastAvatarStateRef.current  = newAvatar;
      lastAvatarChangeRef.current = now;
    }

    return floky;
  }, []);

  // ── Función de sincronización ──────────────────────────────────────────────

  const sync = useCallback(async () => {
    if (!nightscoutUrl || !nightscoutKey) {
      // Sin credenciales configuradas — no hay error, simplemente no hay fuente
      setLoading(false);
      return;
    }

    setLoading(true);

    const result = await fetchFlokyStatus(nightscoutUrl, nightscoutKey);

    if (!mountedRef.current) return;

    if (isFlokyError(result)) {
      setError(result);
      setLoading(false);
      return;
    }

    // Aplicar cooldown al avatar antes de persistir
    const flokyWithCooldown = applyAvatarCooldown(result);

    dispatch(setFlokySnapshot(flokyWithCooldown));
    setError(null);
    setLastSync(new Date().toISOString());
    setLoading(false);
  }, [nightscoutUrl, nightscoutKey, dispatch, applyAvatarCooldown]);

  // ── Ciclo de sincronización periódica ─────────────────────────────────────

  useEffect(() => {
    if (!nightscoutUrl || !nightscoutKey) return;

    // Sincronización inmediata al montar
    sync();

    // Periódica — se retrasa el intervalo si hubo error (backoff)
    let intervalId: ReturnType<typeof setInterval>;

    const scheduleNext = () => {
      const delay = error ? ERROR_BACKOFF_MS : SYNC_INTERVAL_MS;
      intervalId = setInterval(() => {
        sync().then(scheduleNext);
      }, delay);
    };

    scheduleNext();

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nightscoutUrl, nightscoutKey]);
  // Nota: `sync` y `error` se excluyen intencionalmente del array de deps
  // para que el intervalo no se reinicie en cada cambio de estado.

  return {
    floky:   storedFloky,
    loading,
    error,
    lastSync,
    refresh: sync,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELECTOR HELPERS — para componentes que sólo necesitan un campo
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Selector memoizable para el estado del avatar.
 * Úsalo en los componentes de avatar para evitar re-renders innecesarios.
 *
 * ```ts
 * const avatarState = useSelector(selectAvatarState);
 * ```
 */
export function selectAvatarState(s: RootState): FlokyAvatarState {
  return s.health?.flokySnapshot?.ui.avatar ?? 'calm';
}

/**
 * Selector para el nivel de estrés de la UI (0-3).
 */
export function selectStressLevel(s: RootState): number {
  return s.health?.flokySnapshot?.ui.stress ?? 0;
}

/**
 * Selector para el estado clínico de glucemia.
 */
export function selectGlucoseStatus(s: RootState) {
  return s.health?.flokySnapshot?.status ?? null;
}
