/**
 * DinoAvatar — Rex (T-Rex estilo Toy Story)
 *
 * Bloque 100 % sólido: UN Animated.View + UN Svg.
 * Sin capas articuladas → cero tearing garantizado.
 *
 * Animación global:
 *   idle     → sway (rotate) + float (translateY)
 *   reaction → salto + squash-stretch al aterrizar + shake
 */
import React, { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient,
  Path, Polygon, Stop,
} from 'react-native-svg';
import Animated, {
  Easing, cancelAnimation, useAnimatedStyle, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { AvatarProps } from '../AvatarController';
import { GlucoseReactionState, IdleState } from '@/utils/avatarTypes';

// ── Paleta ─────────────────────────────────────────────────────────────────

const GREEN: Record<string, string> = {
  default:                                          '#4ADE80',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#F87171',
  [GlucoseReactionState.REACTION_LOW]:              '#FCA5A5',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#4ADE80',
  [GlucoseReactionState.REACTION_HIGH]:             '#FCD34D',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#F59E0B',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#93C5FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#C4B5FD',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F0ABFC',
};
const DARK: Record<string, string> = {
  default:                                          '#16A34A',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#B91C1C',
  [GlucoseReactionState.REACTION_LOW]:              '#EF4444',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#16A34A',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#2563EB',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#7C3AED',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A21CAF',
};

// ── Configuración idle ─────────────────────────────────────────────────────

interface IdleConfig { swayA: number; floatB: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 3, floatB: 2,   speed: 900  },
  [IdleState.IDLE_2]: { swayA: 5, floatB: 3.5, speed: 700  },
  [IdleState.IDLE_3]: { swayA: 2, floatB: 1,   speed: 1300 },
  [IdleState.IDLE_4]: { swayA: 7, floatB: 5,   speed: 550  },
  [IdleState.IDLE_5]: { swayA: 4, floatB: 2.5, speed: 800  },
  [IdleState.IDLE_6]: { swayA: 9, floatB: 6,   speed: 450  },
};

