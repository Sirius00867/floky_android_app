/**
 * OsoAvatar — Peluche de oso sentado
 *
 * Bloque 100 % sólido: UN Animated.View + UN Svg.
 * Sin capas articuladas → cero tearing garantizado.
 *
 * Animación global:
 *   idle     → sway (rotate) + breathing (scaleY)
 *   reaction → apretón squash-stretch + shake
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient,
  Path, RadialGradient, Stop,
} from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ──────────────────────────────────────────────────────────────────

const FUR: Record<string, string> = {
  default:                                          '#C68642',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#B45309',
  [GlucoseReactionState.REACTION_LOW]:              '#D97706',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#6B8B3A',
  [GlucoseReactionState.REACTION_HIGH]:             '#B45309',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#92400E',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#5B7FA6',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#7C5B9E',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#C25B8A',
};
const FUR_DARK: Record<string, string> = {
  default:                                          '#9A5F24',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#78350F',
  [GlucoseReactionState.REACTION_LOW]:              '#92400E',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#3F5C1E',
  [GlucoseReactionState.REACTION_HIGH]:             '#78350F',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#5F2806',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#2C4F78',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#4E3070',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#872556',
};
const FUR_LIGHT: Record<string, string> = {
  default:                                          '#E8A96A',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#F59E0B',
  [GlucoseReactionState.REACTION_LOW]:              '#FCD34D',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#86BA56',
  [GlucoseReactionState.REACTION_HIGH]:             '#FCD34D',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#D97706',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#7CB2E0',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#A882CC',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F08CB0',
};

const MUZZLE = '#F5E6D3';

// ── Configuración idle ─────────────────────────────────────────────────────

interface IdleConfig { swayA: number; breathSY: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 3, breathSY: 1.02, speed: 1400 },
  [IdleState.IDLE_2]: { swayA: 5, breathSY: 1.03, speed: 1000 },
  [IdleState.IDLE_3]: { swayA: 2, breathSY: 1.01, speed: 2000 },
  [IdleState.IDLE_4]: { swayA: 7, breathSY: 1.04, speed: 800  },
  [IdleState.IDLE_5]: { swayA: 4, breathSY: 1.02, speed: 1200 },
  [IdleState.IDLE_6]: { swayA: 9, breathSY: 1.05, speed: 650  },
};

export function OsoAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid  = useId().replace(/:/g, '');
  const sway = useSharedValue(0);
  const scY  = useSharedValue(1);
  const sqX  = useSharedValue(1);
  const sqY  = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const fur  = FUR[animationState]       ?? FUR.default;
  const dark = FUR_DARK[animationState]  ?? FUR_DARK.default;
  const lite = FUR_LIGHT[animationState] ?? FUR_LIGHT.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(scY);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];
      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed * 1.4, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      scY.value = withRepeat(
        withSequence(
          withTiming(cfg.breathSY, { duration: cfg.speed * 1.2, easing: Easing.inOut(Easing.sin) }),
          withTiming(1,             { duration: cfg.speed * 1.2, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      sqX.value = withSequence(
        withTiming(1.3,  { duration: 90  }),
        withTiming(0.82, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sqY.value = withSequence(
        withTiming(0.78, { duration: 90  }),
        withTiming(1.18, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 160 }),
      );
      sway.value = withSequence(
        withTiming(-12, { duration: 80  }),
        withTiming( 12, { duration: 80  }),
        withTiming( -6, { duration: 60  }),
        withTiming(  0, { duration: 130 }),
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
            <RadialGradient id={`${uid}F`} cx="40%" cy="35%" r="70%">
              <Stop offset="0"   stopColor={lite} />
              <Stop offset="0.6" stopColor={fur}  />
              <Stop offset="1"   stopColor={dark} />
            </RadialGradient>
            <RadialGradient id={`${uid}H`} cx="40%" cy="35%" r="65%">
              <Stop offset="0"   stopColor={lite} />
              <Stop offset="0.7" stopColor={fur}  />
              <Stop offset="1"   stopColor={dark} />
            </RadialGradient>
            <RadialGradient id={`${uid}N`} cx="35%" cy="30%" r="65%">
              <Stop offset="0" stopColor="#6B4226" />
              <Stop offset="1" stopColor="#3D1F0A" />
            </RadialGradient>
            <RadialGradient id={`${uid}P`} cx="50%" cy="40%" r="60%">
              <Stop offset="0" stopColor={MUZZLE}  />
              <Stop offset="1" stopColor="#D4B896" />
            </RadialGradient>
            <LinearGradient id={`${uid}Bow`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#DC2626" />
              <Stop offset="1" stopColor="#EF4444" />
            </LinearGradient>
          </Defs>

          {/* ── Orejas (detrás) ── */}
          <Circle cx={28} cy={22} r={12}  fill={fur}  />
          <Circle cx={72} cy={22} r={12}  fill={fur}  />
          <Circle cx={28} cy={22} r={7.5} fill={lite} />
          <Circle cx={72} cy={22} r={7.5} fill={lite} />
          <Circle cx={28} cy={22} r={4}   fill="#F9C0A0" opacity={0.8} />
          <Circle cx={72} cy={22} r={4}   fill="#F9C0A0" opacity={0.8} />

          {/* ── Brazos laterales ── */}
          <Ellipse cx={22} cy={72} rx={9} ry={14} fill={fur} transform="rotate(-12 22 72)" />
          <Ellipse cx={78} cy={72} rx={9} ry={14} fill={fur} transform="rotate(12 78 72)"  />

          {/* ── Cuerpo ── */}
          <Ellipse cx={50} cy={70} rx={30} ry={26} fill={`url(#${uid}F)`} />
          <Ellipse cx={50} cy={74} rx={18} ry={18} fill={MUZZLE} opacity={0.55} />

          {/* ── Pata izquierda ── */}
          <Ellipse cx={28} cy={88} rx={12} ry={8}   fill={fur} />
          <Ellipse cx={28} cy={91} rx={10} ry={5.5} fill={`url(#${uid}P)`} />
          <Circle cx={23} cy={89} r={1.8} fill="#C4956A" opacity={0.7} />
          <Circle cx={28} cy={88} r={1.8} fill="#C4956A" opacity={0.7} />
          <Circle cx={33} cy={89} r={1.8} fill="#C4956A" opacity={0.7} />
          <Ellipse cx={28} cy={93} rx={3} ry={2} fill="#C4956A" opacity={0.5} />

          {/* ── Pata derecha ── */}
          <Ellipse cx={72} cy={88} rx={12} ry={8}   fill={fur} />
          <Ellipse cx={72} cy={91} rx={10} ry={5.5} fill={`url(#${uid}P)`} />
          <Circle cx={67} cy={89} r={1.8} fill="#C4956A" opacity={0.7} />
          <Circle cx={72} cy={88} r={1.8} fill="#C4956A" opacity={0.7} />
          <Circle cx={77} cy={89} r={1.8} fill="#C4956A" opacity={0.7} />
          <Ellipse cx={72} cy={93} rx={3} ry={2} fill="#C4956A" opacity={0.5} />

          {/* ── Cabeza ── */}
          <Circle cx={50} cy={36} r={26} fill={`url(#${uid}H)`} />

          {/* Morro */}
          <Ellipse cx={50} cy={46} rx={14} ry={10} fill={MUZZLE} />
          <Ellipse cx={50} cy={44} rx={12} ry={7.5} fill={MUZZLE} opacity={0.45} />

          {/* Nariz */}
          <Ellipse cx={50} cy={40} rx={6} ry={4.5} fill={`url(#${uid}N)`} />
          <Ellipse cx={48} cy={38.5} rx={2} ry={1.4}
            fill="rgba(255,255,255,0.50)" transform="rotate(-20 48 38.5)" />
          <Circle cx={52} cy={40} r={0.8} fill="rgba(255,255,255,0.35)" />

          {/* Philtrum + sonrisa */}
          <Path d="M 50 44.5 L 50 49"
            stroke={dark} strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
          <Path d="M 42 50 Q 50 58 58 50"
            stroke={dark} strokeWidth={2} fill="none" strokeLinecap="round" />

          {/* Ojos de botón */}
          <Circle cx={38} cy={32} r={5.5} fill="white"   />
          <Circle cx={62} cy={32} r={5.5} fill="white"   />
          <Circle cx={38} cy={32} r={4}   fill="#3D1F0A" />
          <Circle cx={62} cy={32} r={4}   fill="#3D1F0A" />
          <Circle cx={38} cy={32} r={2.2} fill="#0F0A06" />
          <Circle cx={62} cy={32} r={2.2} fill="#0F0A06" />
          <Circle cx={36.5} cy={30.5} r={1.4} fill="white" />
          <Circle cx={60.5} cy={30.5} r={1.4} fill="white" />
          <Circle cx={39.5} cy={33.5} r={0.7} fill="rgba(255,255,255,0.6)" />
          <Circle cx={63.5} cy={33.5} r={0.7} fill="rgba(255,255,255,0.6)" />

          {/* Mejillas */}
          <Ellipse cx={30} cy={42} rx={7} ry={4.5} fill="#F9A8D4" opacity={0.40} />
          <Ellipse cx={70} cy={42} rx={7} ry={4.5} fill="#F9A8D4" opacity={0.40} />

          {/* ── Lazo a cuadros ── */}
          <Path d="M 50 62 L 34 54 L 32 68 Z" fill={`url(#${uid}Bow)`} />
          <Path d="M 36 55 L 34 65" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 40 55 L 38 64" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 33 59 L 44 57" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 34 63 L 44 61" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 50 62 L 66 54 L 68 68 Z" fill={`url(#${uid}Bow)`} />
          <Path d="M 60 55 L 62 64" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 56 55 L 58 64" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 54 57 L 66 59" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Path d="M 54 61 L 66 63" stroke="#991B1B" strokeWidth={0.8} opacity={0.8} />
          <Circle cx={50} cy={62} r={5.5} fill="#EF4444" />
          <Circle cx={50} cy={62} r={3.5} fill="#DC2626" />
          <Circle cx={48.5} cy={60.5} r={1.5} fill="rgba(255,255,255,0.45)" />

          {/* Sombra suelo */}
          <Ellipse cx={50} cy={100} rx={26} ry={3.5} fill="rgba(0,0,0,0.10)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
