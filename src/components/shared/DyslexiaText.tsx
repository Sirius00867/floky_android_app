import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, TextProps } from 'react-native';
import { useSelector } from 'react-redux';
import * as Speech from 'expo-speech';
import { COLORS, TYPOGRAPHY } from '@/constants/theme';
import type { RootState } from '@/store/store';

// Typography for normal (non-dyslexia) mode — compact, standard sizing
const NORMAL_SIZES       = { h1: 22, h2: 18, h3: 16, body: 14, small: 13, caption: 12 };
const NORMAL_LINE_HEIGHT = { h1: 1.3, h2: 1.35, h3: 1.4, body: 1.45, small: 1.4, caption: 1.35 };

// Candidatas: voces femeninas de español de España, ordenadas por preferencia
const PREFERRED_VOICE_IDS = [
  // iOS — Monica es la voz estándar de España
  'com.apple.voice.premium.es-ES.Monica',
  'com.apple.voice.enhanced.es-ES.Monica',
  'com.apple.ttsbundle.Monica-premium',
  'com.apple.ttsbundle.Monica-compact',
  // Android / otros
  'es-es-x-eeb-local',
  'es-es-x-eed-local',
  'es-ES-SMTf00',
];

let cachedVoiceId: string | null | undefined = undefined; // undefined = no buscado aún

async function getSpanishFemaleVoice(): Promise<string | undefined> {
  if (cachedVoiceId !== undefined) return cachedVoiceId ?? undefined;

  try {
    const voices = await Speech.getAvailableVoicesAsync();

    // 1. Buscar por ID preferido exacto
    for (const id of PREFERRED_VOICE_IDS) {
      if (voices.find(v => v.identifier === id)) {
        cachedVoiceId = id;
        return id;
      }
    }

    // 2. Buscar cualquier voz femenina es-ES
    const esES = voices.filter(v =>
      v.language?.toLowerCase().startsWith('es-es') ||
      v.language?.toLowerCase().startsWith('es_es')
    );
    const female = esES.find(v =>
      /monica|helena|maria|lucia|female|mujer/i.test(v.name ?? v.identifier)
    );
    if (female) {
      cachedVoiceId = female.identifier;
      return female.identifier;
    }

    // 3. Cualquier voz es-ES
    if (esES.length > 0) {
      cachedVoiceId = esES[0].identifier;
      return esES[0].identifier;
    }
  } catch {
    // Silencioso — usará el idioma sin voz específica
  }

  cachedVoiceId = null;
  return undefined;
}

interface DyslexiaTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
  speakable?: boolean;
  children: React.ReactNode;
  color?: string;
}

export const DyslexiaText: React.FC<DyslexiaTextProps> = ({
  variant = 'body',
  speakable = false,
  children,
  color,
  style,
  ...props
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const displayMode = useSelector((s: RootState) => s.settings?.displayMode ?? 'dyslexia');
  const isNormal = displayMode === 'normal';

  const handleSpeak = async () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
      return;
    }

    const text = typeof children === 'string' ? children : String(children);
    const voiceId = await getSpanishFemaleVoice();

    setIsSpeaking(true);
    try {
      await Speech.speak(text, {
        language: 'es-ES',
        voice: voiceId,
        pitch: 1.0,
        rate: 0.85, // Ligeramente más lento para dislexia
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    } catch {
      setIsSpeaking(false);
    }
  };

  const fontSize = isNormal
    ? NORMAL_SIZES[variant]
    : TYPOGRAPHY.sizes[variant];

  const lineHeightMult = isNormal
    ? NORMAL_LINE_HEIGHT[variant]
    : TYPOGRAPHY.lineHeights[variant];

  const letterSpacing = isNormal ? 0 : (
    variant === 'body'    ? TYPOGRAPHY.letterSpacing.body :
    variant === 'small'   ? TYPOGRAPHY.letterSpacing.small :
    variant === 'h3'      ? 0.2 : 0
  );

  const textStyle = {
    fontSize,
    lineHeight: fontSize * lineHeightMult,
    letterSpacing,
    color: color || COLORS.dark,
    fontFamily: 'System',
  };

  const textNode = (
    <Text {...props} style={[textStyle, style]}>
      {children}
      {speakable && ' 🔊'}
    </Text>
  );

  if (!speakable) return textNode;

  return (
    <TouchableOpacity onPress={handleSpeak} activeOpacity={0.7}>
      {textNode}
    </TouchableOpacity>
  );
};

export const styles = StyleSheet.create({
  h1: {
    fontSize: TYPOGRAPHY.sizes.h1,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  h2: {
    fontSize: TYPOGRAPHY.sizes.h2,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  h3: {
    fontSize: TYPOGRAPHY.sizes.h3,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  body: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  small: {
    fontSize: TYPOGRAPHY.sizes.small,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
  caption: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.regular,
  },
});
