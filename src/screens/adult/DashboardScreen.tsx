import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
// layout-fix: header paddingLeft clears floky button
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import type { RootState } from '@/store/store';

// Colores accesibles tanto en light como dark: versiones claras para fondo oscuro
function statLabel(val: number, low: number, high: number, isDark = false) {
  if (val < low)  return { label: 'Bajo',     color: isDark ? '#93C5FD' : '#1D4ED8' };
  if (val > high) return { label: 'Alto',      color: isDark ? '#FCA5A5' : '#DC2626' };
  return           { label: 'En rango',        color: isDark ? '#6EE7B7' : '#059669' };
}

export default function AdultDashboardScreen() {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();
  const router        = useRouter();
  const isDark        = useSelector((s: RootState) => (s.settings as any)?.colorScheme === 'dark');

  const readings   = useSelector((s: RootState) => s.health.glucoseReadings ?? []);
  const liveCgm    = useSelector((s: RootState) => (s.health as any).liveCgmReading as { value: number; timestamp: string; trend?: string; source: string } | null);
  const userName   = useSelector((s: RootState) => s.settings?.userName ?? '');

  const today      = new Date();
  const cutoff24   = Date.now() - 24 * 3_600_000;
  const todayReadings = readings.filter(r => new Date(r.timestamp).getTime() >= cutoff24);

  // Combina lecturas manuales + CGM en vivo para stats
  const allReadings = liveCgm
    ? [...todayReadings.filter(r => r.timestamp !== liveCgm.timestamp), { value: liveCgm.value, timestamp: liveCgm.timestamp }]
    : todayReadings;

  // La más reciente: preferir CGM en vivo si es más nueva
  const latestManual = todayReadings[todayReadings.length - 1];
  const latest = liveCgm && (!latestManual || new Date(liveCgm.timestamp) >= new Date(latestManual.timestamp))
    ? liveCgm
    : latestManual;
  const values    = allReadings.map(r => r.value).filter(Boolean);
  const mean      = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const inRange   = values.filter(v => v >= 70 && v <= 180).length;
  const pctRange  = values.length ? Math.round((inRange / values.length) * 100) : null;
  const status    = latest ? statLabel(latest.value, 70, 180, isDark) : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: isDark ? C.dark : C.darkSecondary }]}>
          {userName ? `Hola, ${userName}` : 'Dashboard'}
        </Text>
        <Text style={[styles.date, { color: isDark ? C.darkSecondary : C.darkTertiary }]}>
          {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Glucosa actual */}
      <TouchableOpacity
        style={[styles.mainCard, { backgroundColor: C.white, borderColor: C.border }]}
        onPress={() => router.push('/health' as any)}
        activeOpacity={0.8}
      >
        <View style={styles.mainCardLeft}>
          <Text style={[styles.mainCardLabel, { color: C.darkTertiary }]}>Glucosa actual</Text>
          {latest ? (
            <Text style={[styles.mainCardValue, { color: C.dark }]}>{latest.value} <Text style={styles.mainCardUnit}>mg/dL</Text></Text>
          ) : (
            <Text style={[styles.mainCardValue, { color: C.darkTertiary }]}>—</Text>
          )}
          {status && (
            <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.chevron, { color: C.darkTertiary }]}>›</Text>
      </TouchableOpacity>

      {/* Stats del día */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.statLabel, { color: C.darkTertiary }]}>Media 24h</Text>
          <Text style={[styles.statValue, { color: C.dark }]}>{mean ?? '—'}</Text>
          {mean && <Text style={[styles.statUnit, { color: C.darkTertiary }]}>mg/dL</Text>}
        </View>
        <View style={[styles.statCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.statLabel, { color: C.darkTertiary }]}>En rango</Text>
          <Text style={[styles.statValue, { color: pctRange !== null && pctRange >= 70 ? C.green : C.yellow }]}>
            {pctRange !== null ? `${pctRange}%` : '—'}
          </Text>
          {pctRange !== null && <Text style={[styles.statUnit, { color: C.darkTertiary }]}>70–180</Text>}
        </View>
        <View style={[styles.statCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.statLabel, { color: C.darkTertiary }]}>Lecturas</Text>
          <Text style={[styles.statValue, { color: C.dark }]}>{values.length}</Text>
          <Text style={[styles.statUnit, { color: C.darkTertiary }]}>24h</Text>
        </View>
      </View>

      {/* Accesos rápidos */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>Accesos rápidos</Text>
      <View style={styles.quickRow}>
        {[
          { label: 'Añadir\nlectura', emoji: '➕', href: '/health' },
          { label: 'Ver\ngráfico', emoji: '📈', href: '/health' },
          { label: 'Insulina', emoji: '💉', href: '/study' },
          { label: 'Informes', emoji: '📄', href: '/home' },
        ].map((q) => (
          <TouchableOpacity
            key={q.label}
            style={[styles.quickCard, { backgroundColor: C.white, borderColor: C.border }]}
            onPress={() => router.push(q.href as any)}
            activeOpacity={0.75}
          >
            <Text style={styles.quickEmoji}>{q.emoji}</Text>
            <Text style={[styles.quickLabel, { color: C.darkSecondary }]}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1 },
  content:      { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  header:       { gap: 2, marginBottom: SPACING.xs, paddingLeft: 110 },
  greeting:     { fontSize: 22, fontWeight: '700' },
  date:         { fontSize: 13 },
  mainCard:     { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, flexDirection: 'row', alignItems: 'center' },
  mainCardLeft: { flex: 1, gap: 6 },
  mainCardLabel:{ fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  mainCardValue:{ fontSize: 48, fontWeight: '700', lineHeight: 52 },
  mainCardUnit: { fontSize: 20, fontWeight: '400' },
  statusBadge:  { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 12, fontWeight: '700' },
  chevron:      { fontSize: 24 },
  statsRow:     { flexDirection: 'row', gap: SPACING.sm },
  statCard:     { flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 2 },
  statLabel:    { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue:    { fontSize: 24, fontWeight: '700' },
  statUnit:     { fontSize: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: SPACING.xs },
  quickRow:     { flexDirection: 'row', gap: SPACING.sm },
  quickCard:    { flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 6 },
  quickEmoji:   { fontSize: 22 },
  quickLabel:   { fontSize: 11, textAlign: 'center', lineHeight: 15 },
});
