/**
 * TulipanAvatar — Tulipán coral/salmón
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 *
 * Animación global (squash & stretch):
 *   idle     → sway (rotate, simula tallo meciéndose) + breathing (scaleY)
 *   reaction → squash-stretch elástico + shake
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ────────────────────────────────────────────────────────────────────

const PETAL_BASE: Record<string, string> = {
  default:                                          '#F97066',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#EF4444',
  [GlucoseReactionState.REACTION_LOW]:              '#FB923C',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#34D399',
  [GlucoseReactionState.REACTION_HIGH]:             '#FBBF24',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#F59E0B',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#60A5FA',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#A78BFA',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#E879F9',
};
const PETAL_LIGHT: Record<string, string> = {
  default:                                          '#FCA48E',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FED7AA',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FDE68A',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FEF3C7',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#BAE6FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#DDD6FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const PETAL_DARK: Record<string, string> = {
  default:                                          '#E8533A',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#B91C1C',
  [GlucoseReactionState.REACTION_LOW]:              '#C2410C',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#059669',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#2563EB',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#6D28D9',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A21CAF',
};

// ── Idle config ────────────────────────────────────────────────────────────────

interface IdleConfig { swayA: number; breathSY: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 2,  breathSY: 1.06, speed: 1600 },
  [IdleState.IDLE_2]: { swayA: 4,  breathSY: 1.08, speed: 1100 },
  [IdleState.IDLE_3]: { swayA: 1,  breathSY: 1.04, speed: 2200 },
  [IdleState.IDLE_4]: { swayA: 6,  breathSY: 1.10, speed: 800  },
  [IdleState.IDLE_5]: { swayA: 3,  breathSY: 1.07, speed: 1400 },
  [IdleState.IDLE_6]: { swayA: 8,  breathSY: 1.12, speed: 700  },
};

export function TulipanAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid  = useId().replace(/:/g, '');
  const sway = useSharedValue(0);
  const scY  = useSharedValue(1);
  const sqX  = useSharedValue(1);
  const sqY  = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const base   = PETAL_BASE[animationState]  ?? PETAL_BASE.default;
  const light  = PETAL_LIGHT[animationState] ?? PETAL_LIGHT.default;
  const dark   = PETAL_DARK[animationState]  ?? PETAL_DARK.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(scY);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      sway.value = withRepeat(
        withSequence(
          withTiming( cfg.swayA, { duration: cfg.speed * 1.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(-cfg.swayA, { duration: cfg.speed * 1.5, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      scY.value = withRepeat(
        withSequence(
          withTiming(cfg.breathSY, { duration: cfg.speed * 0.45, easing: Easing.out(Easing.sin) }),
          withTiming(1,             { duration: cfg.speed * 0.55, easing: Easing.in(Easing.sin)  }),
        ), -1,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.25, { duration: 110 }),
        withTiming(0.85, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sqY.value = withSequence(
        withTiming(0.80, { duration: 110 }),
        withTiming(1.20, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sway.value = withSequence(
        withTiming(-14, { duration: 80  }),
        withTiming( 14, { duration: 80  }),
        withTiming( -6, { duration: 70  }),
        withTiming(  0, { duration: 140 }),
      );
    }
  }, [animationState, isIdle]);

  // UN solo worklet → cero tearing
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${sway.value}deg` },
      { scaleX: sqX.value },
      { scaleY: sqY.value * scY.value },
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
            <LinearGradient id={`${uid}St`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0"   stopColor="#16A34A" />
              <Stop offset="0.5" stopColor="#22C55E" />
              <Stop offset="1"   stopColor="#15803D" />
            </LinearGradient>
            <LinearGradient id={`${uid}Lf`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#4ADE80" />
              <Stop offset="1" stopColor="#16A34A" />
            </LinearGradient>
          </Defs>

          {/* ── Tallo ── */}
          <Path d="M 50 62 Q 49 75 48 92" stroke={`url(#${uid}St)`} strokeWidth={3.5}
            fill="none" strokeLinecap="round" />

          {/* ── Hoja izquierda ── */}
          <Path d="M 49 74 C 38 70 28 60 32 50 C 36 56 42 65 49 70 Z"
            fill={`url(#${uid}Lf)`} opacity={0.95} />
          <Path d="M 49 74 C 40 67 33 57 32 50"
            stroke="#15803D" strokeWidth={0.8} fill="none" opacity={0.6} />

          {/* ── Hoja derecha ── */}
          <Path d="M 50 78 C 61 74 71 64 67 54 C 63 60 57 69 50 75 Z"
            fill={`url(#${uid}Lf)`} opacity={0.85} />
          <Path d="M 50 78 C 59 71 65 62 67 54"
            stroke="#15803D" strokeWidth={0.8} fill="none" opacity={0.5} />

          {/* ── Sépalos ── */}
          <Path d="M 42 60 C 40 52 42 44 50 40 C 58 44 60 52 58 60 Z"
            fill="#16A34A" opacity={0.7} />
          <Path d="M 44 62 C 38 55 36 46 42 40" stroke="#15803D" strokeWidth={1} fill="none" opacity={0.5} />
          <Path d="M 56 62 C 62 55 64 46 58 40" stroke="#15803D" strokeWidth={1} fill="none" opacity={0.5} />

          {/* ── Pétalos traseros (3) ── */}
          <Path d="M 50 60 C 36 56 26 42 30 24 C 33 16 40 13 44 18 C 47 22 48 34 50 42 Z"
            fill={dark} opacity={0.88} />
          <Path d="M 50 60 C 40 46 33 28 30 24" stroke={base} strokeWidth={0.7} fill="none" opacity={0.5} />

          <Path d="M 50 58 C 44 46 43 28 50 15 C 57 28 56 46 50 58 Z"
            fill={dark} opacity={0.80} />
          <Path d="M 50 58 C 50 44 50 28 50 15" stroke={light} strokeWidth={0.7} fill="none" opacity={0.5} />

          <Path d="M 50 60 C 64 56 74 42 70 24 C 67 16 60 13 56 18 C 53 22 52 34 50 42 Z"
            fill={dark} opacity={0.88} />
          <Path d="M 50 60 C 60 46 67 28 70 24" stroke={base} strokeWidth={0.7} fill="none" opacity={0.5} />

          {/* ── Pétalos delanteros (3) ── */}
          <Path d="M 50 63 C 34 59 22 46 26 28 C 29 18 37 14 42 20 C 46 25 47 40 50 52 Z"
            fill={base} opacity={0.95} />
          <Path d="M 47 40 C 42 35 36 26 37 20"
            stroke={light} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.55} />
          <Path d="M 50 63 C 38 56 30 40 32 26" stroke={dark} strokeWidth={0.6} fill="none" opacity={0.3} />

          <Path d="M 50 63 C 66 59 78 46 74 28 C 71 18 63 14 58 20 C 54 25 53 40 50 52 Z"
            fill={base} opacity={0.95} />
          <Path d="M 53 40 C 58 35 64 26 63 20"
            stroke={light} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.55} />
          <Path d="M 50 63 C 62 56 70 40 68 26" stroke={dark} strokeWidth={0.6} fill="none" opacity={0.3} />

          <Path d="M 50 64 C 43 52 42 32 50 18 C 58 32 57 52 50 64 Z"
            fill={light} opacity={0.92} />
          <Path d="M 50 64 C 50 48 50 30 50 18" stroke={base} strokeWidth={0.9} fill="none" opacity={0.5} />
          <Path d="M 47 50 C 46 42 46 32 48 22"
            stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} fill="none" strokeLinecap="round" />

          {/* ── Pistilo / estambre ── */}
          <Ellipse cx={50} cy={35} rx={4} ry={2.5} fill="#FDE68A" opacity={0.9} />
          <Circle  cx={50} cy={33} r={2.2} fill="#FBBF24" />
          <Circle  cx={50} cy={33} r={1}   fill="#92400E" />
          <Path d="M 47 36 C 46 32 47 29 47 27" stroke="#FCD34D" strokeWidth={0.8} fill="none" />
          <Path d="M 50 36 C 50 32 50 28 50 26" stroke="#FCD34D" strokeWidth={0.8} fill="none" />
          <Path d="M 53 36 C 54 32 53 29 53 27" stroke="#FCD34D" strokeWidth={0.8} fill="none" />
          <Circle cx={47} cy={27} r={1}   fill="#FBBF24" />
          <Circle cx={50} cy={26} r={1.2} fill="#FBBF24" />
          <Circle cx={53} cy={27} r={1}   fill="#FBBF24" />
        </Svg>
      </Animated.View>
    </View>
  );
}
