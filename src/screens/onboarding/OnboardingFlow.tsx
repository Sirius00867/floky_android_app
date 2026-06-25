/**
 * OnboardingFlow — Controlador del flujo de inicio (3 pantallas)
 *
 * Gestiona la navegación local entre los 3 pasos y despacha todas las
 * preferencias al Redux sólo al finalizar (excepto displayMode, que se
 * actualiza en tiempo real para la preview de tipografía).
 *
 * Reemplaza a ModeSelector.tsx.
 *
 * Flujo:
 *   Step 0 → StepIdentification  (modo, edad, consentimiento parental)
 *   Step 1 → StepPersonalization (nombre, dyslexia mode)
 *   Step 2 → StepLegalConnection (disclaimer médico, Nightscout)
 *   → dispatch all & completeOnboarding() → app principal
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { useDispatch } from 'react-redux';

import { setUserMode, completeOnboarding as completeModeOnboarding } from '@/store/slices/userModeSlice';
import {
  completeOnboarding as completeSettingsOnboarding,
  setUserName, setChildName, setDisplayMode, setIsMinor,
  setLegalConsentAccepted, setParentalConsentAccepted,
  setNightscoutUrl, setNightscoutApiSecret,
} from '@/store/slices/settingsSlice';

import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import {
  StepIdentification,
  validateIdentification,
  type IdentificationDraft,
} from './steps/StepIdentification';
import {
  StepPersonalization,
  validatePersonalization,
  type PersonalizationDraft,
} from './steps/StepPersonalization';
import {
  StepLegalConnection,
  validateLegalConnection,
  type LegalConnectionDraft,
} from './steps/StepLegalConnection';

// ── Estado local del flujo ───────────────────────────────────────────────────

const TOTAL_STEPS = 3;

const INIT_IDENTIFICATION: IdentificationDraft = {
  mode: null,
  ageVerified: false,
  isMinor: false,
  parentalConsentAccepted: false,
};

const INIT_PERSONALIZATION: PersonalizationDraft = {
  name: '',
  dyslexiaMode: true,  // default: on (filosofía de accesibilidad)
};

const INIT_LEGAL: LegalConnectionDraft = {
  legalAccepted: false,
  nightscoutUrl: '',
  nightscoutApiSecret: '',
  nsSkipped: false,
};

// ── Componente ───────────────────────────────────────────────────────────────

export default function OnboardingFlow() {
  const dispatch = useDispatch();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [idDraft,    setIdDraft]    = useState<IdentificationDraft>(INIT_IDENTIFICATION);
  const [persDraft,  setPersDraft]  = useState<PersonalizationDraft>(INIT_PERSONALIZATION);
  const [legalDraft, setLegalDraft] = useState<LegalConnectionDraft>(INIT_LEGAL);

  // Animación de transición entre pasos
  const progress = useSharedValue(0);

  const animateToStep = useCallback((nextStep: number) => {
    const direction = nextStep > step ? 1 : -1;
    progress.value = direction * 40;
    progress.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
    setStep(nextStep);
    setError(null);
  }, [step, progress]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value }],
    opacity: withTiming(1, { duration: 220 }),
    flex: 1,
  }));

  // Preview inmediata del modo dislexia
  const handleDyslexiaChange = useCallback((enabled: boolean) => {
    dispatch(setDisplayMode(enabled ? 'dyslexia' : 'normal'));
  }, [dispatch]);

  // ── Validación por paso ──────────────────────────────────────────────────

  const validate = (): string | null => {
    if (step === 0) return validateIdentification(idDraft);
    if (step === 1) return validatePersonalization(persDraft);
    if (step === 2) return validateLegalConnection(legalDraft);
    return null;
  };

  // ── Navegación ───────────────────────────────────────────────────────────

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    if (step < TOTAL_STEPS - 1) {
      animateToStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) animateToStep(step - 1);
  };

  // ── Finalizar: despachar todo al Redux ──────────────────────────────────

  const handleFinish = () => {
    const mode = idDraft.mode ?? 'adolescent';

    // userModeSlice
    dispatch(setUserMode(mode));
    dispatch(completeModeOnboarding());

    // settingsSlice — identidad
    dispatch(setIsMinor(idDraft.isMinor));
    dispatch(setParentalConsentAccepted(idDraft.parentalConsentAccepted));

    // settingsSlice — nombre (campo correcto según el modo)
    const trimmedName = persDraft.name.trim();
    if (trimmedName.length >= 2) {
      if (mode === 'parent') dispatch(setChildName(trimmedName));
      else                   dispatch(setUserName(trimmedName));
    }

    // settingsSlice — displayMode (ya actualizado en tiempo real, pero confirmamos)
    dispatch(setDisplayMode(persDraft.dyslexiaMode ? 'dyslexia' : 'normal'));

    // settingsSlice — legal
    dispatch(setLegalConsentAccepted(legalDraft.legalAccepted));

    // settingsSlice — Nightscout
    if (!legalDraft.nsSkipped && legalDraft.nightscoutUrl.trim()) {
      dispatch(setNightscoutUrl(legalDraft.nightscoutUrl.trim()));
      if (legalDraft.nightscoutApiSecret.trim())
        dispatch(setNightscoutApiSecret(legalDraft.nightscoutApiSecret.trim()));
    }

    // Marca onboarding completado (isFirstLaunch = false)
    dispatch(completeSettingsOnboarding());
  };

  // ── Etiquetas de pasos ───────────────────────────────────────────────────

  const STEP_LABELS = ['Identificación', 'Personalización', 'Legal y conexión'];
  const CTAs        = ['Continuar →', 'Continuar →', '¡Entrar a Floky! 🚀'];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* ── Barra de progreso superior ── */}
      <SafeAreaView style={styles.topBar}>
        {/* Botón atrás */}
        <TouchableOpacity
          style={[styles.backBtn, step === 0 && styles.backBtnHidden]}
          onPress={handleBack}
          disabled={step === 0}
          accessibilityLabel="Volver al paso anterior"
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>

        {/* Indicadores de paso */}
        <View style={styles.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={styles.stepDotWrap}>
              <View style={[
                styles.stepSegment,
                i <= step ? styles.stepSegmentDone : styles.stepSegmentPending,
              ]} />
              {i < TOTAL_STEPS - 1 && (
                <View style={[styles.stepConnector, i < step && styles.stepConnectorDone]} />
              )}
            </View>
          ))}
        </View>

        {/* Etiqueta de paso actual */}
        <Text style={styles.stepLabel}>{STEP_LABELS[step]}</Text>
      </SafeAreaView>

      {/* ── Contenido animado ── */}
      <Animated.View style={contentStyle}>
        {step === 0 && (
          <StepIdentification
            draft={idDraft}
            onChange={d => { setIdDraft(d); setError(null); }}
            forceShowErrors={error !== null}
          />
        )}
        {step === 1 && (
          <StepPersonalization
            draft={persDraft}
            onChange={d => { setPersDraft(d); setError(null); }}
            onDyslexiaModeChange={handleDyslexiaChange}
            mode={idDraft.mode}
          />
        )}
        {step === 2 && (
          <StepLegalConnection
            draft={legalDraft}
            onChange={d => { setLegalDraft(d); setError(null); }}
          />
        )}
      </Animated.View>

      {/* ── Footer: error + CTA ── */}
      <SafeAreaView style={styles.footer}>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.ctaBtn, step === TOTAL_STEPS - 1 && styles.ctaBtnFinish]}
          onPress={handleNext}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={CTAs[step]}
        >
          <Text style={styles.ctaBtnLabel}>{CTAs[step]}</Text>
        </TouchableOpacity>

        <Text style={styles.footerLegal}>
          Al continuar aceptas el uso local y offline-first de tus datos de salud.
        </Text>
      </SafeAreaView>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'android' ? SPACING.lg : SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: '#FAFAFA',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  backBtnHidden: { opacity: 0 },
  backBtnText: { fontSize: 18, color: '#475569', fontWeight: '700' },

  stepsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 6,
  },
  stepDotWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepSegment: {
    height: 4, flex: 1, borderRadius: 2,
  },
  stepSegmentDone:    { backgroundColor: '#6366F1' },
  stepSegmentPending: { backgroundColor: '#E2E8F0' },
  stepConnector: { width: 4, height: 4, backgroundColor: '#E2E8F0' },
  stepConnectorDone:  { backgroundColor: '#6366F1' },
  stepLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', letterSpacing: 0.5 },

  footer: {
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: 10, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#B91C1C', lineHeight: 18 },

  ctaBtn: {
    backgroundColor: '#6366F1', borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.sm,
    shadowColor: '#6366F1', shadowOpacity: 0.30, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  ctaBtnFinish: { backgroundColor: '#059669' },
  ctaBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  footerLegal: { fontSize: 11, color: '#CBD5E1', textAlign: 'center', lineHeight: 16 },
});
