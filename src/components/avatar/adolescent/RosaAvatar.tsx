/**
 * RosaAvatar — Rosa amarilla dorada
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 *
 * Animación global (squash & stretch):
 *   idle     → sway suave (rotate) + breathing (scale)
 *   reaction → squash-stretch elástico + shake
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ────────────────────────────────────────────────────────────────────

const PETAL_OUTER: Record<string, string> = {
  default:                                          '#FBBF24',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#EF4444',
  [GlucoseReactionState.REACTION_LOW]:              '#F87171',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#34D399',
  [GlucoseReactionState.REACTION_HIGH]:             '#F59E0B',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#D97706',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#60A5FA',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#818CF8',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#C084FC',
};
const PETAL_MID: Record<string, string> = {
  default:                                          '#FDE68A',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FCD34D',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FEF3C7',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FDE68A',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#BAE6FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#DDD6FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const PETAL_INNER: Record<string, string> = {
  default:                                          '#F59E0B',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#DC2626',
  [GlucoseReactionState.REACTION_LOW]:              '#F87171',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#10B981',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#3B82F6',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#6366F1',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#9333EA',
};
const CENTER_COLOR: Record<string, string> = {
  default:                                          '#92400E',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#7F1D1D',
  [GlucoseReactionState.REACTION_LOW]:              '#991B1B',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#065F46',
  [GlucoseReactionState.REACTION_HIGH]:             '#78350F',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#713F12',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#1E3A8A',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#4C1D95',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#6B21A8',
};

// ── Idle config ────────────────────────────────────────────────────────────────

interface IdleConfig { swayA: number; breathS: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 3,  breathS: 1.05, speed: 1800 },
  [IdleState.IDLE_2]: { swayA: 5,  breathS: 1.07, speed: 1200 },
  [IdleState.IDLE_3]: { swayA: 2,  breathS: 1.03, speed: 2600 },
  [IdleState.IDLE_4]: { swayA: 7,  breathS: 1.09, speed: 900  },
  [IdleState.IDLE_5]: { swayA: 4,  breathS: 1.06, speed: 1500 },
  [IdleState.IDLE_6]: { swayA: 8,  breathS: 1.10, speed: 760  },
};

// ── Pétalos en espiral ─────────────────────────────────────────────────────────

function petalPath(
  cx: number, cy: number, angle: number, len: number, width: number, curl: number,
): string {
  const rad  = (angle - 90) * (Math.PI / 180);
  const tipX = cx + Math.cos(rad) * len;
  const tipY = cy + Math.sin(rad) * len;
  const perpX = -Math.sin(rad);
  const perpY =  Math.cos(rad);
  const cpLen = len * (0.5 + curl * 0.3);
  const cp1x = cx + Math.cos(rad) * cpLen * 0.4 + perpX * width * 0.8;
  const cp1y = cy + Math.sin(rad) * cpLen * 0.4 + perpY * width * 0.8;
  const cp2x = tipX - Math.cos(rad) * cpLen * 0.3 + perpX * width * 0.5;
  const cp2y = tipY - Math.sin(rad) * cpLen * 0.3 + perpY * width * 0.5;
  const cp3x = cx + Math.cos(rad) * cpLen * 0.4 - perpX * width * 0.8;
  const cp3y = cy + Math.sin(rad) * cpLen * 0.4 - perpY * width * 0.8;
  const cp4x = tipX - Math.cos(rad) * cpLen * 0.3 - perpX * width * 0.5;
  const cp4y = tipY - Math.sin(rad) * cpLen * 0.3 - perpY * width * 0.5;
  return [
    `M ${cx} ${cy}`,
    `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tipX} ${tipY}`,
    `C ${cp4x} ${cp4y}, ${cp3x} ${cp3y}, ${cx} ${cy}`,
    'Z',
  ].join(' ');
}

const PETAL_RINGS = [
  { n: 5, len: 46, w: 13, offset: 0,  curl: 0.6  },
  { n: 5, len: 36, w: 11, offset: 36, curl: 0.5  },
  { n: 5, len: 27, w: 9,  offset: 18, curl: 0.45 },
  { n: 5, len: 19, w: 7,  offset: 54, curl: 0.35 },
  { n: 4, len: 12, w: 5,  offset: 9,  curl: 0.25 },
];

export function RosaAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid   = useId().replace(/:/g, '');
  const sway  = useSharedValue(0);
  const scale = useSharedValue(1);
  const sqX   = useSharedValue(1);
  const sqY   = useSharedValue(1);

  const isIdle      = Object.values(IdleState).includes(animationState as IdleState);
  const colorOuter  = PETAL_OUTER[animationState]  ?? PETAL_OUTER.default;
  const colorMid    = PETAL_MID[animationState]    ?? PETAL_MID.default;
  const colorInner  = PETAL_INNER[animationState]  ?? PETAL_INNER.default;
  const colorCenter = CENTER_COLOR[animationState] ?? CENTER_COLOR.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(scale);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(cfg.breathS, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.97,         { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.30, { duration: 110 }),
        withTiming(0.88, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sqY.value = withSequence(
        withTiming(0.82, { duration: 110 }),
        withTiming(1.15, { duration: 90  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sway.value = withSequence(
        withTiming(-14, { duration: 80  }),
        withTiming( 14, { duration: 80  }),
        withTiming( -6, { duration: 60  }),
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

  const ringColors = [colorOuter, colorOuter, colorMid, colorInner, colorInner];
  const cx = 50, cy = 50;

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={[{ width: size, height: size }, animStyle]}
        collapsable={false}
        renderToHardwareTextureAndroid
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`${uid}RC`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={colorCenter} stopOpacity="1" />
              <Stop offset="100%" stopColor={colorInner}  stopOpacity="1" />
            </RadialGradient>
          </Defs>

          {/* Sombra suave */}
          <Circle cx={cx} cy={cy + 2} r={44} fill="rgba(0,0,0,0.08)" />

          {/* Anillos de pétalos */}
          {PETAL_RINGS.map((ring, ri) =>
            Array.from({ length: ring.n }, (_, pi) => {
              const angle = (360 / ring.n) * pi + ring.offset;
              return (
                <Path
                  key={`r${ri}p${pi}`}
                  d={petalPath(cx, cy, angle, ring.len, ring.w, ring.curl)}
                  fill={ringColors[ri]}
                  opacity={0.92 - ri * 0.04}
                />
              );
            })
          )}

          {/* Centro */}
          <Circle cx={cx} cy={cy} r={8} fill={`url(#${uid}RC)`} />

          {/* Brillo especular */}
          <Circle cx={cx - 16} cy={cy - 16} r={5}   fill="rgba(255,255,255,0.25)" />
          <Circle cx={cx - 10} cy={cy - 10} r={2.5} fill="rgba(255,255,255,0.35)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
