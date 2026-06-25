import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ANIMATION_PRIORITY,
  AvatarAnimationState,
  AvatarEvent,
  BloodGlucoseStatus,
  GlucoseReactionState,
  IDLE_DURATION_MS,
  IdleState,
  REACTION_DURATION_MS,
  glucoseStatusToReaction,
} from '@/utils/avatarTypes';

const IDLE_STATES = Object.values(IdleState);

function randomIdleExcluding(current: IdleState): IdleState {
  const pool = IDLE_STATES.filter(s => s !== current);
  return pool[Math.floor(Math.random() * pool.length)];
}

function isIdleState(s: AvatarAnimationState): s is IdleState {
  return Object.values(IdleState).includes(s as IdleState);
}

interface UseAvatarStateReturn {
  currentState: AvatarAnimationState;
  previousState: AvatarAnimationState | null;
  isReacting: boolean;
  sendEvent: (event: AvatarEvent) => void;
}

export function useAvatarState(
  glucoseStatus: BloodGlucoseStatus = BloodGlucoseStatus.UNKNOWN,
): UseAvatarStateReturn {
  const [currentState, setCurrentState] = useState<AvatarAnimationState>(IdleState.IDLE_1);
  const [previousState, setPreviousState] = useState<AvatarAnimationState | null>(null);

  const currentStateRef   = useRef<AvatarAnimationState>(IdleState.IDLE_1);
  const currentPriorityRef = useRef<number>(0);
  const idleTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGlucoseStatus = useRef<BloodGlucoseStatus>(BloodGlucoseStatus.UNKNOWN);

  const transitionTo = useCallback((next: AvatarAnimationState) => {
    setPreviousState(currentStateRef.current);
    currentStateRef.current   = next;
    currentPriorityRef.current = ANIMATION_PRIORITY[next];
    setCurrentState(next);
  }, []);

  const scheduleNextIdle = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const current = currentStateRef.current;
    if (!isIdleState(current)) return;

    const delay = IDLE_DURATION_MS[current];
    idleTimerRef.current = setTimeout(() => {
      if (!isIdleState(currentStateRef.current)) return;
      const next = randomIdleExcluding(currentStateRef.current as IdleState);
      transitionTo(next);
      scheduleNextIdle();
    }, delay);
  }, [transitionTo]);

  const returnToIdle = useCallback(() => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    const next = randomIdleExcluding(
      isIdleState(currentStateRef.current)
        ? (currentStateRef.current as IdleState)
        : IdleState.IDLE_1,
    );
    transitionTo(next);
    scheduleNextIdle();
  }, [transitionTo, scheduleNextIdle]);

  const triggerReaction = useCallback(
    (reaction: GlucoseReactionState) => {
      const incomingPriority = ANIMATION_PRIORITY[reaction];
      if (incomingPriority < currentPriorityRef.current) return;

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);

      transitionTo(reaction);

      const duration = REACTION_DURATION_MS[reaction];
      reactionTimerRef.current = setTimeout(returnToIdle, duration);
    },
    [transitionTo, returnToIdle],
  );

  // Reaccionar cuando cambia glucoseStatus
  useEffect(() => {
    if (glucoseStatus === lastGlucoseStatus.current) return;
    lastGlucoseStatus.current = glucoseStatus;

    if (glucoseStatus === BloodGlucoseStatus.UNKNOWN) return;

    const reaction = glucoseStatusToReaction(glucoseStatus);
    triggerReaction(reaction);
  }, [glucoseStatus, triggerReaction]);

  // Arrancar ciclo idle al montar
  useEffect(() => {
    scheduleNextIdle();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, [scheduleNextIdle]);

  const sendEvent = useCallback(
    (event: AvatarEvent) => {
      switch (event.type) {
        case 'glucose':
          if (event.glucoseStatus) {
            const reaction = glucoseStatusToReaction(event.glucoseStatus);
            triggerReaction(reaction);
          }
          break;
        case 'points_earned':
          triggerReaction(GlucoseReactionState.REACTION_POINTS_EARNED);
          break;
        case 'manual':
          if (event.forceState) {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
            if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
            transitionTo(event.forceState);
            if (isIdleState(event.forceState)) {
              scheduleNextIdle();
            } else {
              const duration = REACTION_DURATION_MS[event.forceState as GlucoseReactionState] ?? 3000;
              reactionTimerRef.current = setTimeout(returnToIdle, duration);
            }
          }
          break;
      }
    },
    [triggerReaction, transitionTo, scheduleNextIdle, returnToIdle],
  );

  const isReacting = !isIdleState(currentState);

  return { currentState, previousState, isReacting, sendEvent };
}
