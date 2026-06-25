import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setUserMode, completeOnboarding } from '@/store/slices/userModeSlice';
import {
  setUserName, setNightscoutUrl, setNightscoutApiSecret,
} from '@/store/slices/settingsSlice';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { MODE_LABELS, MODE_DESCRIPTIONS, MODE_EMOJIS } from '@/constants/modeNavigationConfig';
import type { UserMode } from '@/store/slices/userModeSlice';
import WelcomeScreen from '@/screens/onboarding/WelcomeScreen';
import ModeIntroScreen from '@/screens/onboarding/ModeIntroScreen';

const MODES: UserMode[] = ['adolescent', 'adult', 'parent'];

const MODE_COLORS: Record<UserMode, string> = {
  adolescent: COLORS.gamification ?? '#6366F1',
  adult:      '#1D4ED8',
  parent:     '#16A34A',
};

const MODE_BG: Record<UserMode, string> = {
  adolescent: '#EEF2FF',
  adult:      '#EFF6FF',
  parent:     '#F0FDF4',
};

const MODE_DETAILS: Record<UserMode, string> = {
  adolescent: 'Gamificada, visual y accesible. Glucosa, estudio y rutinas en un solo lugar.',
  adult:      'Gráficos detallados, datos precisos y gestión completa sin distracciones.',
  parent:     'Sigue la glucosa y el bienestar de tu hijo/a en tiempo real.',
};

type Step = 'welcome' | 'mode' | 'modeIntro' | 'setup';

export default function ModeSelector() {
  const dispatch = useDispatch();
  const [step, setStep]         = useState<Step>('welcome');
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);
  const [name, setName]         = useState('');
  const [nsUrl, setNsUrl]       = useState('');
  const [nsSecret, setNsSecret] = useState('');

  const handleModeSelect = (mode: UserMode) => {
    setSelectedMode(mode);
    dispatch(setUserMode(mode));
    setStep('modeIntro');
  };

  const handleFinish = () => {
    if (name.trim().length >= 2) dispatch(setUserName(name.trim()));
    if (nsUrl.trim())            dispatch(setNightscoutUrl(nsUrl.trim()));
    if (nsSecret.trim())         dispatch(setNightscoutApiSecret(nsSecret.trim()));
    dispatch(completeOnboarding());
  };

  if (step === 'welcome') {
    return <WelcomeScreen onContinue={() => setStep('mode')} />;
  }

  if (step === 'modeIntro' && selectedMode) {
    return <ModeIntroScreen mode={selectedMode} onDone={() => setStep('setup')} />;
  }

  if (step === 'mode') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.badge}>PASO 1 DE 2</Text>
            <Text style={styles.title}>¿Quién va a usar floky?</Text>
            <Text style={styles.subtitle}>
              Elige el modo que mejor te describe. Puedes cambiarlo después en Ajustes.
            </Text>
          </View>

          {MODES.map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.card, { backgroundColor: MODE_BG[mode], borderColor: MODE_COLORS[mode] + '50' }]}
              onPress={() => handleModeSelect(mode)}
              activeOpacity={0.75}
            >
              <View style={[styles.emojiWrap, { backgroundColor: MODE_COLORS[mode] + '18' }]}>
                <Text style={styles.cardEmoji}>{MODE_EMOJIS[mode]}</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: MODE_COLORS[mode] }]}>
                  {MODE_LABELS[mode]}
                </Text>
                <Text style={styles.cardDesc}>{MODE_DETAILS[mode]}</Text>
              </View>
              <View style={[styles.arrowWrap, { backgroundColor: MODE_COLORS[mode] }]}>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // step === 'setup'
  const modeColor  = selectedMode ? MODE_COLORS[selectedMode] : COLORS.study;
  const modeBg     = selectedMode ? MODE_BG[selectedMode] : '#EEF2FF';
  const modeLabel  = selectedMode ? MODE_LABELS[selectedMode] : '';
  const modeEmoji  = selectedMode ? MODE_EMOJIS[selectedMode] : '';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.badge}>PASO 2 DE 2</Text>
            <Text style={styles.title}>Casi listo 🎉</Text>
            <Text style={styles.subtitle}>
              Un par de datos opcionales para personalizar tu experiencia.
            </Text>
          </View>

          {/* Modo elegido */}
          <View style={[styles.modeChip, { backgroundColor: modeBg, borderColor: modeColor + '50' }]}>
            <Text style={{ fontSize: 20 }}>{modeEmoji}</Text>
            <Text style={[styles.modeChipLabel, { color: modeColor }]}>Modo: {modeLabel}</Text>
            <TouchableOpacity onPress={() => setStep('mode')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: COLORS.darkTertiary }}>Cambiar</Text>
            </TouchableOpacity>
          </View>

          {/* Nombre */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Cómo te llamas?</Text>
            <Text style={styles.sectionSub}>Opcional — para personalizar mensajes</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre o el de tu hijo/a"
              placeholderTextColor={COLORS.darkTertiary}
              value={name}
              onChangeText={setName}
              maxLength={24}
              returnKeyType="next"
            />
          </View>

          {/* Nightscout */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>¿Tienes Nightscout? 📡</Text>
            <Text style={styles.sectionSub}>Opcional — para ver glucosa en tiempo real</Text>
            <TextInput
              style={styles.input}
              placeholder="https://tu-site.herokuapp.com"
              placeholderTextColor={COLORS.darkTertiary}
              value={nsUrl}
              onChangeText={setNsUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {nsUrl.trim().length > 0 && (
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="API Secret (si tienes)"
                placeholderTextColor={COLORS.darkTertiary}
                value={nsSecret}
                onChangeText={setNsSecret}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            )}
          </View>

          {/* Botones */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: modeColor }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Entrar a floky 🚀</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleFinish} style={styles.skipBtn}>
            <Text style={styles.skipText}>Saltar y configurar más tarde →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    padding: SPACING.lg,
    gap: SPACING.md,
    paddingBottom: 40,
  },
  header: {
    gap: 6,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.darkTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.darkSecondary,
    lineHeight: 22,
  },

  /* Mode cards */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1.5,
    gap: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  emojiWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.darkSecondary,
    lineHeight: 18,
  },
  arrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 22,
  },

  /* Setup step */
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
  },
  modeChipLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.darkTertiary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.dark,
    backgroundColor: '#F8FAFC',
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
  skipBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.darkTertiary,
  },
});
