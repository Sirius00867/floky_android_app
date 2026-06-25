/**
 * StepLegalConnection — Pantalla 3 de 3
 *
 * Combina:
 *  • Exención de responsabilidad médica (no es dispositivo certificado,
 *    almacenamiento local, sin transmisión a terceros)
 *  • Checkbox de aceptación de términos (obligatorio para continuar)
 *  • Campo opcional para URL de Nightscout + botón "Saltar este paso"
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, TouchableOpacity, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

export interface LegalConnectionDraft {
  legalAccepted: boolean;
  nightscoutUrl: string;
  nightscoutApiSecret: string;
  nsSkipped: boolean;   // true cuando el usuario pulsó "Saltar"
}

interface Props {
  draft: LegalConnectionDraft;
  onChange: (d: LegalConnectionDraft) => void;
}

const DISCLAIMER_ITEMS = [
  {
    icon: '🚫',
    title: 'No es un dispositivo médico certificado',
    body:  'Floky no está homologado por la AEMPS, FDA ni CE como dispositivo médico. No tomes decisiones de dosificación basándote únicamente en esta app.',
  },
  {
    icon: '📱',
    title: 'Datos almacenados sólo en tu dispositivo',
    body:  'Toda tu información de salud se guarda localmente. No se envía a servidores externos salvo que conectes voluntariamente Nightscout u otro servicio.',
  },
  {
    icon: '🔒',
    title: 'Sin venta de datos ni publicidad',
    body:  'Floky no comparte tus datos con terceros. No hay publicidad ni análisis de comportamiento enviado fuera de tu teléfono.',
  },
  {
    icon: '👨‍⚕️',
    title: 'Siempre consulta a tu equipo médico',
    body:  'Esta aplicación es una herramienta de apoyo. Cualquier ajuste de insulina, dieta o ejercicio debe ser validado por tu endocrinólogo o médico de cabecera.',
  },
];

export function StepLegalConnection({ draft, onChange }: Props) {
  const [nsExpanded, setNsExpanded] = useState(false);
  const set = (partial: Partial<LegalConnectionDraft>) => onChange({ ...draft, ...partial });

  const handleSkipNs = () => set({ nsSkipped: true, nightscoutUrl: '', nightscoutApiSecret: '' });
  const handleConnectNs = () => {
    setNsExpanded(true);
    set({ nsSkipped: false });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Encabezado ── */}
          <View style={styles.header}>
            <Text style={styles.badge}>3 de 3</Text>
            <Text style={styles.title}>Casi listos</Text>
            <Text style={styles.subtitle}>
              Lee esto rápido y conecta tu CGM si tienes uno.
            </Text>
          </View>

          {/* ── Tarjeta de exención médica ── */}
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>⚕️  Información importante de salud</Text>
            {DISCLAIMER_ITEMS.map(item => (
              <View key={item.icon} style={styles.disclaimerItem}>
                <Text style={styles.disclaimerIcon}>{item.icon}</Text>
                <View style={styles.disclaimerTextWrap}>
                  <Text style={styles.disclaimerItemTitle}>{item.title}</Text>
                  <Text style={styles.disclaimerItemBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Checkbox de aceptación ── */}
          <TouchableOpacity
            style={[
              styles.consentRow,
              draft.legalAccepted && styles.consentRowAccepted,
            ]}
            onPress={() => set({ legalAccepted: !draft.legalAccepted })}
            activeOpacity={0.75}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: draft.legalAccepted }}
          >
            <View style={[styles.checkbox, draft.legalAccepted && styles.checkboxChecked]}>
              {draft.legalAccepted && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentLabel}>
              He leído y entiendo que Floky es una herramienta de apoyo, no un sustituto
              del criterio médico profesional.
            </Text>
          </TouchableOpacity>

          {/* ── Sección Nightscout (opcional) ── */}
          <View style={styles.nsCard}>
            <View style={styles.nsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nsTitle}>🌐  Conectar Nightscout</Text>
                <Text style={styles.nsSubtitle}>
                  Opcional · Recibe tu glucosa en tiempo real
                </Text>
              </View>
              <View style={styles.nsBadge}>
                <Text style={styles.nsBadgeText}>OPCIONAL</Text>
              </View>
            </View>

            <Text style={styles.nsHint}>
              Si usas Nightscout, Libre LinkUp, Dexcom Share u otro sistema CGM,
              puedes conectarlo aquí. También puedes hacerlo más tarde desde Ajustes.
            </Text>

            {/* Botones: Conectar / Saltar */}
            {!nsExpanded && !draft.nsSkipped && (
              <View style={styles.nsBtnRow}>
                <TouchableOpacity style={styles.nsConnectBtn} onPress={handleConnectNs}>
                  <Text style={styles.nsConnectLabel}>Conectar ahora</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nsSkipBtn} onPress={handleSkipNs}>
                  <Text style={styles.nsSkipLabel}>Saltar este paso</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Mensaje de saltar */}
            {draft.nsSkipped && !nsExpanded && (
              <TouchableOpacity
                style={styles.nsSkippedMsg}
                onPress={() => { setNsExpanded(true); set({ nsSkipped: false }); }}
              >
                <Text style={styles.nsSkippedText}>
                  Paso saltado · Toca aquí para conectar igualmente
                </Text>
              </TouchableOpacity>
            )}

            {/* Formulario de Nightscout expandido */}
            {nsExpanded && (
              <View style={styles.nsForm}>
                <Text style={styles.nsFormLabel}>URL de tu instancia Nightscout</Text>
                <TextInput
                  style={styles.nsInput}
                  value={draft.nightscoutUrl}
                  onChangeText={t => set({ nightscoutUrl: t })}
                  placeholder="https://minightscout.herokuapp.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="next"
                  accessibilityLabel="URL de Nightscout"
                />

                <Text style={[styles.nsFormLabel, { marginTop: SPACING.md }]}>
                  API Secret <Text style={styles.nsOptional}>(si tu instancia lo requiere)</Text>
                </Text>
                <TextInput
                  style={styles.nsInput}
                  value={draft.nightscoutApiSecret}
                  onChangeText={t => set({ nightscoutApiSecret: t })}
                  placeholder="api_secret_aquí"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  returnKeyType="done"
                  accessibilityLabel="API Secret de Nightscout"
                />

                <TouchableOpacity style={styles.nsSkipBtn} onPress={handleSkipNs}>
                  <Text style={styles.nsSkipLabel}>↩  Saltar y no conectar ahora</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => Linking.openURL('https://nightscout.github.io')}
                  accessibilityRole="link"
                >
                  <Text style={styles.nsLink}>¿Qué es Nightscout? →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function validateLegalConnection(d: LegalConnectionDraft): string | null {
  if (!d.legalAccepted)
    return 'Debes leer y aceptar la información médica para continuar';
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

  disclaimerCard: {
    backgroundColor: '#FFF7ED', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, borderColor: '#FED7AA', padding: SPACING.lg, marginBottom: SPACING.md,
  },
  disclaimerTitle: { fontSize: 15, fontWeight: '800', color: '#C2410C', marginBottom: SPACING.md },
  disclaimerItem:  { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  disclaimerIcon:  { fontSize: 18, paddingTop: 1 },
  disclaimerTextWrap: { flex: 1 },
  disclaimerItemTitle: { fontSize: 14, fontWeight: '700', color: '#7C2D12', lineHeight: 20 },
  disclaimerItemBody:  { fontSize: 12, color: '#9A3412', lineHeight: 17, marginTop: 2 },

  consentRow: {
    flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: '#E2E8F0', padding: SPACING.md, marginBottom: SPACING.md,
  },
  consentRowAccepted: { borderColor: '#6EE7B7', backgroundColor: '#F0FDF4' },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#059669', borderColor: '#059669' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '900', lineHeight: 18 },
  consentLabel: { flex: 1, fontSize: 14, color: '#1E293B', lineHeight: 21 },

  nsCard: {
    backgroundColor: '#fff', borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: SPACING.lg, marginBottom: SPACING.md,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  nsHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  nsTitle:    { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  nsSubtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  nsBadge: {
    backgroundColor: '#E0E7FF', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  nsBadgeText: { fontSize: 10, fontWeight: '700', color: '#4338CA', letterSpacing: 0.5 },
  nsHint: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: SPACING.md },

  nsBtnRow: { flexDirection: 'row', gap: SPACING.sm },
  nsConnectBtn: {
    flex: 1, backgroundColor: '#0369A1', borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12, alignItems: 'center',
  },
  nsConnectLabel: { color: '#fff', fontSize: 14, fontWeight: '700' },
  nsSkipBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12, alignItems: 'center', backgroundColor: '#F8FAFC',
  },
  nsSkipLabel: { color: '#64748B', fontSize: 13, fontWeight: '600' },

  nsSkippedMsg: {
    backgroundColor: '#F1F5F9', borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 10, paddingHorizontal: SPACING.md, alignItems: 'center',
  },
  nsSkippedText: { fontSize: 13, color: '#64748B' },

  nsForm: { gap: 2 },
  nsFormLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  nsOptional: { fontWeight: '400', color: '#94A3B8' },
  nsInput: {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: 11,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  nsLink: { fontSize: 13, color: '#0369A1', marginTop: SPACING.sm, fontWeight: '600' },
});
