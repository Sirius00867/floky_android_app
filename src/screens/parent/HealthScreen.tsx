import React from 'react';
import {
  View, Text, ScrollView, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { glucoseColor, glucoseStatus } from '@/utils/glucoseHelpers';
import { GlucoseChart } from '@/components/shared/GlucoseChart';
import { useGlucoseData } from '@/hooks/useGlucoseData';
import type { AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';

// ── Pantalla ──────────────────────────────────────────────────────────────────

export default function ParentHealthScreen() {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();

  const userName          = useSelector((s: RootState) => s.settings?.userName ?? 'tu hijo/a');
  const glucoseTargetLow  = useSelector((s: RootState) => s.settings?.glucoseTargetLow ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings?.glucoseTargetHigh ?? 180);

  const { allReadings, isSyncing } = useGlucoseData();

  const now    = new Date();
  const sorted = [...allReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const values = sorted.map(r => r.value);

  const inRange  = values.filter(v => v >= glucoseTargetLow && v <= glucoseTargetHigh).length;
  const pctRange = values.length ? Math.round((inRange / values.length) * 100) : null;
  const low      = values.filter(v => v < glucoseTargetLow).length;
  const high     = values.filter(v => v > glucoseTargetHigh).length;
  const minVal   = values.length ? Math.min(...values) : null;
  const maxVal   = values.length ? Math.max(...values) : null;
  const avgVal   = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  const status    = latest ? glucoseStatus(latest.value, glucoseTargetLow, glucoseTargetHigh) : null;
  const mainColor = latest ? glucoseColor(latest.value, glucoseTargetLow, glucoseTargetHigh) : C.darkTertiary;
  const minAgo    = latest ? Math.round((Date.now() - new Date(latest.timestamp).getTime()) / 60000) : null;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: C.bg }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── CABECERA ── */}
      <View style={{ gap: 2, marginBottom: SPACING.xs }}>
        <Text style={[styles.title, { color: C.dark }]}>
          Glucosa de {userName}
        </Text>
        <Text style={[styles.subtitle, { color: C.darkTertiary }]}>
          {now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          {isSyncing ? ' · sincronizando…' : ''}
        </Text>
      </View>

      {/* ── VALOR ACTUAL ── */}
      {latest ? (
        <View style={[styles.heroCard, {
          backgroundColor: mainColor + '10',
          borderColor: mainColor + '40',
          borderWidth: status?.urgent ? 2 : 1,
        }]}>
          {status?.urgent && (
            <View style={[styles.urgentBanner, { backgroundColor: mainColor }]}>
              <Text style={styles.urgentText}>{status.icon} {status.label.toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.heroBody}>
            <View style={styles.heroLeft}>
              <Text style={[styles.heroValue, { color: mainColor }]}>{latest.value}</Text>
              <Text style={[styles.heroUnit, { color: mainColor }]}>mg/dL</Text>
              {!status?.urgent && (
                <View style={[styles.statusBadge, { backgroundColor: mainColor + '20' }]}>
                  <Text style={[styles.statusText, { color: mainColor }]}>
                    {status?.icon} {status?.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.heroRight}>
              <Text style={[styles.heroMeta, { color: C.darkTertiary }]}>
                {minAgo !== null ? (minAgo === 0 ? 'Ahora mismo' : `Hace ${minAgo} min`) : ''}
              </Text>
              <Text style={[styles.heroSource, { color: C.darkTertiary }]}>
                📡 {latest.source}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={[styles.heroCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={[styles.heroBody, { justifyContent: 'center', paddingVertical: SPACING.lg }]}>
            <Text style={{ fontSize: 36, textAlign: 'center' }}>📡</Text>
            <Text style={[styles.heroMeta, { color: C.darkTertiary, textAlign: 'center' }]}>
              Sin datos hoy{'\n'}Conecta el sensor CGM en Ajustes
            </Text>
          </View>
        </View>
      )}

      {/* ── GRÁFICO compartido — idéntico al del modo adolescente ── */}
      <View style={[styles.chartCard, { backgroundColor: C.white, borderColor: C.border }]}>
        <Text style={[styles.sectionTitle, { color: C.darkSecondary, marginBottom: SPACING.xs }]}>
          ÚLTIMAS 24 HORAS
        </Text>
        <GlucoseChart
          readings={allReadings}
          C={C as unknown as AppColors}
          targetLow={glucoseTargetLow}
          targetHigh={glucoseTargetHigh}
        />
        <Text style={[styles.chartHint, { color: C.darkTertiary }]}>Toca un punto para ver el valor exacto</Text>
      </View>

      {/* ── RESUMEN DEL DÍA ── */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>RESUMEN ÚLTIMAS 24H</Text>
      <View style={styles.statsRow}>
        {[
          { label: 'En rango', value: pctRange !== null ? `${pctRange}%` : '—',
            color: pctRange !== null ? (pctRange >= 70 ? '#10B981' : pctRange >= 50 ? '#F59E0B' : '#EF4444') : C.darkTertiary },
          { label: 'Mín',   value: minVal !== null ? `${minVal}` : '—', color: minVal !== null ? glucoseColor(minVal, glucoseTargetLow, glucoseTargetHigh) : C.dark },
          { label: 'Media', value: avgVal !== null ? `${avgVal}` : '—', color: avgVal !== null ? glucoseColor(avgVal, glucoseTargetLow, glucoseTargetHigh) : C.dark },
          { label: 'Máx',   value: maxVal !== null ? `${maxVal}` : '—', color: maxVal !== null ? glucoseColor(maxVal, glucoseTargetLow, glucoseTargetHigh) : C.dark },
        ].map(item => (
          <View key={item.label} style={[styles.statCell, { backgroundColor: C.white, borderColor: C.border }]}>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: C.darkTertiary }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Alertas rápidas */}
      {(low > 0 || high > 0) && (
        <View style={styles.alertsRow}>
          {low > 0 && (
            <View style={[styles.alertChip, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
              <Text style={[styles.alertText, { color: '#EF4444' }]}>⬇ {low} baja{low > 1 ? 's' : ''}</Text>
            </View>
          )}
          {high > 0 && (
            <View style={[styles.alertChip, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
              <Text style={[styles.alertText, { color: '#F59E0B' }]}>⬆ {high} alta{high > 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── ÚLTIMAS LECTURAS ── */}
      <Text style={[styles.sectionTitle, { color: C.darkSecondary }]}>ÚLTIMAS LECTURAS</Text>
      {sorted.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.white, borderColor: C.border }]}>
          <Text style={[styles.emptyText, { color: C.darkTertiary }]}>Todavía no hay lecturas</Text>
        </View>
      ) : (
        <View style={[styles.histCard, { backgroundColor: C.white, borderColor: C.border }]}>
          {[...sorted].reverse().slice(0, 12).map((r, i) => {
            const c = glucoseColor(r.value, glucoseTargetLow, glucoseTargetHigh);
            return (
              <React.Fragment key={`${r.timestamp}-${i}`}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: C.border }]} />}
                <View style={styles.histRow}>
                  <View style={[styles.histDot, { backgroundColor: c }]} />
                  <Text style={[styles.histVal, { color: c }]}>
                    {r.value} <Text style={{ fontSize: 12, color: C.darkTertiary }}>mg/dL</Text>
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text style={[styles.histTime, { color: C.darkTertiary }]}>
                    {new Date(r.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={[styles.histSource, { color: C.darkTertiary }]}>{r.source}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:       { flex: 1 },
  content:      { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  title:        { fontSize: 22, fontWeight: '700' },
  subtitle:     { fontSize: 13 },

  heroCard:     { borderRadius: BORDER_RADIUS.xl, overflow: 'hidden' },
  urgentBanner: { paddingVertical: 8, paddingHorizontal: SPACING.md, alignItems: 'center' },
  urgentText:   { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  heroBody:     { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md, alignItems: 'center' },
  heroLeft:     { flex: 1, gap: 4 },
  heroRight:    { alignItems: 'center', gap: 4 },
  heroValue:    { fontSize: 68, fontWeight: '800', lineHeight: 72 },
  heroUnit:     { fontSize: 16, fontWeight: '500', marginTop: -4 },
  heroMeta:     { fontSize: 12 },
  heroSource:   { fontSize: 11 },
  statusBadge:  { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 4 },
  statusText:   { fontSize: 13, fontWeight: '700' },

  chartCard:    { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.sm, gap: 4 },
  chartHint:    { fontSize: 10, textAlign: 'center', marginTop: 2 },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  statsRow:     { flexDirection: 'row', gap: SPACING.xs },
  statCell:     { flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 2 },
  statValue:    { fontSize: 20, fontWeight: '700' },
  statLabel:    { fontSize: 10, textAlign: 'center' },

  alertsRow:    { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  alertChip:    { flexDirection: 'row', borderRadius: BORDER_RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 5 },
  alertText:    { fontSize: 13, fontWeight: '700' },

  emptyCard:    { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, alignItems: 'center' },
  emptyText:    { fontSize: 13 },
  histCard:     { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  histRow:      { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  histDot:      { width: 10, height: 10, borderRadius: 5 },
  histVal:      { fontSize: 16, fontWeight: '700' },
  histTime:     { fontSize: 12 },
  histSource:   { fontSize: 11, marginLeft: SPACING.xs },
  divider:      { height: 1, marginHorizontal: SPACING.md },
});
