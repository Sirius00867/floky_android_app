/**
 * StepIdentification — Pantalla 1 de 3
 *
 * Combina:
 *  • Selección de tipo de usuario (Adolescente, Adulto, Padre)
 *  • Validación legal de edad (≥14)
 *  • Widget condicional para modo Padre: edad del menor (<16 / ≥16)
 *
 * No despacha nada al Redux: rellena el draft del padre.
 */
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Switch,
} from 'react-native';
import type { UserMode } from '@/store/slices/userModeSlice';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

// ── Paleta por modo ──────────────────────────────────────────────────────────

const MODE_CONFIG: Record<UserMode, {
  emoji: string; label: string; sublabel: string;
  bg: string; accent: string; accentLight: string;
}> = {
  adolescent: {
    emoji: '🎮',
    label: 'Soy adolescente',
    sublabel: 'Gamificado, visual y accesible',
    bg: '#EEF2FF', accent: '#6366F1', accentLight: '#C7D2FE',
  },
  adult: {
    emoji: '📊',
    label: 'Soy adulto con diabetes',
    sublabel: 'Datos detallados, sin distracciones',
    bg: '#EFF6FF', accent: '#1D4ED8', accentLight: '#BFDBFE',
  },
  parent: {
    emoji: '👨‍👧',
    label: 'Soy padre / madre',
    sublabel: 'Seguimiento del hijo/a en tiempo real',
    bg: '#F0FDF4', accent: '#16A34A', accentLight: '#BBF7D0',
  },
};

const MODES: UserMode[] = ['adolescent', 'adult', 'parent'];

export interface IdentificationDraft {
  mode: UserMode | null;
  ageVerified: boolean;       // el usuario confirma tener ≥14 años (o ser padre)
  isMinor: boolean;           // hijo/a del padre tiene <16 años
  parentalConsentAccepted: boolean;
}

interface Props {
  draft: IdentificationDraft;
  onChange: (d: IdentificationDraft) => void;
  /** True cuando el padre ya intentó continuar y falló — fuerza mostrar errores inline */
  forceShowErrors?: boolean;
}

