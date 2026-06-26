import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import type { RootState } from '@/store/store';

function getStatus(value: number): { emoji: string; label: string; color: string } {
  if (value < 70)  return { emoji: '🔴', label: 'Glucosa baja — revisar', color: '#DC2626' };
  if (value > 180) return { emoji: '🟡', label: 'Glucosa alta — atención', color: '#D97706' };
  return { emoji: '🟢', label: 'Todo bien', color: '#16A34A' };
}

export default function ParentDashboardScreen() {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();
  const router        = useRouter();

  const readings  = useSelector((s: RootState) => s.health.glucoseReadings ?? []);
  const userName  = useSelector((s: RootState) => s.settings?.userName ?? 'tu hijo/a');

  const today      = new Date();
  const cutoff24   = Date.now() - 24 * 3_600_000;
  const todayReadings = readings.filter(r => new Date(r.timestamp).getTime() >= cutoff24);
  const latest        = todayReadings[todayReadings.length - 1];
  const status        = latest ? getStatus(latest.value) : null;

  const lastTime = latest
    ? (() => {
        const diff = Math.round((Date.now() - Date.parse(latest.timestamp)) / 60000);
        if (diff < 60) return `hace ${diff} min`;
        return `hace ${Math.round(diff / 60)}h`;
      })()
    : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ paddingLeft: 110 }}>
        <Text style={[styles.title, { color: C.dark }]}>Seguimiento de {userName}</Text>
        <Text style={[styles.subtitle, { color: C.darkTertiary }]}>
          {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Estado principal */}
      <View style={[styles.statusCard, { backgroundColor: C.white, borderColor: status?.color ?? C.border, borderWidth: 2 }]}>
        {status ? (
          <>
            <Text style={styles.statusEmoji}>{status.emoji}</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
              <Text style={[styles.glucoseVal, { color: C.dark }]}>
                {latest!.value} <Text style={styles.glucoseUnit}>mg/dL</Text>
              </Text>
              {lastTime && (
                <Text style={[styles.lastTime, { color: C.darkTertiary }]}>Última lectura {lastTime}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.statusEmoji}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: C.darkSecondary }]}>Sin datos hoy</Text>
              <Text style={[styles.lastTime, { color: C.darkTertiary }]}>Aún no hay lecturas registradas</Text>
            </View>
          </>
        )}
      </View>

      {/* Resumen del día */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>Resumen últimas 24h</Text>
      <View style={styles.summaryRow}>
        {[
          { label: 'Lecturas', value: todayReadings.length.toString(), emoji: '📊' },
          { label: 'En rango', value: todayReadings.filter(r => r.value >= 70 && r.value <= 180).length.toString(), emoji: '✅' },
          { label: 'Bajas', value: todayReadings.filter(r => r.value < 70).length.toString(), emoji: '⬇️' },
        ].map((item) => (
          <View key={item.label} style={[styles.summaryCard, { backgroundColor: C.white, borderColor: C.border }]}>
            <Text style={styles.summaryEmoji}>{item.emoji}</Text>
            <Text style={[styles.summaryValue, { color: C.dark }]}>{item.value}</Text>
            <Text style={[styles.summaryLabel, { color: C.darkTertiary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Botón ver detalle */}
      <TouchableOpacity
        style={[styles.detailBtn, { backgroundColor: C.health }]}
        onPress={() => router.push('/health' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.detailBtnText}>Ver gráfico completo →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flex: 1 },
  content:       { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  title:         { fontSize: 22, fontWeight: '700' },
  subtitle:      { fontSize: 13, marginTop: -SPACING.xs },
  statusCard:    { borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statusEmoji:   { fontSize: 44 },
  statusLabel:   { fontSize: 16, fontWeight: '700' },
  glucoseVal:    { fontSize: 36, fontWeight: '700' },
  glucoseUnit:   { fontSize: 18, fontWeight: '400' },
  lastTime:      { fontSize: 13 },
  sectionTitle:  { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryRow:    { flexDirection: 'row', gap: SPACING.sm },
  summaryCard:   { flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, alignItems: 'center', gap: 4 },
  summaryEmoji:  { fontSize: 22 },
  summaryValue:  { fontSize: 26, fontWeight: '700' },
  summaryLabel:  { fontSize: 11, textAlign: 'center' },
  detailBtn:     { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, alignItems: 'center' },
  detailBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
