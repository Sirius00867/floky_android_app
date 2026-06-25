/**
 * ZenGemAvatar — Gema tallada, modo adulto
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 *
 * Animación global (squash & stretch):
 *   idle     → pulse (scale) + sway (rotate) + opacity breathe
 *   reaction → squash-stretch + flash de opacidad
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Stop } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ─────────────────────────────────────────────────────────────────

const GEM_A: Record<string, string> = {
  default:                                          '#A78BFA',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#F87171',
  [GlucoseReactionState.REACTION_LOW]:              '#FCA5A5',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FDE68A',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FCD34D',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#93C5FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#C4B5FD',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const GEM_B: Record<string, string> = {
  default:                                          '#7C3AED',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#DC2626',
  [GlucoseReactionState.REACTION_LOW]:              '#B91C1C',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#059669',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#2563EB',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#6D28D9',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A21CAF',
};
const GEM_C: Record<string, string> = {
  default:                                          '#4C1D95',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#7F1D1D',
  [GlucoseReactionState.REACTION_LOW]:              '#991B1B',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#064E3B',
  [GlucoseReactionState.REACTION_HIGH]:             '#92400E',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#78350F',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#1E3A8A',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#3B0764',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#701A75',
};

// ── Idle config ─────────────────────────────────────────────────────────────

interface IdleConfig { pulseMin: number; pulseMax: number; swayA: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { pulseMin: 0.95, pulseMax: 1.04, swayA: 2, speed: 2200 },
  [IdleState.IDLE_2]: { pulseMin: 0.93, pulseMax: 1.06, swayA: 3, speed: 1700 },
  [IdleState.IDLE_3]: { pulseMin: 0.97, pulseMax: 1.02, swayA: 1, speed: 3000 },
  [IdleState.IDLE_4]: { pulseMin: 0.91, pulseMax: 1.08, swayA: 4, speed: 1400 },
  [IdleState.IDLE_5]: { pulseMin: 0.94, pulseMax: 1.05, swayA: 2, speed: 2400 },
  [IdleState.IDLE_6]: { pulseMin: 0.90, pulseMax: 1.10, swayA: 5, speed: 1200 },
};

export function ZenGemAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid     = useId().replace(/:/g, '');
  const scale   = useSharedValue(1);
  const sway    = useSharedValue(0);
  const opacity = useSharedValue(0.9);
  const sqX     = useSharedValue(1);
  const sqY     = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const a = GEM_A[animationState] ?? GEM_A.default;
  const b = GEM_B[animationState] ?? GEM_B.default;
  const c = GEM_C[animationState] ?? GEM_C.default;

  useEffect(() => {
    cancelAnimation(scale); cancelAnimation(sway);
    cancelAnimation(opacity); cancelAnimation(sqX); cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      scale.value = withRepeat(
        withSequence(
          withTiming(cfg.pulseMax, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(cfg.pulseMin, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed * 2, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed * 2, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1,    { duration: cfg.speed }),
          withTiming(0.78, { duration: cfg.speed }),
        ), -1, true,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.35, { duration: 90  }),
        withTiming(0.88, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
      sqY.value = withSequence(
        withTiming(0.76, { duration: 90  }),
        withTiming(1.20, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
      opacity.value = withSequence(
        withTiming(1,    { duration: 70  }),
        withTiming(0.55, { duration: 70  }),
        withTiming(1,    { duration: 70  }),
        withTiming(0.9,  { duration: 200 }),
      );
    }
  }, [animationState, isIdle]);

  // UN solo worklet → cero tearing
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { rotate: `${sway.value}deg` },
      { scaleX: sqX.value * scale.value },
      { scaleY: sqY.value * scale.value },
    ],
  }));

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[{ width: size, height: size }, animStyle]}
        collapsable={false}
        renderToHardwareTextureAndroid
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id={`${uid}T`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={a} /><Stop offset="1" stopColor={b} />
            </LinearGradient>
            <LinearGradient id={`${uid}M`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={b} /><Stop offset="1" stopColor={c} />
            </LinearGradient>
            <LinearGradient id={`${uid}B`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={b} /><Stop offset="1" stopColor={c} />
            </LinearGradient>
          </Defs>

          {/* ── Corona (parte superior) ── */}
          <Polygon points="38,18 62,18 72,32 28,32"            fill={a} opacity={0.95} />
          <Polygon points="20,44 28,32 38,18 22,36"            fill={b} opacity={0.80} />
          <Polygon points="80,44 72,32 62,18 78,36"            fill={b} opacity={0.65} />
          <Polygon points="28,32 20,44 30,46 38,32"            fill={a} opacity={0.75} />
          <Polygon points="72,32 80,44 70,46 62,32"            fill={a} opacity={0.60} />
          <Polygon points="20,44 30,46 70,46 80,44 62,32 38,32" fill={b} opacity={0.55} />

          {/* ── Cintura (girdle) ── */}
          <Polygon points="16,50 30,46 70,46 84,50 70,54 30,54" fill={c} opacity={0.90} />

          {/* ── Pabellón (parte inferior) ── */}
          <Polygon points="16,50 30,54 26,70 50,96"            fill={b} opacity={0.85} />
          <Polygon points="84,50 70,54 74,70 50,96"            fill={c} opacity={0.70} />
          <Polygon points="30,54 50,58 50,96 26,70"            fill={a} opacity={0.65} />
          <Polygon points="70,54 50,58 50,96 74,70"            fill={b} opacity={0.55} />
          <Polygon points="30,54 70,54 50,58"                  fill={a} opacity={0.80} />

          {/* ── Destellos ── */}
          <Path d="M 38 21 L 44 28 L 36 30 Z" fill="rgba(255,255,255,0.65)" />
          <Path d="M 62 24 L 58 30 L 65 27 Z" fill="rgba(255,255,255,0.35)" />
          <Path d="M 22 44 L 24 50 L 20 48 Z" fill="rgba(255,255,255,0.30)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
