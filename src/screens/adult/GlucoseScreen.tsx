import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { addGlucoseReading } from '@/store/slices/healthSlice';
import { addPoints } from '@/store/slices/gamificationSlice';
import type { RootState } from '@/store/store';
import { GlucoseChart } from '@/components/shared/GlucoseChart';
import { useGlucoseData } from '@/hooks/useGlucoseData';
import type { AppColors } from '@/hooks/useAppColors';

function calcStats(values: number[], targetLow = 70, targetHigh = 180) {
  if (!values.length) return { mean: 0, sd: 0, tir: 0, tbr: 0, tar: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd   = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
  const tir  = values.filter(v => v >= targetLow && v <= targetHigh).length / values.length * 100;
  const tbr  = values.filter(v => v < targetLow).length  / values.length * 100;
  const tar  = values.filter(v => v > targetHigh).length / values.length * 100;
  return { mean: Math.round(mean), sd: Math.round(sd), tir: Math.round(tir), tbr: Math.round(tbr), tar: Math.round(tar) };
}

// ── Pantalla principal ────────────────────────────────────────────────────────

export default function AdultGlucoseScreen() {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();
  const dispatch      = useDispatch();

  const glucoseTargetLow  = useSelector((s: RootState) => s.settings.glucoseTargetLow ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings.glucoseTargetHigh ?? 180);
  const [input, setInput] = useState('');

  const { allReadings, nsLastTrend, isSyncing } = useGlucoseData();

  const sorted = [...allReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const values = sorted.map(r => r.value).filter(Boolean);
  const stats  = calcStats(values, glucoseTargetLow, glucoseTargetHigh);

  const handleAdd = () => {
    const val = parseInt(input, 10);
    if (!val || val < 20 || val > 600) {
      Alert.alert('Valor inválido', 'Introduce un valor entre 20 y 600 mg/dL');
      return;
    }
    dispatch(addGlucoseReading({
      value: val,
      timestamp: new Date().toISOString(),
      source: 'Fingerstick',
    }));
    dispatch(addPoints(10));
    setInput('');
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Valor actual + tendencia */}
      <View style={[styles.currentCard, { backgroundColor: C.white, borderColor: C.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.currentLabel, { color: C.darkTertiary }]}>
            Glucosa actual{isSyncing ? ' · sincronizando…' : ''}
          </Text>
          {latest ? (
            <>
              <View style={styles.currentRow}>
                <Text style={[styles.currentValue, {
                  color: latest.value < glucoseTargetLow ? C.red
                       : latest.value > glucoseTargetHigh ? C.yellow : C.dark,
                }]}>
                  {latest.value}
                </Text>
                <Text style={[styles.currentUnit, { color: C.darkTertiary }]}>mg/dL</Text>
              </View>
              <Text style={[styles.currentTime, { color: C.darkTertiary }]}>
                {new Date(latest.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                {' · '}{latest.source}
              </Text>
            </>
          ) : (
            <Text style={[styles.currentValue, { color: C.darkTertiary }]}>—</Text>
          )}
        </View>

        {/* Añadir lectura rápida */}
        <View style={styles.addBox}>
          <TextInput
            style={[styles.addInput, { backgroundColor: C.surface, borderColor: C.border, color: C.dark }]}
            placeholder="mg/dL"
            placeholderTextColor={C.darkTertiary}
            keyboardType="numeric"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            maxLength={3}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.health, opacity: input.length ? 1 : 0.4 }]}
            onPress={handleAdd}
            disabled={!input.length}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gráfico compartido — idéntico al del modo adolescente */}
      <View style={[styles.chartCard, { backgroundColor: C.white, borderColor: C.border }]}>
        <GlucoseChart
          readings={allReadings}
          C={C as unknown as AppColors}
          targetLow={glucoseTargetLow}
          targetHigh={glucoseTargetHigh}
        />
      </View>

      {/* Stats */}
      {values.length > 0 && (
        <View style={styles.statsGrid}>
          {[
            { label: 'Media', value: `${stats.mean}`, unit: 'mg/dL', color: C.dark },
            { label: 'DE',    value: `${stats.sd}`,   unit: 'mg/dL', color: C.dark },
            { label: 'TIR',   value: `${stats.tir}%`, unit: `${glucoseTargetLow}–${glucoseTargetHigh}`, color: stats.tir >= 70 ? C.green : C.yellow },
            { label: 'TBR',   value: `${stats.tbr}%`, unit: `<${glucoseTargetLow}`,  color: stats.tbr > 4 ? C.red : C.green },
            { label: 'TAR',   value: `${stats.tar}%`, unit: `>${glucoseTargetHigh}`, color: stats.tar > 25 ? C.yellow : C.green },
            { label: 'N',     value: `${values.length}`, unit: 'lecturas', color: C.dark },
          ].map(s => (
            <View key={s.label} style={[styles.statCell, { backgroundColor: C.white, borderColor: C.border }]}>
              <Text style={[styles.statLabel, { color: C.darkTertiary }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statUnit, { color: C.darkTertiary }]}>{s.unit}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Historial (últimas 20) */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>HISTORIAL</Text>
      {sorted.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.emptyText, { color: C.darkTertiary }]}>Sin lecturas todavía</Text>
        </View>
      ) : (
        <View style={[styles.historyCard, { backgroundColor: C.white, borderColor: C.border }]}>
          {[...sorted].reverse().slice(0, 20).map((r, i) => {
            const col = r.value < glucoseTargetLow ? C.red : r.value > glucoseTargetHigh ? C.yellow : C.green;
            return (
              <React.Fragment key={`${r.timestamp}-${i}`}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.histRow}>
                  <View style={[styles.histDot, { backgroundColor: col }]} />
                  <Text style={[styles.histValue, { color: col }]}>
                    {r.value} <Text style={{ color: C.darkTertiary, fontSize: 12 }}>mg/dL</Text>
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.histTime, { color: C.darkTertiary }]}>
                    {new Date(r.timestamp).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={[styles.histSource, { color: C.darkTertiary }]}>{r.source}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:        { flex: 1 },
  content:       { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  currentCard:   { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  currentLabel:  { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  currentRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  currentValue:  { fontSize: 52, fontWeight: '700', lineHeight: 56 },
  currentUnit:   { fontSize: 16, marginBottom: 8 },
  trendArrow:    { fontSize: 20, marginBottom: 8 },
  currentTime:   { fontSize: 12, marginTop: 2 },
  addBox:        { alignItems: 'center', gap: SPACING.xs },
  addInput:      { width: 72, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  addBtn:        { width: 40, height: 40, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  addBtnText:    { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  filterRow:     { flexDirection: 'row', borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: 3, gap: 3 },
  filterBtn:     { flex: 1, paddingVertical: 7, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  filterText:    { fontSize: 13, fontWeight: '600' },
  chartCard:     { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.sm },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  statCell:      { width: '31%', borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 2 },
  statLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  statValue:     { fontSize: 20, fontWeight: '700' },
  statUnit:      { fontSize: 9 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  emptyCard:     { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, alignItems: 'center' },
  emptyText:     { fontSize: 13 },
  historyCard:   { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  histRow:       { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  histDot:       { width: 10, height: 10, borderRadius: 5 },
  histValue:     { fontSize: 16, fontWeight: '700' },
  histTime:      { fontSize: 12 },
  histSource:    { fontSize: 11, marginLeft: SPACING.xs },
  divider:       { height: 1, marginHorizontal: SPACING.md },
});
