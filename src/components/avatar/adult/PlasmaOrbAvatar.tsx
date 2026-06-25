/**
 * PlasmaOrbAvatar — Orbe de plasma con energía
 *
 * Muñeco sólido: UN solo Animated.View + UN solo Svg.
 * Anillo orbital y esfera se dibujan en el mismo Svg —
 * sin Animated.View separados → cero tearing garantizado.
 *
 * Animación global (squash & stretch):
 *   idle     → pulse (scale) + float (translateY)
 *   reaction → squash-stretch elástico
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, Path, RadialGradient, Stop,
} from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ─────────────────────────────────────────────────────────────────

const ORB_CORE: Record<string, string> = {
  default:                                          '#7DD3FC',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FED7AA',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6EE7B7',
  [GlucoseReactionState.REACTION_HIGH]:             '#FDE68A',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FCD34D',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#BAE6FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#DDD6FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const ORB_MID: Record<string, string> = {
  default:                                          '#0284C7',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#EF4444',
  [GlucoseReactionState.REACTION_LOW]:              '#F97316',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#10B981',
  [GlucoseReactionState.REACTION_HIGH]:             '#F59E0B',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#D97706',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#0369A1',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#7C3AED',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A21CAF',
};
const ORB_OUTER: Record<string, string> = {
  default:                                          '#075985',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#7F1D1D',
  [GlucoseReactionState.REACTION_LOW]:              '#7C2D12',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#064E3B',
  [GlucoseReactionState.REACTION_HIGH]:             '#78350F',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#451A03',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#0C4A6E',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#3B0764',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#4A044E',
};

// ── Idle config ─────────────────────────────────────────────────────────────

interface IdleConfig { pulseS: number; floatB: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { pulseS: 1.07, floatB: 3,   speed: 2000 },
  [IdleState.IDLE_2]: { pulseS: 1.09, floatB: 4.5, speed: 1500 },
  [IdleState.IDLE_3]: { pulseS: 1.05, floatB: 2,   speed: 2800 },
  [IdleState.IDLE_4]: { pulseS: 1.11, floatB: 6,   speed: 1200 },
  [IdleState.IDLE_5]: { pulseS: 1.08, floatB: 3.5, speed: 2200 },
  [IdleState.IDLE_6]: { pulseS: 1.13, floatB: 7,   speed: 1000 },
};

export function PlasmaOrbAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid   = useId().replace(/:/g, '');
  const scale = useSharedValue(1);
  const float = useSharedValue(0);
  const sqX   = useSharedValue(1);
  const sqY   = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const core   = ORB_CORE[animationState]  ?? ORB_CORE.default;
  const mid    = ORB_MID[animationState]   ?? ORB_MID.default;
  const outer  = ORB_OUTER[animationState] ?? ORB_OUTER.default;

  useEffect(() => {
    cancelAnimation(scale); cancelAnimation(float);
    cancelAnimation(sqX);   cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];

      scale.value = withRepeat(
        withSequence(
          withTiming(cfg.pulseS, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.93,        { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      float.value = withRepeat(
        withSequence(
          withTiming(-cfg.floatB, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.floatB, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.4,  { duration: 90  }),
        withTiming(0.85, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
      sqY.value = withSequence(
        withTiming(0.78, { duration: 90  }),
        withTiming(1.18, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
    }
  }, [animationState, isIdle]);

  // UN solo worklet → cero tearing
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value },
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
            <RadialGradient id={`${uid}Orb`} cx="38%" cy="35%" r="65%">
              <Stop offset="0"    stopColor={core}  stopOpacity="1" />
              <Stop offset="0.45" stopColor={mid}   stopOpacity="1" />
              <Stop offset="1"    stopColor={outer} stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id={`${uid}Glow`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={mid} stopOpacity="0.5" />
              <Stop offset="1" stopColor={mid} stopOpacity="0"   />
            </RadialGradient>
          </Defs>

          {/* Halo exterior */}
          <Circle cx={50} cy={50} r={42} fill={`url(#${uid}Glow)`} />

          {/* Anillo orbital (estático en SVG — el movimiento es del wrapper) */}
          <Ellipse cx={50} cy={50} rx={42} ry={14}
            stroke={mid} strokeWidth={3.5} fill="none" opacity={0.55}
            transform="rotate(-20 50 50)" />
          <Ellipse cx={50} cy={50} rx={42} ry={14}
            stroke={core} strokeWidth={1} fill="none" opacity={0.3}
            transform="rotate(-20 50 50)" />
          <Circle cx={8} cy={50} r={3.5} fill={core} opacity={0.9}
            transform="rotate(-20 50 50)" />

          {/* Esfera principal */}
          <Circle cx={50} cy={50} r={32} fill={`url(#${uid}Orb)`} />
          <Circle cx={50} cy={50} r={32} stroke={outer} strokeWidth={1.5}
            fill="none" opacity={0.4} />

          {/* Brillo especular */}
          <Ellipse cx={39} cy={37} rx={10} ry={7}
            fill="rgba(255,255,255,0.5)" transform="rotate(-30 39 37)" />
          <Ellipse cx={36} cy={34} rx={5}  ry={3}
            fill="rgba(255,255,255,0.7)" transform="rotate(-30 36 34)" />

          {/* Reflejos secundarios */}
          <Circle cx={62} cy={62} r={4} fill="rgba(255,255,255,0.15)" />
          <Circle cx={58} cy={66} r={2} fill="rgba(255,255,255,0.10)" />

          {/* Partículas de plasma */}
          <Circle cx={68} cy={28} r={2.5} fill={core} opacity={0.8} />
          <Circle cx={76} cy={38} r={1.8} fill={core} opacity={0.6} />
          <Circle cx={72} cy={20} r={1.5} fill={core} opacity={0.5} />
          <Circle cx={28} cy={72} r={2}   fill={core} opacity={0.5} />
          <Circle cx={22} cy={62} r={1.5} fill={core} opacity={0.4} />

          {/* Arcos de plasma */}
          <Path d="M 70 30 Q 78 42 74 55"
            stroke={core} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.6} />
          <Path d="M 30 70 Q 22 58 26 45"
            stroke={core} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.4} />
        </Svg>
      </Animated.View>
    </View>
  );
}