export function DinoAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid   = useId().replace(/:/g, '');
  const sway  = useSharedValue(0);
  const float = useSharedValue(0);
  const sqX   = useSharedValue(1);
  const sqY   = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const g  = GREEN[animationState] ?? GREEN.default;
  const dk = DARK[animationState]  ?? DARK.default;

  useEffect(() => {
    cancelAnimation(sway); cancelAnimation(float);
    cancelAnimation(sqX);  cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];
      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed * 1.2, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed * 1.2, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
      float.value = withRepeat(
        withSequence(
          withTiming(-cfg.floatB, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming(0,            { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      float.value = withSequence(
        withTiming(-size * 0.15, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0,            { duration: 80,  easing: Easing.in(Easing.quad)  }),
        withSpring(0, { damping: 4, stiffness: 80 }),
      );
      sqX.value = withSequence(
        withTiming(1,    { duration: 150 }),
        withTiming(1.25, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
      sqY.value = withSequence(
        withTiming(1,    { duration: 150 }),
        withTiming(0.80, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 180 }),
      );
      sway.value = withSequence(
        withTiming(-10, { duration: 70  }),
        withTiming( 10, { duration: 70  }),
        withTiming( -5, { duration: 50  }),
        withTiming(  0, { duration: 120 }),
      );
    }
  }, [animationState, isIdle, size]);

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
            <LinearGradient id={`${uid}B`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={g}  />
              <Stop offset="1" stopColor={dk} />
            </LinearGradient>
            <LinearGradient id={`${uid}H`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={g}  />
              <Stop offset="1" stopColor={dk} />
            </LinearGradient>
            <LinearGradient id={`${uid}T`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={g}  />
              <Stop offset="1" stopColor={dk} />
            </LinearGradient>
            <LinearGradient id={`${uid}Ly`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#DCFCE7" />
              <Stop offset="1" stopColor="#BBF7D0" />
            </LinearGradient>
          </Defs>

          {/* ── Cola ── */}
          <Path
            d="M 66 66 C 72 62 80 56 86 50 C 90 45 94 40 96 36 C 97 33 95 30 92 32
               C 88 34 84 40 80 46 C 76 52 72 58 68 62 Z"
            fill={`url(#${uid}T)`}
          />
          <Path d="M 72 62 C 74 58 78 54 82 50"
            stroke="rgba(255,255,255,0.2)" strokeWidth={1.2} fill="none" />

          {/* ── Pata trasera (detrás) ── */}
          <Path d="M 56 74 C 60 80 62 88 58 93 C 54 97 48 96 46 92
                   C 44 87 46 80 52 75 Z"
            fill={dk} opacity={0.8} />
          <Ellipse cx={53} cy={94} rx={7} ry={3.5} fill={dk} opacity={0.7} />
          <Path d="M 47 95 L 44 100" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M 53 96 L 52 101" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M 59 94 L 61 99"  stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />

          {/* ── Cuerpo ── */}
          <Ellipse cx={48} cy={63} rx={22} ry={22} fill={`url(#${uid}B)`} />
          <Ellipse cx={48} cy={66} rx={13} ry={17} fill={`url(#${uid}Ly)`} />

          {/* ── Pata delantera (frente) ── */}
          <Path d="M 36 76 C 32 81 30 90 34 94 C 38 98 44 97 46 93
                   C 48 88 46 80 40 76 Z"
            fill={g} />
          <Ellipse cx={38} cy={95} rx={8} ry={3.5} fill={dk} />
          <Path d="M 31 95 L 28 100" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M 38 97 L 38 102" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />
          <Path d="M 45 95 L 47 100" stroke="#0F172A" strokeWidth={1.5} strokeLinecap="round" />

          {/* ── Brazo izquierdo (diminuto) ── */}
          <Path d="M 28 57 C 22 53 18 47 20 43 C 21 40 24 40 27 43
                   C 29 46 30 51 33 55 Z" fill={g} />
          <Path d="M 19 42 L 15 39" stroke={g}  strokeWidth={3}   strokeLinecap="round" />
          <Path d="M 20 40 L 17 36" stroke={g}  strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M 23 39 L 21 35" stroke={g}  strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M 15 39 L 13 37" stroke={dk} strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M 17 36 L 15 34" stroke={dk} strokeWidth={1.2} strokeLinecap="round" />
          <Path d="M 21 35 L 20 33" stroke={dk} strokeWidth={1.2} strokeLinecap="round" />

          {/* ── Brazo derecho (detrás) ── */}
          <Path d="M 68 57 C 74 53 78 47 76 43 C 75 40 72 40 69 43
                   C 67 46 66 51 63 55 Z"
            fill={dk} opacity={0.75} />
          <Path d="M 77 42 L 81 39" stroke={dk} strokeWidth={3}   strokeLinecap="round" opacity={0.8} />
          <Path d="M 76 40 L 79 36" stroke={dk} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />

          {/* ── Cuello ── */}
          <Path d="M 40 46 C 38 38 38 30 42 24 C 48 20 54 20 58 24
                   C 62 30 62 38 60 46 Z" fill={g} />

          {/* ── Cabeza ── */}
          <Ellipse cx={49} cy={20} rx={22} ry={16} fill={`url(#${uid}H)`} />
          <Circle cx={29} cy={24} r={8} fill={g} />
          <Circle cx={69} cy={24} r={8} fill={g} />

          {/* Mandíbulas */}
          <Path d="M 29 26 C 29 34 35 38 49 38 C 63 38 69 34 69 26" fill={g} />
          <Path d="M 31 34 C 31 42 37 46 49 46 C 61 46 67 42 67 34"
            fill={dk} opacity={0.9} />

          {/* Interior boca */}
          <Path d="M 33 33 Q 49 44 65 33 Q 63 40 49 44 Q 35 40 33 33 Z"
            fill="#1A2E1A" />

          {/* Dientes superiores */}
          <Polygon points="35,33 37,40 39,33" fill="white" />
          <Polygon points="40,32 42,39 44,32" fill="white" />
          <Polygon points="46,32 48,39 50,32" fill="white" />
          <Polygon points="52,32 54,39 56,32" fill="white" />
          <Polygon points="58,32 60,39 62,33" fill="white" />

          {/* Dientes inferiores */}
          <Polygon points="38,40 40,34 42,40" fill="white" opacity={0.9} />
          <Polygon points="44,41 46,35 48,41" fill="white" opacity={0.9} />
          <Polygon points="50,41 52,35 54,41" fill="white" opacity={0.9} />
          <Polygon points="56,40 58,34 60,40" fill="white" opacity={0.9} />

          {/* Lengua */}
          <Ellipse cx={49} cy={42} rx={7} ry={4} fill="#FB7185" />
          <Path d="M 42 42 Q 49 45 56 42" stroke="#F43F5E" strokeWidth={0.8} fill="none" />

          {/* Ojos grandes */}
          <Circle cx={36} cy={14} r={9}   fill="white" />
          <Circle cx={62} cy={14} r={9}   fill="white" />
          <Circle cx={37} cy={15} r={5.5} fill="#166534" />
          <Circle cx={63} cy={15} r={5.5} fill="#166534" />
          <Circle cx={37.5} cy={15.5} r={3} fill="#0F172A" />
          <Circle cx={63.5} cy={15.5} r={3} fill="#0F172A" />
          <Circle cx={35.5} cy={13}   r={1.8} fill="white" />
          <Circle cx={61.5} cy={13}   r={1.8} fill="white" />
          <Circle cx={39}   cy={17}   r={0.8} fill="rgba(255,255,255,0.6)" />
          <Circle cx={65}   cy={17}   r={0.8} fill="rgba(255,255,255,0.6)" />
          <Circle cx={36} cy={14} r={9} stroke={dk} strokeWidth={1} fill="none" />
          <Circle cx={62} cy={14} r={9} stroke={dk} strokeWidth={1} fill="none" />

          {/* Cejas */}
          <Path d="M 27 10 Q 36 7 45 10" stroke={dk} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M 53 10 Q 62 7 71 10" stroke={dk} strokeWidth={2} fill="none" strokeLinecap="round" />

          {/* Fosas nasales */}
          <Circle cx={43} cy={26} r={1.8} fill={dk} opacity={0.6} />
          <Circle cx={55} cy={26} r={1.8} fill={dk} opacity={0.6} />

          {/* Mejillas */}
          <Ellipse cx={27} cy={28} rx={5} ry={3} fill="#F9A8D4" opacity={0.45} />
          <Ellipse cx={71} cy={28} rx={5} ry={3} fill="#F9A8D4" opacity={0.45} />

          {/* Sombra suelo */}
          <Ellipse cx={50} cy={102} rx={22} ry={3} fill="rgba(0,0,0,0.08)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
