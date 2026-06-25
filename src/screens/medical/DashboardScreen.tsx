import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import type { RootState } from '@/store/store';

function calcMetrics(values: number[]) {
  if (!values.length) return null;
  const mean   = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const sd     = Math.sqrt(variance);
  const cv     = (sd / mean) * 100;
  const inRange = values.filter(v => v >= 70 && v <= 180).length;
  const low     = values.filter(v => v < 70).length;
  const high    = values.filter(v => v > 180).length;
  return {
    mean: Math.round(mean),
    sd:   Math.round(sd),
    cv:   Math.round(cv),
    tir:  Math.round((inRange / values.length) * 100),
    tbr:  Math.round((low / values.length) * 100),
    tar:  Math.round((high / values.length) * 100),
    count: values.length,
  };
}

export default function MedicalDashboardScreen() {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();

  const readings  = useSelector((s: RootState) => s.health.glucoseReadings ?? []);
  const userName  = useSelector((s: RootState) => s.settings?.userName ?? 'Paciente');

  const today      = new Date();
  const cutoff24   = Date.now() - 24 * 3_600_000;
  const todayReadings = readings.filter(r => new Date(r.timestamp).getTime() >= cutoff24);
  const latest        = todayReadings[todayReadings.length - 1];
  const values        = todayReadings.map(r => r.value).filter(Boolean);
  const metrics       = calcMetrics(values);

  // Últimos 7 días
  const week = new Date(); week.setDate(week.getDate() - 7); week.setHours(0,0,0,0);
  const weekReadings = readings.filter(r => new Date(r.timestamp).getTime() >= week.getTime());
  const weekValues   = weekReadings.map(r => r.value).filter(Boolean);
  const weekMetrics  = calcMetrics(weekValues);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header clínico */}
      <View style={[styles.headerCard, { backgroundColor: C.white, borderColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.patientName, { color: C.dark }]}>{userName}</Text>
          <Text style={[styles.patientSub, { color: C.darkTertiary }]}>Diabetes tipo 1</Text>
        </View>
        <View style={styles.currentBox}>
          <Text style={[styles.currentLabel, { color: C.darkTertiary }]}>SGV actual</Text>
          <Text style={[styles.currentValue, { color: latest ? (latest.value < 70 ? C.red : latest.value > 180 ? C.yellow : C.green) : C.darkTertiary }]}>
            {latest ? latest.value : '—'}
          </Text>
          <Text style={[styles.currentUnit, { color: C.darkTertiary }]}>mg/dL</Text>
        </View>
      </View>

      {/* Métricas hoy */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>ÚLTIMAS 24H — {today.toLocaleDateString('es-ES')}</Text>
      {metrics ? (
        <View style={styles.metricsGrid}>
          {[
            { label: 'Media',  value: `${metrics.mean}`, unit: 'mg/dL' },
            { label: 'DE',     value: `${metrics.sd}`,   unit: 'mg/dL' },
            { label: 'CV',     value: `${metrics.cv}%`,  unit: '<36% ok' },
            { label: 'TIR',    value: `${metrics.tir}%`, unit: '70–180', highlight: metrics.tir >= 70 },
            { label: 'TBR',    value: `${metrics.tbr}%`, unit: '<70', warn: metrics.tbr > 4 },
            { label: 'TAR',    value: `${metrics.tar}%`, unit: '>180', warn: metrics.tar > 25 },
          ].map((m) => (
            <View key={m.label} style={[styles.metricCell, { backgroundColor: C.white, borderColor: C.border }]}>
              <Text style={[styles.metricLabel, { color: C.darkTertiary }]}>{m.label}</Text>
              <Text style={[
                styles.metricValue,
                { color: m.highlight ? C.green : m.warn ? C.red : C.dark },
              ]}>{m.value}</Text>
              <Text style={[styles.metricUnit, { color: C.darkTertiary }]}>{m.unit}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.emptyText, { color: C.darkTertiary }]}>Sin lecturas hoy</Text>
        </View>
      )}

      {/* Métricas 7 días */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>ÚLTIMOS 7 DÍAS ({weekMetrics?.count ?? 0} lecturas)</Text>
      {weekMetrics ? (
        <View style={styles.metricsGrid}>
          {[
            { label: 'Media',  value: `${weekMetrics.mean}`, unit: 'mg/dL' },
            { label: 'DE',     value: `${weekMetrics.sd}`,   unit: 'mg/dL' },
            { label: 'CV',     value: `${weekMetrics.cv}%`,  unit: '<36% ok' },
            { label: 'TIR',    value: `${weekMetrics.tir}%`, unit: '70–180', highlight: weekMetrics.tir >= 70 },
            { label: 'TBR',    value: `${weekMetrics.tbr}%`, unit: '<70', warn: weekMetrics.tbr > 4 },
            { label: 'TAR',    value: `${weekMetrics.tar}%`, unit: '>180', warn: weekMetrics.tar > 25 },
          ].map((m) => (
            <View key={m.label} style={[styles.metricCell, { backgroundColor: C.white, borderColor: C.border }]}>
              <Text style={[styles.metricLabel, { color: C.darkTertiary }]}>{m.label}</Text>
              <Text style={[
                styles.metricValue,
                { color: m.highlight ? C.green : m.warn ? C.red : C.dark },
              ]}>{m.value}</Text>
              <Text style={[styles.metricUnit, { color: C.darkTertiary }]}>{m.unit}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.emptyText, { color: C.darkTertiary }]}>Sin datos de la semana</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flex: 1 },
  content:       { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  headerCard:    { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, flexDirection: 'row', alignItems: 'center' },
  patientName:   { fontSize: 16, fontWeight: '700' },
  patientSub:    { fontSize: 12, marginTop: 2 },
  currentBox:    { alignItems: 'flex-end', gap: 1 },
  currentLabel:  { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  currentValue:  { fontSize: 36, fontWeight: '700', lineHeight: 38 },
  currentUnit:   { fontSize: 10 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  metricsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  metricCell:    { width: '31%', borderRadius: BORDER_RADIUS.sm, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 2 },
  metricLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  metricValue:   { fontSize: 20, fontWeight: '700' },
  metricUnit:    { fontSize: 9 },
  emptyCard:     { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, alignItems: 'center' },
  emptyText:     { fontSize: 13 },
});
