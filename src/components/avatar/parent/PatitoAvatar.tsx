/**
 * PatitoAvatar — Patito de goma clásico (bloque sólido)
 *
 * Juguete de baño amarillo tierno. Diseño infantil amigable:
 * formas 100 % redondeadas, ojos simples de caricatura,
 * sin articulaciones ni deformaciones.
 *
 * UN solo Animated.View + UN solo Svg → cero tearing garantizado.
 *
 * Animación global:
 *   idle     → sway suave (rotate) — mecedora de juguete
 *   reaction → squash-stretch elástico + shake
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
// El patito siempre es amarillo; el tono varía sutilmente con el estado.

const BODY: Record<string, string> = {
  default:                                          '#FDE047',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#FCA5A5',
  [GlucoseReactionState.REACTION_LOW]:              '#FED7AA',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#BEF264',
  [GlucoseReactionState.REACTION_HIGH]:             '#FEF08A',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#FCD34D',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#BAE6FD',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#DDD6FE',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#F5D0FE',
};
const BODY_DK: Record<string, string> = {
  default:                                          '#CA8A04',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#DC2626',
  [GlucoseReactionState.REACTION_LOW]:              '#EA580C',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#16A34A',
  [GlucoseReactionState.REACTION_HIGH]:             '#D97706',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#B45309',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#0369A1',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#6D28D9',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#A21CAF',
};
const BEAK: Record<string, string> = {
  default:                                          '#F97316',
  [GlucoseReactionState.REACTION_CRITICAL_LOW]:     '#EF4444',
  [GlucoseReactionState.REACTION_LOW]:              '#FB923C',
  [GlucoseReactionState.REACTION_IN_RANGE]:         '#F97316',
  [GlucoseReactionState.REACTION_HIGH]:             '#F59E0B',
  [GlucoseReactionState.REACTION_CRITICAL_HIGH]:    '#D97706',
  [GlucoseReactionState.REACTION_RAPID_RISE]:       '#0EA5E9',
  [GlucoseReactionState.REACTION_RAPID_DROP]:       '#A855F7',
  [GlucoseReactionState.REACTION_POINTS_EARNED]:    '#EC4899',
};

// ── Configuración idle ─────────────────────────────────────────────────────

interface IdleConfig { swayA: number; speed: number; }
const IDLE: Record<IdleState, IdleConfig> = {
  [IdleState.IDLE_1]: { swayA: 4,  speed: 1200 },
  [IdleState.IDLE_2]: { swayA: 6,  speed: 900  },
  [IdleState.IDLE_3]: { swayA: 2,  speed: 1600 },
  [IdleState.IDLE_4]: { swayA: 8,  speed: 700  },
  [IdleState.IDLE_5]: { swayA: 5,  speed: 1000 },
  [IdleState.IDLE_6]: { swayA: 10, speed: 580  },
};

export function PatitoAvatar({ animationState, size = 120 }: AvatarProps) {
  const uid  = useId().replace(/:/g, '');
  const sway = useSharedValue(0);
  const sqX  = useSharedValue(1);
  const sqY  = useSharedValue(1);

  const isIdle = Object.values(IdleState).includes(animationState as IdleState);
  const b  = BODY[animationState]    ?? BODY.default;
  const dk = BODY_DK[animationState] ?? BODY_DK.default;
  const bk = BEAK[animationState]    ?? BEAK.default;

  useEffect(() => {
    cancelAnimation(sway);
    cancelAnimation(sqX);
    cancelAnimation(sqY);

    if (isIdle) {
      const cfg = IDLE[animationState as IdleState];
      // Mecedora suave — el patito se balancea como un juguete de baño flotando
      sway.value = withRepeat(
        withSequence(
          withTiming(-cfg.swayA, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
          withTiming( cfg.swayA, { duration: cfg.speed, easing: Easing.inOut(Easing.sin) }),
        ), -1, true,
      );
    } else {
      // Alerta glucémica: squash-stretch elástico + shake divertido
      sqX.value = withSequence(
        withTiming(1.28, { duration: 90  }),
        withTiming(0.80, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 170 }),
      );
      sqY.value = withSequence(
        withTiming(0.78, { duration: 90  }),
        withTiming(1.22, { duration: 80  }),
        withSpring(1, { damping: 5, stiffness: 170 }),
      );
      sway.value = withSequence(
        withTiming(-10, { duration: 70  }),
        withTiming( 10, { duration: 70  }),
        withTiming( -5, { duration: 55  }),
        withTiming(  0, { duration: 120 }),
      );
    }
  }, [animationState, isIdle]);

  // UN solo worklet → cero tearing
  const animStyle = useAnimatedStyle(() => ({
    transform: [
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
            {/* Gradiente radial: brillo especular arriba-izquierda → color → sombra */}
            <RadialGradient id={`${uid}b`} cx="36%" cy="30%" r="72%">
              <Stop offset="0"    stopColor="white"  stopOpacity="0.55" />
              <Stop offset="0.22" stopColor={b}      stopOpacity="1"    />
              <Stop offset="1"    stopColor={dk}     stopOpacity="1"    />
            </RadialGradient>
            <RadialGradient id={`${uid}h`} cx="36%" cy="28%" r="68%">
              <Stop offset="0"    stopColor="white"  stopOpacity="0.45" />
              <Stop offset="0.20" stopColor={b}      stopOpacity="1"    />
              <Stop offset="1"    stopColor={dk}     stopOpacity="0.9"  />
            </RadialGradient>
            <RadialGradient id={`${uid}k`} cx="30%" cy="30%" r="70%">
              <Stop offset="0"   stopColor="#FED7AA" />
              <Stop offset="0.5" stopColor={bk}     />
              <Stop offset="1"   stopColor="#C2410C" />
            </RadialGradient>
          </Defs>

          {/* ───────────────────────────────────────────────────── */}
          {/* TÉCNICA: todas las piezas del cuerpo usan url(#b).   */}
          {/* Al superponerse con el mismo gradiente se fusionan   */}
          {/* visualmente en un único bloque de color sólido.      */}
          {/* ───────────────────────────────────────────────────── */}

          {/* ── Colita (detrás, dibujada primero) ── */}
          <Ellipse cx={74} cy={70} rx={10} ry={8} fill={`url(#${uid}b)`}
            transform="rotate(25 74 70)" />

          {/* ── Ala izquierda (pegada al cuerpo) ── */}
          <Ellipse cx={22} cy={64} rx={10} ry={7} fill={`url(#${uid}b)`}
            transform="rotate(20 22 64)" />

          {/* ── Ala derecha (pegada al cuerpo) ── */}
          <Ellipse cx={78} cy={64} rx={10} ry={7} fill={`url(#${uid}b)`}
            transform="rotate(-20 78 64)" />

          {/* ── Cuerpo principal (óvalo gordo) ── */}
          <Ellipse cx={50} cy={68} rx={30} ry={24} fill={`url(#${uid}b)`} />

          {/* ── Brillo barriga ── */}
          <Ellipse cx={44} cy={64} rx={14} ry={12}
            fill="rgba(255,255,255,0.22)" />

          {/* ── Patitas anaranjadas (pequeñas, integradas) ── */}
          <Ellipse cx={38} cy={91} rx={8} ry={4}  fill={bk} opacity={0.9} />
          <Ellipse cx={60} cy={91} rx={8} ry={4}  fill={bk} opacity={0.9} />
          {/* Dedos — 3 líneas suaves por pata */}
          <Path d="M 32 91 Q 30 95 32 95" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M 37 92 Q 35 97 37 97" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M 43 91 Q 41 95 43 95" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M 55 91 Q 53 95 55 95" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M 60 92 Q 58 97 60 97" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M 66 91 Q 64 95 66 95" stroke={bk} strokeWidth={1.8}
            fill="none" strokeLinecap="round" opacity={0.85} />

          {/* ── Cabeza (círculo, misma textura que el cuerpo) ── */}
          <Circle cx={50} cy={36} r={24} fill={`url(#${uid}h)`} />

          {/* ── Cresta / pompadour ── */}
          <Path d="M 45 13 C 43 6 50 3 54 7 C 58 4 62 9 57 13"
            fill={dk} opacity={0.88} />
          <Path d="M 47 13 C 46 7 51 5 54 8"
            stroke="rgba(255,255,255,0.28)" strokeWidth={1.3}
            fill="none" strokeLinecap="round" />

          {/* ── Pico naranja (integrado, pegado a la cabeza) ── */}
          {/* Mandíbula superior */}
          <Path d="M 70 33 C 80 30 84 35 82 39 C 80 43 74 41 70 37 Z"
            fill={`url(#${uid}k)`} />
          {/* Mandíbula inferior */}
          <Path d="M 70 37 C 76 39 80 42 78 46 C 76 49 70 46 70 40 Z"
            fill={bk} opacity={0.82} />
          {/* Línea del pico */}
          <Path d="M 70 37 L 82 37" stroke={dk} strokeWidth={0.9}
            fill="none" opacity={0.38} />
          {/* Fosa nasal */}
          <Circle cx={75} cy={34} r={1.1} fill={dk} opacity={0.45} />

          {/* ── Ojo izquierdo (grande, el principal) ── */}
          <Circle cx={40} cy={30} r={8}   fill="white"   />
          <Circle cx={40} cy={30} r={5.5} fill="#1C1917" />
          <Circle cx={40} cy={30} r={3}   fill="#0C0A09" />
          {/* Brillo primario */}
          <Circle cx={37.5} cy={27.5} r={2.5} fill="white" />
          {/* Brillo secundario */}
          <Circle cx={43}   cy={32.5} r={1.1} fill="rgba(255,255,255,0.55)" />
          {/* Pestaña */}
          <Path d="M 33.5 24 Q 40 21 46.5 24"
            stroke="#1C1917" strokeWidth={1.6}
            fill="none" strokeLinecap="round" />

          {/* ── Ojo derecho (más pequeño — perspectiva 3/4) ── */}
          <Circle cx={57} cy={29} r={5.5} fill="white"   />
          <Circle cx={57} cy={29} r={3.8} fill="#1C1917" />
          <Circle cx={57} cy={29} r={2}   fill="#0C0A09" />
          <Circle cx={55.2} cy={27.2} r={1.6} fill="white" />

          {/* ── Mejilla rubor ── */}
          <Ellipse cx={34} cy={38} rx={6.5} ry={4.5} fill="#FCA5A5" opacity={0.40} />

          {/* Sombra suelo */}
          <Ellipse cx={50} cy={100} rx={22} ry={3} fill="rgba(0,0,0,0.10)" />
        </Svg>
      </Animated.View>
    </View>
  );
}
