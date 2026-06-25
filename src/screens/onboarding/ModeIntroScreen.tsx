import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Animated,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { markModeIntroSeen } from '@/store/slices/userModeSlice';
import type { UserMode } from '@/store/slices/userModeSlice';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

// ── Contenido por modo ────────────────────────────────────────────────────────

const MODE_CONTENT: Record<UserMode, {
  emoji: string;
  greeting: string;
  tagline: string;
  color: string;
  bg: string;
  features: { icon: string; title: string; desc: string }[];
  cta: string;
}> = {
  adolescent: {
    emoji:    '🎮',
    greeting: '¡Bienvenido/a a tu centro de mando!',
    tagline:  'Aquí controlas tu diabetes como si fuera un juego. Cada registro suma puntos. Cada día bien gestionado te acerca a nuevas recompensas.',
    color:    '#6366F1',
    bg:       '#EEF2FF',
    features: [
      { icon: '🩸', title: 'Glucosa en tiempo real',   desc: 'Conecta tu sensor y ve tu curva del día de un vistazo.' },
      { icon: '⭐', title: 'Puntos y misiones',        desc: 'Gana XP por registrar, completar rutinas y estudiar.' },
      { icon: '🤖', title: 'Asistente floky',          desc: 'Tu IA personal detecta patrones y te avisa antes de bajadas.' },
      { icon: '📚', title: 'Estudio adaptado',         desc: 'Bloques Pomodoro diseñados para dislexia. Sin agobios.' },
    ],
    cta: '¡Vamos a ello! 🚀',
  },
  adult: {
    emoji:    '📊',
    greeting: 'Bienvenido/a. Tú tienes el control.',
    tagline:  'Interfaz limpia, datos precisos y toda la potencia de AAPS/Loop al alcance de tu mano. Sin ruido, sin distracciones.',
    color:    '#1D4ED8',
    bg:       '#EFF6FF',
    features: [
      { icon: '📈', title: 'Gráfico detallado',        desc: 'Curva multicolor con TIR%, ventana 3/6/12/24h y estadísticas.' },
      { icon: '⚙️', title: 'AAPS / Loop integrado',    desc: 'IOB, COB, basal temporal y BG eventual desde Nightscout.' },
      { icon: '🎯', title: 'Objetivos personalizados', desc: 'Define tu rango objetivo y la app colorea todo en consecuencia.' },
      { icon: '🔔', title: 'Alertas inteligentes',     desc: 'Notificaciones solo cuando de verdad importa.' },
    ],
    cta: 'Entrar al panel →',
  },
  parent: {
    emoji:    '👨‍👧',
    greeting: 'Siempre al tanto de tu hijo/a.',
    tagline:  'Sigue la glucosa de tu hijo/a en tiempo real, recibe alertas cuando más lo necesitas y dale autonomía sin perder el control.',
    color:    '#16A34A',
    bg:       '#F0FDF4',
    features: [
      { icon: '📡', title: 'Glucosa en tiempo real',   desc: 'La curva de hoy de tu hijo/a, actualizada cada minuto.' },
      { icon: '🚨', title: 'Alertas prioritarias',     desc: 'Notificación inmediata si baja de tu límite configurado.' },
      { icon: '📋', title: 'Resumen del día',          desc: 'TIR%, mínimo, media, máximo y lecturas de las últimas 24h.' },
      { icon: '🔐', title: 'PIN parental',             desc: 'Protege los ajustes para que tu hijo/a no los cambie.' },
    ],
    cta: 'Ver el panel de mi hijo/a →',
  },
};

// ── Componente ─────────────────────────────────────────────────────────────────

interface Props {
  mode: UserMode;
  onDone: () => void;
}

export default function ModeIntroScreen({ mode, onDone }: Props) {
  const dispatch  = useDispatch();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const C = MODE_CONTENT[mode];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleDone = () => {
    dispatch(markModeIntroSeen(mode));
    onDone();
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Cabecera con color de acento */}
      <View style={[styles.header, { backgroundColor: C.color }]}>
        <Text style={styles.headerEmoji}>{C.emoji}</Text>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Título y tagline */}
        <View style={styles.titleBlock}>
          <Text style={[styles.greeting, { color: C.color }]}>{C.greeting}</Text>
          <Text style={styles.tagline}>{C.tagline}</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresGrid}>
          {C.features.map((f, i) => (
            <View key={i} style={[styles.featureCard, { backgroundColor: '#fff', borderColor: C.color + '20' }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: C.color }]}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: C.color }]}
          onPress={handleDone}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{C.cta}</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  headerEmoji: {
    fontSize: 64,
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.lg,
  },
  titleBlock: {
    gap: SPACING.sm,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  tagline: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 23,
  },
  featuresGrid: {
    gap: SPACING.sm,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    marginTop: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
