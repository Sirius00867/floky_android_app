import React, { useState, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Animated,
} from 'react-native';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

const { width: SW } = Dimensions.get('window');

interface Slide {
  emoji:    string;
  title:    string;
  body:     string;
  accent:   string;
  features: string[];
}

const SLIDES: Slide[] = [
  {
    emoji:   '🩸',
    title:   'Todos tus sensores,\nuna sola app',
    body:    'Conecta Nightscout, Dexcom, FreeStyle Libre o Tidepool. floky lee tus datos donde estén y los muestra juntos.',
    accent:  '#10B981',
    features: [
      '🌐 Nightscout (cualquier sensor)',
      '📡 Dexcom G5 / G6 / G7',
      '💚 FreeStyle Libre 1 / 2 / 3',
      '🔗 Dexcom Share · Tidepool',
    ],
  },
  {
    emoji:   '👤',
    title:   'Una app,\ncon tres tipos de usuarios',
    body:    'Elige el modo que te describe. La misma información, adaptada a ti — sin botones que no necesitas.',
    accent:  '#6366F1',
    features: [
      '⚡ Adolescente — gamificada y visual',
      '📊 Adulto — datos y gráficos precisos',
      '👨‍👧 Padre/Madre — resumen del hijo/a',
    ],
  },
  {
    emoji:   '🔡',
    title:   'Diseñada para\nla dislexia',
    body:    'El 15% de personas con diabetes tipo 1 también tienen dislexia. floky es la única app de diabetes que lo tiene en cuenta.',
    accent:  '#F59E0B',
    features: [
      '🔡 Fuente OpenDyslexic opcional',
      '🎨 Alto contraste · sin texto pequeño',
      '✅ Botones grandes · sin menús complejos',
    ],
  },
  {
    emoji:   '🤖',
    title:   'floky detecta\ntus patrones',
    body:    'El asistente analiza tus datos y te avisa de patrones recurrentes que tú solo no verías.',
    accent:  '#EC4899',
    features: [
      '📉 "Bajadas en el ejercicio"',
      '🌙 "Subes por la noche si cenas tarde"',
      '⚡ Alertas antes de que bajes de 70',
      '💬 Resumen semanal automático',
    ],
  },
];

interface Props {
  onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: Props) {
  const [page, setPage]   = useState(0);
  const scrollRef         = useRef<ScrollView>(null);
  const fadeAnim          = useRef(new Animated.Value(1)).current;

  const slide = SLIDES[page];
  const isLast = page === SLIDES.length - 1;

  const goTo = (idx: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setPage(idx);
  };

  const next = () => {
    if (isLast) { onContinue(); return; }
    goTo(page + 1);
  };

  const back = () => {
    if (page > 0) goTo(page - 1);
  };

  return (
    <View style={styles.root}>
      {/* Fondo con acento de color */}
      <View style={[styles.accentBg, { backgroundColor: slide.accent + '12' }]} />

      {/* Botón atrás */}
      {page > 0 && (
        <TouchableOpacity style={styles.backBtn} onPress={back} activeOpacity={0.7}>
          <DyslexiaText variant="small" color="#9CA3AF">← Atrás</DyslexiaText>
        </TouchableOpacity>
      )}

      {/* Skip */}
      {!isLast && (
        <TouchableOpacity style={styles.skipBtn} onPress={onContinue} activeOpacity={0.7}>
          <DyslexiaText variant="small" color="#9CA3AF">Saltar →</DyslexiaText>
        </TouchableOpacity>
      )}

      {/* Contenido animado */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Emoji grande */}
        <View style={[styles.emojiWrap, { backgroundColor: slide.accent + '1A', borderColor: slide.accent + '30' }]}>
          <DyslexiaText variant="h1" style={{ fontSize: 64, lineHeight: 72 }}>{slide.emoji}</DyslexiaText>
        </View>

        {/* Título */}
        <DyslexiaText variant="h2" color="#111827" style={styles.title}>
          {slide.title}
        </DyslexiaText>

        {/* Descripción */}
        <DyslexiaText variant="body" color="#4B5563" style={styles.body}>
          {slide.body}
        </DyslexiaText>

        {/* Features */}
        <View style={styles.featList}>
          {slide.features.map((f, i) => (
            <View key={i} style={[styles.featRow, { backgroundColor: slide.accent + '0D' }]}>
              <DyslexiaText variant="small" color="#111827">{f}</DyslexiaText>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Footer: dots + botón */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[
                styles.dot,
                { backgroundColor: i === page ? slide.accent : '#D1D5DB' },
                i === page && { width: 24 },
              ]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Botón siguiente / empezar */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: slide.accent }]}
          onPress={next}
          activeOpacity={0.85}
        >
          <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>
            {isLast ? '¡Empezar con floky! 🚀' : 'Siguiente →'}
          </DyslexiaText>
        </TouchableOpacity>

        {/* Indicador de progreso */}
        <DyslexiaText variant="caption" color="#9CA3AF" style={{ textAlign: 'center' }}>
          {page + 1} de {SLIDES.length}
        </DyslexiaText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#FFFFFF',
  },
  accentBg: {
    position: 'absolute',
    top:      0,
    left:     0,
    right:    0,
    height:   '55%',
  },
  backBtn: {
    position:   'absolute',
    top:        56,
    left:       SPACING.lg,
    zIndex:     10,
    padding:    SPACING.sm,
  },
  skipBtn: {
    position:   'absolute',
    top:        56,
    right:      SPACING.lg,
    zIndex:     10,
    padding:    SPACING.sm,
  },
  content: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop:     72,
    gap:            SPACING.lg,
  },
  emojiWrap: {
    width:         100,
    height:        100,
    borderRadius:  28,
    borderWidth:   1.5,
    alignItems:    'center',
    justifyContent:'center',
  },
  title: {
    textAlign:  'center',
    fontWeight: '800',
    lineHeight: 32,
    fontSize:   24,
  },
  body: {
    textAlign:  'center',
    lineHeight: 24,
    color:      '#4B5563',
    maxWidth:   320,
  },
  featList: {
    width:   '100%',
    gap:     8,
  },
  featRow: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical:   10,
    paddingHorizontal: SPACING.md,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom:     48,
    paddingTop:        SPACING.lg,
    gap:               SPACING.md,
    alignItems:        'center',
  },
  dots: {
    flexDirection: 'row',
    gap:           6,
    alignItems:    'center',
  },
  dot: {
    width:        8,
    height:       8,
    borderRadius: 4,
  },
  btn: {
    width:          '100%',
    paddingVertical: 16,
    borderRadius:   BORDER_RADIUS.xl ?? 16,
    alignItems:     'center',
    justifyContent: 'center',
  },
});
