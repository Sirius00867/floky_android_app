/**
 * StepPersonalization — Pantalla 2 de 3
 *
 * Combina:
 *  • Input del nombre (usuario o hijo/a según modo)
 *  • Switch de Modo Dislexia → dispara displayMode en Redux al instante
 *    para que la tipografía cambie en tiempo real y el usuario lo vea.
 *
 * El nombre se almacena en el draft; el displayMode se despacha al padre
 * para que lo envíe a Redux inmediatamente.
 */
import React from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import type { UserMode } from '@/store/slices/userModeSlice';

export interface PersonalizationDraft {
  name: string;
  dyslexiaMode: boolean;  // true → 'dyslexia', false → 'normal'
}

interface Props {
  draft: PersonalizationDraft;
  onChange: (d: PersonalizationDraft) => void;
  /** Se llama cada vez que el switch cambia para actualizar Redux al instante */
  onDyslexiaModeChange: (enabled: boolean) => void;
  mode: UserMode | null;
}

const NAME_PLACEHOLDER: Record<string, string> = {
  adolescent: 'Tu nombre o apodo',
  adult:      'Tu nombre',
  parent:     'Nombre de tu hijo/a',
  default:    'Nombre',
};

export function StepPersonalization({ draft, onChange, onDyslexiaModeChange, mode }: Props) {
  const set = (partial: Partial<PersonalizationDraft>) =>
    onChange({ ...draft, ...partial });

  const nameInvalid = draft.name.trim().length > 0 && draft.name.trim().length < 2;

  const handleDyslexia = (val: boolean) => {
    set({ dyslexiaMode: val });
    onDyslexiaModeChange(val);   // preview inmediata
  };

  const placeholder = NAME_PLACEHOLDER[mode ?? 'default'];
  const nameLabel = mode === 'parent'
    ? '¿Cómo se llama tu hijo/a?'
    : '¿Cómo te llamamos?';
  const nameHint = mode === 'parent'
    ? 'Lo usaremos en las alertas y el dashboard de seguimiento.'
    : 'Personalizamos tus mensajes y misiones con tu nombre.';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Encabezado ── */}
          <View style={styles.header}>
            <Text style={styles.badge}>2 de 3</Text>
            <Text style={styles.title}>Personaliza tu experiencia</Text>
            <Text style={styles.subtitle}>
              Dos ajustes rápidos que hacen grande la diferencia.
            </Text>
          </View>

          {/* ── Card: Nombre ── */}
          <View style={styles.card}>
            <Text style={styles.cardIcon}>👤</Text>
            <Text style={styles.cardLabel}>{nameLabel}</Text>
            <Text style={styles.cardHint}>{nameHint}</Text>

            <TextInput
              style={[
                styles.input,
                draft.dyslexiaMode && styles.inputDyslexia,
                nameInvalid && styles.inputError,
              ]}
              value={draft.name}
              onChangeText={t => set({ name: t })}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              maxLength={24}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              accessibilityLabel={nameLabel}
            />
            <View style={styles.charCountRow}>
              {nameInvalid && (
                <Text style={styles.nameError}>Mínimo 2 caracteres</Text>
              )}
              <Text style={[styles.charCount, nameInvalid && { color: '#EF4444' }]}>
                {draft.name.length} / 24
              </Text>
            </View>
          </View>

          {/* ── Card: Modo Dislexia ── */}
          <View style={[styles.card, draft.dyslexiaMode && styles.cardDyslexiaActive]}>
            <View style={styles.dyslexiaHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, draft.dyslexiaMode && styles.cardLabelActive]}>
                  📖  Modo Dislexia
                </Text>
                <Text style={styles.cardHint}>
                  Activa la fuente OpenDyslexic, mayor interlineado y espaciado entre letras
                  para facilitar la lectura.
                </Text>
              </View>
              <Switch
                value={draft.dyslexiaMode}
                onValueChange={handleDyslexia}
                trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                thumbColor={draft.dyslexiaMode ? '#6366F1' : '#94A3B8'}
                style={{ flexShrink: 0 }}
                accessibilityLabel="Activar modo dislexia"
              />
            </View>

            {/* Preview de tipografía en tiempo real */}
            <View style={[
              styles.previewBox,
              draft.dyslexiaMode ? styles.previewBoxActive : styles.previewBoxNormal,
            ]}>
              <Text style={[
                styles.previewText,
                draft.dyslexiaMode ? styles.previewTextDyslexia : styles.previewTextNormal,
              ]}>
                "Mi glucosa bajó, necesito{'\n'}comer algo ahora."
              </Text>
              <Text style={styles.previewTag}>
                {draft.dyslexiaMode ? '✓ OpenDyslexic activa' : 'Fuente estándar'}
              </Text>
            </View>

            {/* Beneficios del modo */}
            {draft.dyslexiaMode && (
              <View style={styles.benefitsList}>
                {[
                  '✓  Fuente OpenDyslexic optimizada',
                  '✓  Interlineado 1.8× para reducir confusión visual',
                  '✓  Espaciado de letras +1px',
                  '✓  Sin texto en mayúsculas sostenidas',
                ].map(b => (
                  <Text key={b} style={styles.benefitItem}>{b}</Text>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.footer}>
            Puedes cambiar estas preferencias en cualquier momento desde Ajustes.
          </Text>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function validatePersonalization(d: PersonalizationDraft): string | null {
  if (d.name.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
  return null;
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.xl, paddingBottom: 40 },

  header: { marginBottom: SPACING.xl },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E0E7FF', color: '#4338CA',
    fontSize: 12, fontWeight: '700', letterSpacing: 1,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, marginBottom: SPACING.md, overflow: 'hidden',
  },
  title:    { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3, lineHeight: 34 },
  subtitle: { fontSize: 15, color: '#64748B', lineHeight: 22, marginTop: 6 },

  card: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: SPACING.lg, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardDyslexiaActive: { borderColor: '#A5B4FC', backgroundColor: '#F5F3FF' },

  cardIcon:  { fontSize: 24, marginBottom: SPACING.sm },
  cardLabel: { fontSize: 17, fontWeight: '700', color: '#1E293B', lineHeight: 24, marginBottom: 4 },
  cardLabelActive: { color: '#4338CA' },
  cardHint:  { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: SPACING.md },

  input: {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    fontSize: 16, color: '#0F172A', lineHeight: 22, backgroundColor: '#F8FAFC',
  },
  inputDyslexia: {
    fontFamily: 'OpenDyslexic',
    letterSpacing: 1, lineHeight: 28,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  charCountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  nameError: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  charCount: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },

  dyslexiaHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },

  previewBox: {
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
    borderWidth: 1, marginBottom: SPACING.sm,
  },
  previewBoxNormal:  { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  previewBoxActive:  { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  previewText: { color: '#1E293B', marginBottom: 6 },
  previewTextNormal:   { fontSize: 15, lineHeight: 22 },
  previewTextDyslexia: { fontSize: 15, lineHeight: 27, letterSpacing: 1 },
  previewTag: { fontSize: 11, color: '#6366F1', fontWeight: '600' },

  benefitsList: { gap: 4, marginTop: 4 },
  benefitItem: { fontSize: 13, color: '#4338CA', lineHeight: 20 },

  footer: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
});
