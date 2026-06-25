/**
 * OrigamiAvatar — Grulla de origami (tsuru)
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 * Alas, cuerpo y cabeza se dibujan en el mismo Svg —
 * sin Animated.View separados → cero tearing garantizado.
 *
 * Animación global (squash & stretch):
 *   idle     → sway (rotate, simula planeando) + float (translateY)
 *   reaction → aleteo brusco (squash-stretch) + shake
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

const PAPER_LIGHT: Record<string, string> = {
  default:                                          '#E2E8F0',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FEE2E2',
  [GlucoseReactionState.REACTION_LOW]:              '#FEF3C7',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#D1FAE5',
  [GlucoseReactionState.REACTION_HIGH]:             '#FEF9C3',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FEF3C7',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#DBEAFE',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#EDE9FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#FCE7F3',
};
const PAPER_MID: Record<string, string> = {
  default:                                          '#94A3B8',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FCD34D',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FDE68A',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FCD34D',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#93C5FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#C4B5FD',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F9A8D4',
};
const PAPER_DARK: Record<string, string> = {
  default:                                          '#475569',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#DC2626',
  [GlucoseReactionState.REACTION_LOW]:              '#D97706',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#059669',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#2563EB',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#7C3AED',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#DB2777',
};

// ── Idle config ─────────────────────────────────────────────────────────────

interface IdleConfig { swayA: number; floatB: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 5,  floatB: 2,   speed: 1800 },
  [IdleState.IDLE_2]: { swayA: 8,  floatB: 3.5, speed: 1300 },
  [IdleState.IDLE_3]: { swayA: 3,  floatB: 1,   speed: 2500 },
  [IdleState.IDLE_4]: { swayA: 12, floatB: 5,   speed: 900  },
  [IdleState.IDLE_5]: { swayA: 7,  floatB: 2.5, speed: 1600 },
  [IdleState.IDLE_6]: { swayA: 15, floatB: 6,   speed: 750  },
};

export function OrigamiAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid   = useId().replace(/:/g, '');
  const sway  = useSharedValue(0);
  const float = useSharedValue(0);
  const sqX   = useSharedValue(1);
  const sqY   = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const light  = PAPER_LIGHT[animationState] ?? PAPER_LIGHT.default;
  const mid    = PAPER_MID[animationState]   ?? PAPER_MID.default;
  const dark   = PAPER_DARK[animationState]  ?? PAPER_DARK.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(float);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      float.value = withRepeat(
        withSequence(
          withTiming(-cfg.floatB, { duration: cfg.speed * 1.5, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.floatB, { duration: cfg.speed * 1.5, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      // Aleteo brusco: squash horizontal (alas abiertas) → stretch vertical
      sqX.value = withSequence(
        withTiming(1.35, { duration: 90  }),
        withTiming(0.82, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sqY.value = withSequence(
        withTiming(0.78, { duration: 90  }),
        withTiming(1.20, { duration: 80  }),
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
      { translateY: float.value },
      { rotate: `${sway.value}deg` },
      { scaleX: sqX.value },
      { scaleY: sqY.value },
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
            <LinearGradient id={`${uid}WL`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={light} /><Stop offset="1" stopColor={mid} />
            </LinearGradient>
            <LinearGradient id={`${uid}WR`} x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={light} /><Stop offset="1" stopColor={mid} />
            </LinearGradient>
            <LinearGradient id={`${uid}Bd`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={light} /><Stop offset="1" stopColor={mid} />
            </LinearGradient>
          </Defs>

          {/* ── Ala izquierda — 3 planos de papel ── */}
          <Polygon points="50,52 8,36 18,58"  fill={`url(#${uid}WL)`} opacity={0.95} />
          <Polygon points="50,52 8,36 16,46"  fill={mid}               opacity={0.55} />
          <Polygon points="50,52 18,58 12,68" fill={dark}              opacity={0.40} />
          <Path d="M 50 52 L 12 46" stroke={dark} strokeWidth={0.8} fill="none" opacity={0.5} />
          <Path d="M 16 46 L 18 58" stroke={dark} strokeWidth={0.6} fill="none" opacity={0.4} />
          <Polygon points="8,36 4,30 14,38"   fill={mid} opacity={0.8} />

          {/* ── Ala derecha — 3 planos de papel ── */}
          <Polygon points="50,52 92,36 82,58"  fill={`url(#${uid}WR)`} opacity={0.90} />
          <Polygon points="50,52 92,36 84,46"  fill={mid}               opacity={0.50} />
          <Polygon points="50,52 82,58 88,68"  fill={dark}              opacity={0.35} />
          <Path d="M 50 52 L 88 46" stroke={dark} strokeWidth={0.8} fill="none" opacity={0.5} />
          <Path d="M 84 46 L 82 58" stroke={dark} strokeWidth={0.6} fill="none" opacity={0.4} />
          <Polygon points="92,36 96,30 86,38"  fill={mid} opacity={0.75} />

          {/* ── Cuerpo — rombo central ── */}
          <Polygon points="50,30 68,52 50,72 32,52" fill={`url(#${uid}Bd)`} opacity={0.97} />
          <Path d="M 50 30 L 50 72" stroke={mid} strokeWidth={0.8} fill="none" opacity={0.5} />
          <Path d="M 32 52 L 68 52" stroke={mid} strokeWidth={0.6} fill="none" opacity={0.4} />
          <Polygon points="50,30 32,52 50,72"        fill={mid}   opacity={0.25} />

          {/* ── Cola ── */}
          <Polygon points="50,72 44,86 50,78 56,86"  fill={light} opacity={0.9} />
          <Polygon points="50,72 44,86 50,78"         fill={mid}   opacity={0.4} />

          {/* ── Cuello ── */}
          <Polygon points="50,30 46,18 54,14 54,30"  fill={light} opacity={0.9} />
          <Polygon points="50,30 46,18 50,30"         fill={mid}   opacity={0.3} />

          {/* ── Cabeza ── */}
          <Polygon points="46,18 54,14 56,8 50,6 44,8" fill={light} opacity={0.95} />
          <Polygon points="46,18 50,6 44,8"             fill={mid}   opacity={0.35} />

          {/* ── Pico ── */}
          <Polygon points="54,14 62,10 56,16"  fill={dark} opacity={0.85} />
          <Path d="M 54 14 L 62 10" stroke={dark} strokeWidth={0.8} fill="none" />

          {/* ── Ojo ── */}
          <Path d="M 49 10 Q 51 8 53 10"
            stroke={dark} strokeWidth={1.2} fill="none" strokeLinecap="round" />

          {/* ── Línea de pliegue cabeza ── */}
          <Path d="M 50 6 L 50 18" stroke={mid} strokeWidth={0.6} fill="none" opacity={0.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}
