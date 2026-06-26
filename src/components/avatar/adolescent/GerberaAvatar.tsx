/**
 * GerberaAvatar — Gerbera azul cobalto — v2
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 * Las 3 coronas de pétalos se dibujan estáticamente en SVG nativo
 * (sin Animated.View por capa — SVG compone en GPU sin tearing).
 *
 * Animación global (squash & stretch):
 *   idle     → sway (rotate) + breathing (scale)
 *   reaction → squash-stretch elástico + shake
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ─────────────────────────────────────────────────────────────────

const OUTER_COLOR: Record<string, string> = {
  default:                                          '#2563EB',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#DC2626',
  [GlucoseReactionState.REACTION_LOW]:              '#EF4444',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#059669',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#0369A1',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#6D28D9',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#7C3AED',
};
const MID_COLOR: Record<string, string> = {
  default:                                          '#3B82F6',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#F87171',
  [GlucoseReactionState.REACTION_LOW]:              '#FCA5A5',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#34D399',
  [GlucoseReactionState.REACTION_HIGH]:             '#FBBF24',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#F59E0B',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#38BDF8',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#818CF8',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A78BFA',
};
const INNER_COLOR: Record<string, string> = {
  default:                                          '#93C5FD',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FDE68A',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FEF3C7',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FEF9C3',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#BAE6FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#DDD6FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const CENTER_COLOR: Record<string, string> = {
  default:                                          '#1E3A5F',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#7F1D1D',
  [GlucoseReactionState.REACTION_LOW]:              '#92400E',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#064E3B',
  [GlucoseReactionState.REACTION_HIGH]:             '#78350F',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#713F12',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#1E40AF',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#4C1D95',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#581C87',
};

// ── Idle config ─────────────────────────────────────────────────────────────

interface IdleConfig { swayA: number; breathS: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 3,  breathS: 1.04, speed: 1400 },
  [IdleState.IDLE_2]: { swayA: 5,  breathS: 1.06, speed: 1000 },
  [IdleState.IDLE_3]: { swayA: 2,  breathS: 1.02, speed: 2000 },
  [IdleState.IDLE_4]: { swayA: 7,  breathS: 1.08, speed: 800  },
  [IdleState.IDLE_5]: { swayA: 4,  breathS: 1.05, speed: 1200 },
  [IdleState.IDLE_6]: { swayA: 9,  breathS: 1.10, speed: 650  },
};

// ── Generador de pétalo Path (forma lanceolada bezier) ─────────────────────

function petalPath(baseY: number, tipY: number, width: number): string {
  const cx   = 50;
  const midY = baseY - (baseY - tipY) * 0.35;
  const cpYl = baseY - (baseY - tipY) * 0.15;
  return [
    `M ${cx} ${baseY}`,
    `C ${cx - width * 0.3} ${cpYl}, ${cx - width} ${midY}, ${cx - width * 0.4} ${tipY}`,
    `C ${cx - width * 0.15} ${tipY - 1}, ${cx + width * 0.15} ${tipY - 1}, ${cx + width * 0.4} ${tipY}`,
    `C ${cx + width} ${midY}, ${cx + width * 0.3} ${cpYl}, ${cx} ${baseY}`,
    'Z',
  ].join(' ');
}

const OUTER_PATH = petalPath(50, 6,  6);
const MID_PATH   = petalPath(50, 14, 7.5);
const INNER_PATH = petalPath(50, 23, 7);

const OUTER_ANGLES = Array.from({ length: 16 }, (_, i) => (360 / 16) * i);
const MID_ANGLES   = Array.from({ length: 12 }, (_, i) => (360 / 12) * i + 15);
const INNER_ANGLES = Array.from({ length: 8  }, (_, i) => (360 / 8)  * i + 7);

const SEED_RING1 = Array.from({ length: 8  }, (_, i) => ({ angle: (360 / 8)  * i,      r: 6.5  }));
const SEED_RING2 = Array.from({ length: 12 }, (_, i) => ({ angle: (360 / 12) * i + 15, r: 10.5 }));

export function GerberaAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid   = useId().replace(/:/g, '');
  const sway  = useSharedValue(0);
  const scale = useSharedValue(1);
  const sqX   = useSharedValue(1);
  const sqY   = useSharedValue(1);

  const isIdle  = Object.values(IdleState).includes(animationState as IdleState);
  const outerC  = OUTER_COLOR[animationState]  ?? OUTER_COLOR.default;
  const midC    = MID_COLOR[animationState]    ?? MID_COLOR.default;
  const innerC  = INNER_COLOR[animationState]  ?? INNER_COLOR.default;
  const centerC = CENTER_COLOR[animationState] ?? CENTER_COLOR.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(scale);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed * 1.3, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed * 1.3, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(cfg.breathS, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(1,            { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.30, { duration: 100 }),
        withTiming(0.85, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sqY.value = withSequence(
        withTiming(0.80, { duration: 100 }),
        withTiming(1.18, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sway.value = withSequence(
        withTiming(-12, { duration: 80  }),
        withTiming( 12, { duration: 80  }),
        withTiming( -5, { duration: 60  }),
        withTiming(  0, { duration: 130 }),
      );
    }
  }, [animationState, isIdle]);

  // UN solo worklet → cero tearing
  const animStyle = useAnimatedStyle(() => ({
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
            <RadialGradient id={`${uid}C`} cx="40%" cy="35%" r="65%">
              <Stop offset="0"   stopColor={midC}    stopOpacity="0.5" />
              <Stop offset="0.5" stopColor={centerC} stopOpacity="1"   />
              <Stop offset="1"   stopColor={centerC} stopOpacity="1"   />
            </RadialGradient>
          </Defs>

          {/* ── Corona exterior — 16 pétalos largos ── */}
          {OUTER_ANGLES.map((angle, i) => (
            <G key={`o${i}`} transform={`rotate(${angle}, 50, 50)`}>
              <Path d={OUTER_PATH} fill={outerC} opacity={0.92} />
              <Path d="M 50 50 L 50 8"
                stroke="rgba(255,255,255,0.2)" strokeWidth={0.6} fill="none" />
            </G>
          ))}

          {/* ── Corona media — 12 pétalos ── */}
          {MID_ANGLES.map((angle, i) => (
            <G key={`m${i}`} transform={`rotate(${angle}, 50, 50)`}>
              <Path d={MID_PATH} fill={midC} opacity={0.88} />
              <Path d="M 50 50 L 50 16"
                stroke="rgba(255,255,255,0.18)" strokeWidth={0.5} fill="none" />
            </G>
          ))}

          {/* ── Corona interior — 8 pétalos cortos ── */}
          {INNER_ANGLES.map((angle, i) => (
            <G key={`i${i}`} transform={`rotate(${angle}, 50, 50)`}>
              <Path d={INNER_PATH} fill={innerC} opacity={0.85} />
            </G>
          ))}

          {/* ── Centro — halo + disco ── */}
          <Circle cx={50} cy={50} r={16}   fill={innerC}          opacity={0.3} />
          <Circle cx={50} cy={50} r={13.5} fill={`url(#${uid}C)`} />

          {/* Semillas externas (12) */}
          {SEED_RING2.map((s, i) => {
            const rad = (s.angle * Math.PI) / 180;
            return (
              <Circle key={`s2${i}`}
                cx={50 + Math.sin(rad) * s.r}
                cy={50 - Math.cos(rad) * s.r}
                r={1.3} fill="#FCD34D" opacity={0.85} />
            );
          })}

          {/* Semillas internas (8) */}
          {SEED_RING1.map((s, i) => {
            const rad = (s.angle * Math.PI) / 180;
            return (
              <Circle key={`s1${i}`}
                cx={50 + Math.sin(rad) * s.r}
                cy={50 - Math.cos(rad) * s.r}
                r={1.1} fill="#FBBF24" opacity={0.9} />
            );
          })}

          {/* Semilla central */}
          <Circle cx={50} cy={50} r={2.5} fill="#F59E0B" opacity={0.95} />
          <Circle cx={50} cy={50} r={1}   fill="#FBBF24" />

          {/* Brillo especular */}
          <Circle cx={45} cy={44} r={2.8} fill="rgba(255,255,255,0.30)" />
          <Circle cx={43} cy={42} r={1.2} fill="rgba(255,255,255,0.45)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