export function StepIdentification({ draft, onChange, forceShowErrors = false }: Props) {
  const [ageError, setAgeError] = useState(false);
  // Muestra el error si el padre forzó validación y el Switch sigue sin activar
  const showAgeError = ageError || (forceShowErrors && !draft.ageVerified && draft.mode !== null && draft.mode !== 'parent');

  const set = (partial: Partial<IdentificationDraft>) =>
    onChange({ ...draft, ...partial });

  const handleModePress = (mode: UserMode) => {
    setAgeError(false);
    set({ mode, ageVerified: false, isMinor: false, parentalConsentAccepted: false });
  };

  const handleAgeToggle = (val: boolean) => {
    if (!val) { setAgeError(true); }
    else       { setAgeError(false); }
    set({ ageVerified: val });
  };

  const accent = draft.mode ? MODE_CONFIG[draft.mode].accent : '#6366F1';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Encabezado ── */}
        <View style={styles.header}>
          <Text style={styles.badge}>1 de 3</Text>
          <Text style={styles.title}>¿Quién eres?</Text>
          <Text style={styles.subtitle}>
            Floky se adapta completamente a ti.{'\n'}Elige tu perfil para empezar.
          </Text>
        </View>

        {/* ── Tarjetas de modo ── */}
        <View style={styles.cardsWrap}>
          {MODES.map(mode => {
            const cfg = MODE_CONFIG[mode];
            const selected = draft.mode === mode;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.78}
                style={[
                  styles.modeCard,
                  { backgroundColor: cfg.bg, borderColor: selected ? cfg.accent : 'transparent' },
                  selected && styles.modeCardSelected,
                ]}
                onPress={() => handleModePress(mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={cfg.label}
              >
                {/* Indicador de selección */}
                <View style={[
                  styles.radioOuter,
                  { borderColor: selected ? cfg.accent : '#CBD5E1' },
                ]}>
                  {selected && <View style={[styles.radioInner, { backgroundColor: cfg.accent }]} />}
                </View>

                <View style={styles.modeCardBody}>
                  <Text style={styles.modeEmoji}>{cfg.emoji}</Text>
                  <View style={styles.modeTextWrap}>
                    <Text style={[styles.modeLabel, selected && { color: cfg.accent }]}>
                      {cfg.label}
                    </Text>
                    <Text style={styles.modeSublabel}>{cfg.sublabel}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Widget condicional: Modo Padre ── */}
        {draft.mode === 'parent' && (
          <View style={[styles.parentWidget, { borderColor: '#BBF7D0' }]}>
            <Text style={styles.widgetTitle}>🧒 ¿Cuántos años tiene tu hijo/a?</Text>
            <Text style={styles.widgetHint}>
              Esto ajusta las alertas y el nivel de privacidad de datos.
            </Text>

            {/* Botones de edad menor/mayor */}
            <View style={styles.ageBtnRow}>
              <TouchableOpacity
                style={[
                  styles.ageBtn,
                  !draft.isMinor && { backgroundColor: '#16A34A' },
                ]}
                onPress={() => set({ isMinor: false, parentalConsentAccepted: false })}
                accessibilityLabel="16 años o más"
              >
                <Text style={[styles.ageBtnLabel, !draft.isMinor && { color: '#fff' }]}>
                  16 años o más
                </Text>
                <Text style={[styles.ageBtnSub, !draft.isMinor && { color: '#D1FAE5' }]}>
                  Protección estándar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.ageBtn,
                  draft.isMinor && { backgroundColor: '#DC2626' },
                ]}
                onPress={() => set({ isMinor: true })}
                accessibilityLabel="Menos de 16 años"
              >
                <Text style={[styles.ageBtnLabel, draft.isMinor && { color: '#fff' }]}>
                  Menos de 16
                </Text>
                <Text style={[styles.ageBtnSub, draft.isMinor && { color: '#FEE2E2' }]}>
                  Requiere tu consentimiento
                </Text>
              </TouchableOpacity>
            </View>

            {/* Consentimiento parental (sólo si menor) */}
            {draft.isMinor && (
              <View style={styles.consentBox}>
                <Text style={styles.consentText}>
                  Como titular de la patria potestad o tutela legal, consiento el uso de esta
                  aplicación para la monitorización de salud de mi hijo/a menor de 16 años,
                  conforme al RGPD Art. 8.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.consentBtn,
                    draft.parentalConsentAccepted && { backgroundColor: '#16A34A' },
                  ]}
                  onPress={() => set({ parentalConsentAccepted: !draft.parentalConsentAccepted })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draft.parentalConsentAccepted }}
                >
                  <Text style={[styles.consentBtnLabel,
                    draft.parentalConsentAccepted && { color: '#fff' }]}>
                    {draft.parentalConsentAccepted ? '✓  Consentimiento aceptado' : 'Acepto como tutor/a legal'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Verificación de edad (adolescente / adulto) ── */}
        {draft.mode && draft.mode !== 'parent' && (
          <View style={[
            styles.ageVerifBox,
            showAgeError && { borderColor: '#EF4444', backgroundColor: '#FFF5F5' },
          ]}>
            {/* Etiqueta de campo requerido */}
            {!draft.ageVerified && (
              <Text style={styles.ageVerifRequired}>* Requerido para continuar</Text>
            )}
            <View style={styles.ageVerifRow}>
              <View style={styles.ageVerifTextWrap}>
                <Text style={styles.ageVerifLabel}>
                  Confirmo que tengo 14 años o más
                </Text>
                <Text style={styles.ageVerifHint}>
                  Requerido por la legislación de protección de datos
                </Text>
              </View>
              <Switch
                value={draft.ageVerified}
                onValueChange={handleAgeToggle}
                trackColor={{ false: '#E2E8F0', true: `${accent}80` }}
                thumbColor={draft.ageVerified ? accent : '#94A3B8'}
                style={{ flexShrink: 0 }}
                accessibilityLabel="Confirmar edad mínima de 14 años"
              />
            </View>
            {showAgeError && (
              <Text style={styles.ageError}>
                Debes confirmar que tienes 14 años o más para usar Floky
              </Text>
            )}
          </View>
        )}

        {/* Espacio extra para el botón fijo del padre */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Validación exportable ────────────────────────────────────────────────────

export function validateIdentification(d: IdentificationDraft): string | null {
  if (!d.mode) return 'Elige tu perfil para continuar';
  if (d.mode !== 'parent' && !d.ageVerified)
    return 'Confirma que tienes 14 años o más';
  if (d.mode === 'parent' && d.isMinor && !d.parentalConsentAccepted)
    return 'Acepta el consentimiento parental para continuar';
  return null;
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: 40 },

  header: { marginBottom: SPACING.xl },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF', color: '#4338CA',
    fontSize: 12, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginBottom: SPACING.md, overflow: 'hidden',
  },
  title: {
    fontSize: 28, fontWeight: '800', color: '#0F172A',
    letterSpacing: -0.3, lineHeight: 34,
  },
  subtitle: {
    fontSize: 15, color: '#64748B', lineHeight: 22, marginTop: 6,
  },

  cardsWrap: { gap: SPACING.sm },
  modeCard: {
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2.5,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modeCardSelected: { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 3 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioInner: { width: 11, height: 11, borderRadius: 6 },
  modeCardBody: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 },
  modeEmoji: { fontSize: 28 },
  modeTextWrap: { flex: 1 },
  modeLabel: { fontSize: 16, fontWeight: '700', color: '#1E293B', lineHeight: 22 },
  modeSublabel: { fontSize: 13, color: '#64748B', lineHeight: 18, marginTop: 2 },

  parentWidget: {
    marginTop: SPACING.lg, borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, backgroundColor: '#F0FDF4', padding: SPACING.md,
  },
  widgetTitle: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 4 },
  widgetHint: { fontSize: 13, color: '#4ADE80', lineHeight: 18, marginBottom: SPACING.md },

  ageBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  ageBtn: {
    flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: '#BBF7D0',
    backgroundColor: '#fff', padding: SPACING.md, alignItems: 'center',
  },
  ageBtnLabel: { fontSize: 14, fontWeight: '700', color: '#166534' },
  ageBtnSub: { fontSize: 11, color: '#64748B', marginTop: 2 },

  consentBox: {
    marginTop: SPACING.md, backgroundColor: '#FEF2F2', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, borderWidth: 1, borderColor: '#FECACA',
  },
  consentText: { fontSize: 12, color: '#7F1D1D', lineHeight: 18, marginBottom: SPACING.sm },
  consentBtn: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DC2626',
    borderRadius: BORDER_RADIUS.sm, paddingVertical: 10, paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  consentBtnLabel: { fontSize: 14, fontWeight: '700', color: '#DC2626' },

  ageVerifBox: {
    marginTop: SPACING.lg, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#fff',
    padding: SPACING.md,
  },
  ageVerifRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ageVerifTextWrap: { flex: 1 },
  ageVerifRequired: { fontSize: 11, color: '#F97316', fontWeight: '700', marginBottom: 6 },
  ageVerifLabel: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  ageVerifHint:  { fontSize: 12, color: '#94A3B8', marginTop: 2, lineHeight: 16 },
  ageError: { fontSize: 12, color: '#EF4444', marginTop: SPACING.sm, lineHeight: 16 },
});
