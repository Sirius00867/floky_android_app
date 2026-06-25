import React, { useState } from 'react';
import AdultGlucoseScreen from '@/screens/adult/GlucoseScreen';
import ParentHealthScreen from '@/screens/parent/HealthScreen';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, Vibration, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { addGlucoseReading, toggleProtocolPhase, deleteInsulinPattern, togglePatternActive } from '@/store/slices/healthSlice';
import { PatternLogger } from '@/components/PatternLogger';
import type { InsulinPattern } from '@/store/slices/healthSlice';
import { addPoints } from '@/store/slices/gamificationSlice';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { LockedScreen } from '@/components/shared/LockedScreen';
import { LayoutEditor } from '@/components/shared/LayoutEditor';
import { HidableSection } from '@/components/shared/HidableSection';
import { useScreenLayout } from '@/hooks/useScreenLayout';
import { ServicesHubCard } from '@/components/ServicesHubCard';
import { clearLibreLinkOfficialSession } from '@/services/libreLinkOfficialService';
import { trendArrow, type NightscoutDeviceStatus } from '@/services/nightscoutService';
import { GlucoseChart } from '@/components/shared/GlucoseChart';
import { useGlucoseData } from '@/hooks/useGlucoseData';

const PROTOCOL_PHASES = [
  { id: 'morning',   emoji: '🌅', label: 'Al despertar: mide glucosa',   time: '7:30' },
  { id: 'breakfast', emoji: '🍽️', label: 'Antes desayuno: actúa',        time: '8:00' },
  { id: 'lunch',     emoji: '🥘', label: 'Antes almuerzo: actúa',        time: '12:30' },
  { id: 'snack',     emoji: '🍞', label: 'Antes merienda: actúa',        time: '15:00' },
  { id: 'dinner',    emoji: '🍴', label: 'Antes cena: actúa',            time: '19:00' },
  { id: 'night',     emoji: '🌙', label: 'Revisión noche (2 min)',        time: '22:00' },
];

function sourceIcon(source: string): string {
  if (source === 'AAPS')       return '🤖';
  if (source === 'Dexcom')     return '📡';
  if (source === 'Libre')      return '💧';
  if (source === 'mySugr')     return '🍬';
  if (source === 'Accu-Chek')  return '💉';
  if (source === 'Contour')    return '🔵';
  if (source === 'Fingerstick') return '👆';
  return '📋';
}

function sourceColor(source: string, C: AppColors): string {
  if (source === 'AAPS')   return '#8B5CF6'; // violeta
  if (source === 'Dexcom') return '#0EA5E9'; // azul
  if (source === 'Libre')  return '#10B981'; // verde
  return C.darkSecondary as string;
}

function getGlucoseColor(value: number, C: AppColors, low = 70, high = 180) {
  if (value < low)         return C.red;
  if (value <= high)       return C.green;
  if (value <= high + 70)  return C.yellow;
  return C.red;
}

export default function HealthScreen() {
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  if (currentMode === 'adult')  return <AdultGlucoseScreen />;
  if (currentMode === 'parent') return <ParentHealthScreen />;
  return <AdolescentHealthScreen />;
}

function AdolescentHealthScreen() {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const C = useAppColors();
  const autonomyLevel = useSelector((s: RootState) => s.health.autonomyLevel);
  const protocolPhases = useSelector((s: RootState) => s.health.completedProtocolPhases);

  const isFirstLaunch = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);

  // School Mode: vista discreta durante horario escolar
  const insulinPatterns = useSelector((s: RootState) => s.health.insulinPatterns);
  const glucoseTargetLow  = useSelector((s: RootState) => s.settings?.glucoseTargetLow  ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings?.glucoseTargetHigh ?? 180);
  const nightscoutUrl = useSelector((s: RootState) => s.settings?.nightscoutUrl ?? '');
  const dexcomLinked  = useSelector((s: RootState) => s.settings?.dexcomLinked ?? false);
  const { sections } = useScreenLayout('health');

  const {
    allReadings: cgmAllReadings,
    cgmReadings,
    deviceStatus,
    nsLastTrend,
    isSyncing,
    lastSynced,
    refreshAll,
    handleDexcomConnect,
    handleDexcomDisconnect,
  } = useGlucoseData();

  const [glucoseInput, setGlucoseInput] = useState('');
  const [source, setSource] = useState<'CGM' | 'Fingerstick'>('Fingerstick');
  const [patternLoggerVisible, setPatternLoggerVisible] = useState(false);
  const [editingPattern, setEditingPattern] = useState<InsulinPattern | undefined>();
  const [editingLayout, setEditingLayout]   = useState(false);
  const [healthTab, setHealthTab]           = useState<'lastReading' | 'history'>('lastReading');

  if (isFirstLaunch) return <LockedScreen />;

  const allReadings = cgmAllReadings;

  const today = new Date().toDateString();
  const completedPhases = new Set(
    protocolPhases.filter(p => new Date(p.date).toDateString() === today).map(p => p.phaseId)
  );

  const handleSaveGlucose = () => {
    const value = parseInt(glucoseInput, 10);
    if (isNaN(value) || value < 20 || value > 600) {
      Alert.alert('Valor inválido', 'Introduce un valor entre 20 y 600 mg/dL');
      return;
    }
    dispatch(addGlucoseReading({ value, source, timestamp: new Date().toISOString() }));
    dispatch(addPoints(10));
    Vibration.vibrate(200);
    setGlucoseInput('');
    Alert.alert('✅ Guardado', `Glucosa ${value} mg/dL registrada. +10 puntos`);
  };

  const handleTogglePhase = (id: string) => {
    dispatch(toggleProtocolPhase(id));
    Vibration.vibrate(100);
  };

  const lastReading = allReadings[allReadings.length - 1];

  // Mapa source → lectura más reciente (para ServicesHubCard)
  // Ordenamos ascendente para que la última iteración por fuente quede como la más reciente
  const liveValues: Record<string, { value: number; time: string }> = {};
  for (const r of [...cgmReadings].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())) {
    const d = new Date(r.timestamp);
    liveValues[r.source] = {
      value: r.value,
      time:  `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    };
  }

  const styles = makeStyles(C);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.md }]}>
      <View style={styles.screenHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: C.health + '18' }]}>
            <DyslexiaText variant="h3" style={{ lineHeight: 28 }}>🩸</DyslexiaText>
          </View>
          <DyslexiaText variant="h2" color={C.dark} style={{ fontWeight: '700' }}>Salud</DyslexiaText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <TouchableOpacity
            onPress={refreshAll}
            disabled={isSyncing}
            style={[styles.badge, { backgroundColor: isSyncing ? C.health + '08' : C.health + '14', borderColor: C.health + '30' }]}
          >
            <DyslexiaText variant="small" color={C.health} style={{ fontWeight: '600' }}>
              {isSyncing ? '⏳' : '🔄'}
            </DyslexiaText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingLayout(true)} style={[styles.badge, { backgroundColor: C.study + '14', borderColor: C.study + '30' }]}>
            <DyslexiaText variant="small" color={C.study} style={{ fontWeight: '600' }}>✏️ Editar</DyslexiaText>
          </TouchableOpacity>
          <View style={[styles.badge, { backgroundColor: C.health + '14', borderColor: C.health + '30' }]}>
            <DyslexiaText variant="small" color={C.health} style={{ fontWeight: '600' }}>Nivel {autonomyLevel}</DyslexiaText>
          </View>
        </View>
      </View>

      {/* Barra de sincronización */}
      {(lastSynced || isSyncing) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingHorizontal: 2, marginBottom: SPACING.xs }}>
          <DyslexiaText variant="caption" color={isSyncing ? C.health : C.darkTertiary}>
            {isSyncing
              ? 'Sincronizando datos...'
              : `Actualizado: ${lastSynced!.getHours().toString().padStart(2,'0')}:${lastSynced!.getMinutes().toString().padStart(2,'0')} · Próximo en 5 min`}
          </DyslexiaText>
        </View>
      )}

      <LayoutEditor screen="health" visible={editingLayout} onClose={() => setEditingLayout(false)} />
      <PatternLogger
        visible={patternLoggerVisible}
        onClose={() => { setPatternLoggerVisible(false); setEditingPattern(undefined); }}
        editing={editingPattern}
      />

      {/* Hub de servicios conectados */}
      <ServicesHubCard
        liveValues={liveValues}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
      />

      {/* Health Tabs */}
      <View style={[styles.card, { paddingHorizontal: 0, paddingVertical: 0 }]}>
        <View style={styles.tabsContainer}>
          {(['lastReading', 'history'] as const).map(tab => {
            const isActive = healthTab === tab;
            const icon = tab === 'lastReading' ? '💧' : '📋';
            const label = tab === 'lastReading' ? 'Último valor' : 'Historial';
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setHealthTab(tab)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1, justifyContent: 'center' }}>
                  <DyslexiaText variant="body">{icon}</DyslexiaText>
                  <DyslexiaText variant="small" color={isActive ? '#fff' : C.darkSecondary} style={{ fontWeight: '600' }}>
                    {label}
                  </DyslexiaText>
                </View>
                {isActive && (
                  <View style={styles.tabBadge}>
                    <DyslexiaText variant="caption" color="#fff" style={{ fontWeight: '700' }}>ON</DyslexiaText>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content based on selected tab */}
      {healthTab === 'lastReading' && lastReading && (() => {
        const glColor = getGlucoseColor(lastReading.value, C, glucoseTargetLow, glucoseTargetHigh);
        const status  = lastReading.value < glucoseTargetLow          ? '⚠️ Baja'
                      : lastReading.value <= glucoseTargetHigh        ? '✅ Normal'
                      : lastReading.value <= glucoseTargetHigh + 70   ? '⬆️ Alta'
                      : '🚨 Muy alta';
        const d    = new Date(lastReading.timestamp);
        const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        return (
          <View style={[styles.card, { borderLeftColor: glColor, borderLeftWidth: 4, paddingVertical: SPACING.lg }]}>
            <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.8 }}>
              ÚLTIMO VALOR
            </DyslexiaText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, marginTop: SPACING.xs }}>
              <Text style={{ fontSize: 80, fontWeight: '800', color: glColor, letterSpacing: -3, lineHeight: 88 }}
                adjustsFontSizeToFit numberOfLines={1}>
                {lastReading.value}
              </Text>
              <View style={{ paddingBottom: 10 }}>
                <DyslexiaText variant="small" color={C.darkSecondary} style={{ fontWeight: '600' }}>mg/dL</DyslexiaText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: glColor + '18', borderWidth: 1, borderColor: glColor + '40' }}>
                <DyslexiaText variant="small" color={glColor} style={{ fontWeight: '700' }}>{status}</DyslexiaText>
              </View>
              <DyslexiaText variant="caption" color={C.darkTertiary}>{time} · {lastReading.source}</DyslexiaText>
            </View>
          </View>
        );
      })()}

      {healthTab === 'history' && allReadings.length > 0 && (
        <View style={styles.card}>
          <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700', marginBottom: SPACING.sm }}>Historial de hoy</DyslexiaText>
          {allReadings
            .filter(r => new Date(r.timestamp).toDateString() === today && r.source !== 'Fingerstick')
            .slice(-10).reverse()
            .map((r, i) => {
              const d = new Date(r.timestamp);
              const time = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
              return (
                <View key={i} style={styles.historyRow}>
                  <DyslexiaText variant="small" color={C.darkTertiary} style={{ width: 40 }}>{time}</DyslexiaText>
                  <DyslexiaText variant="body" color={getGlucoseColor(r.value, C, glucoseTargetLow, glucoseTargetHigh)} style={styles.historyValue}>
                    {r.value} mg/dL
                  </DyslexiaText>
                  <View style={[styles.sourceBadge, { borderColor: sourceColor(r.source, C) }]}>
                    <DyslexiaText variant="small" color={sourceColor(r.source, C)}>
                      {sourceIcon(r.source)} {r.source}
                    </DyslexiaText>
                  </View>
                </View>
              );
            })
          }
        </View>
      )}

      {sections.filter(s => s.visible).map(section => {
        switch (section.id) {
          case 'lastReading':
            // Este caso ahora se maneja en el nuevo sistema de tabs arriba
            return null;
          case 'register':
            return (
              <HidableSection key="register" screen="health" sectionId="register" label="Registrar glucosa">
              <View style={styles.card}>
                <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>Registrar glucosa</DyslexiaText>
                <View style={styles.row}>
                  {(['Fingerstick', 'CGM'] as const).map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.sourceBtn, source === s && styles.sourceBtnActive]}
                      onPress={() => setSource(s)}>
                      <DyslexiaText variant="small" color={source === s ? '#fff' : C.darkSecondary}>
                        {s === 'CGM' ? '📡 Sensor CGM' : '🩸 Pinchazo'}
                      </DyslexiaText>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={C.gray}
                    value={glucoseInput}
                    onChangeText={v => setGlucoseInput(v.replace(/[^0-9]/g, ''))}
                    maxLength={3}
                  />
                  <View style={styles.inputUnit}>
                    <DyslexiaText variant="small" color={C.darkTertiary} style={{ fontWeight: '600' }}>mg/dL</DyslexiaText>
                  </View>
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGlucose}>
                  <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>Guardar  +10 pts</DyslexiaText>
                </TouchableOpacity>

                {/* Patrones de insulina */}
                <View style={{ marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
                    <DyslexiaText variant="small" color={C.darkSecondary} style={{ fontWeight: '700' }}>
                      💉 Patrones de insulina
                    </DyslexiaText>
                    <TouchableOpacity
                      style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: C.health + '14', borderWidth: 1, borderColor: C.health + '30' }}
                      onPress={() => { setEditingPattern(undefined); setPatternLoggerVisible(true); }}>
                      <DyslexiaText variant="caption" color={C.health} style={{ fontWeight: '600' }}>+ Nuevo</DyslexiaText>
                    </TouchableOpacity>
                  </View>
                  {insulinPatterns.length === 0 ? (
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', paddingVertical: SPACING.sm }}>
                      Sin patrones. Crea uno para registrar dosis recurrentes.
                    </DyslexiaText>
                  ) : insulinPatterns.map((p, i) => {
                    const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                    return (
                      <View key={p.id} style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 10 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.cardBorder }]}>
                        <TouchableOpacity onPress={() => dispatch(togglePatternActive(p.id))}>
                          <View style={{ width: 36, height: 20, borderRadius: 10, backgroundColor: p.active ? C.health : C.cardBorder, alignItems: 'center', justifyContent: 'center' }}>
                            <DyslexiaText variant="caption" color="#fff" style={{ fontSize: 10, fontWeight: '700' }}>{p.active ? 'ON' : 'OFF'}</DyslexiaText>
                          </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <DyslexiaText variant="small" color={p.active ? C.dark : C.darkTertiary} style={{ fontWeight: '600' }}>{p.label} · {p.time}</DyslexiaText>
                          <DyslexiaText variant="caption" color={C.darkSecondary}>
                            {p.rapidUnits} ud rápida · {p.carbRations} rac · {p.days.map(d => DAY_LABELS[d]).join(' ')}
                          </DyslexiaText>
                        </View>
                        <TouchableOpacity onPress={() => { setEditingPattern(p); setPatternLoggerVisible(true); }} style={{ padding: 6 }}>
                          <DyslexiaText variant="caption" color={C.darkTertiary}>✏️</DyslexiaText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => dispatch(deleteInsulinPattern(p.id))} style={{ padding: 6 }}>
                          <DyslexiaText variant="caption" color={C.red}>🗑</DyslexiaText>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
              </HidableSection>
            );
          case 'protocol':
            return (
              <HidableSection key="protocol" screen="health" sectionId="protocol" label="Protocolo diario">
              <View style={styles.card}>
                <View style={styles.protocolHeader}>
                  <View>
                    <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>Protocolo diario</DyslexiaText>
                    <DyslexiaText variant="caption" color={C.darkTertiary}>
                      {completedPhases.size} de {PROTOCOL_PHASES.length} completadas
                    </DyslexiaText>
                  </View>
                  <View style={styles.progressCircle}>
                    <DyslexiaText variant="small" color={C.health} style={{ fontWeight: '700' }}>
                      {completedPhases.size}/{PROTOCOL_PHASES.length}
                    </DyslexiaText>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, {
                    width: `${Math.round((completedPhases.size / PROTOCOL_PHASES.length) * 100)}%` as `${number}%`
                  }]} />
                </View>
                <View style={styles.phaseList}>
                  {PROTOCOL_PHASES.map((phase, idx) => {
                    const done = completedPhases.has(phase.id);
                    const isLast = idx === PROTOCOL_PHASES.length - 1;
                    return (
                      <TouchableOpacity
                        key={phase.id}
                        style={[styles.phaseItem, !isLast && styles.phaseItemBorder]}
                        activeOpacity={0.6}
                        onPress={() => handleTogglePhase(phase.id)}>
                        <View style={[styles.checkbox, done && styles.checkboxDone]}>
                          {done && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.phaseText}>
                          <DyslexiaText variant="body" color={done ? C.darkTertiary : C.dark}
                            style={done ? styles.textDone : undefined}>
                            {phase.label}
                          </DyslexiaText>
                        </View>
                        <View style={[styles.timePill, done && styles.timePillDone]}>
                          <DyslexiaText variant="caption" color={done ? C.darkTertiary : C.health}
                            style={{ fontWeight: '600' }}>
                            {phase.time}
                          </DyslexiaText>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              </HidableSection>
            );
          case 'dexcom':
            return (
              <HidableSection key="dexcom" screen="health" sectionId="dexcom" label="Dexcom API">
                <View style={styles.card}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#0EA5E9' + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <DyslexiaText variant="body" style={{ lineHeight: 24 }}>📡</DyslexiaText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>Dexcom API</DyslexiaText>
                      <DyslexiaText variant="caption" color={C.darkTertiary}>
                        {dexcomLinked ? '✅ Conectado — lecturas en tiempo real' : 'Sin conexión · Conecta tu cuenta Dexcom'}
                      </DyslexiaText>
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: dexcomLinked ? '#10B981' + '18' : C.cardBorder, borderWidth: 1, borderColor: dexcomLinked ? '#10B981' + '40' : C.cardBorder }}>
                      <DyslexiaText variant="caption" color={dexcomLinked ? '#10B981' : C.darkTertiary} style={{ fontWeight: '700' }}>
                        {dexcomLinked ? 'ACTIVO' : 'INACTIVO'}
                      </DyslexiaText>
                    </View>
                  </View>

                  {!dexcomLinked ? (
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: '#0EA5E9' }]}
                      onPress={handleDexcomConnect}
                      activeOpacity={0.8}
                    >
                      <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>
                        🔗 Conectar con Dexcom
                      </DyslexiaText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: C.red + 'CC' }]}
                      onPress={handleDexcomDisconnect}
                      activeOpacity={0.8}
                    >
                      <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>
                        Desconectar Dexcom
                      </DyslexiaText>
                    </TouchableOpacity>
                  )}

                  <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', marginTop: 2 }}>
                    Dexcom G5 · G6 · G7 · Dexcom ONE · CGM directo sin Nightscout
                  </DyslexiaText>
                </View>
              </HidableSection>
            );

          case 'chart': {
            const lastCgmReading = cgmReadings.length > 0 ? cgmReadings[cgmReadings.length - 1] : null;
            return (
              <View key="chart" style={{ gap: SPACING.sm }}>

{/* ── Gráfico + datos AAPS integrados ── */}
                <View style={styles.card}>
                  <GlucoseChart readings={allReadings} C={C} targetLow={glucoseTargetLow} targetHigh={glucoseTargetHigh} />
                  {!!nightscoutUrl && (
                    <AAPSInline
                      deviceStatus={deviceStatus}
                      nsLastTrend={nsLastTrend}
                      nightscoutUrl={nightscoutUrl}
                      onRefresh={refreshAll}
                      C={C}
                    />
                  )}
                </View>
              </View>
            );
          }
          case 'history':
            // Este caso ahora se maneja en el nuevo sistema de tabs arriba
            return null;
          default:
            return null;
        }
      })}
    </ScrollView>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  content:      { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.xs },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badge:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: C.health + '14', borderWidth: 1, borderColor: C.health + '30' },
  card:         { backgroundColor: C.card, borderRadius: C.cardRadius, padding: SPACING.md, borderWidth: 1, borderColor: C.cardBorder, gap: SPACING.sm, ...C.cardShadow },
  tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  tabBtn: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderRightWidth: 1,
    borderRightColor: C.cardBorder,
    flexDirection: 'row',
  },
  tabBtnActive: {
    backgroundColor: C.health,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginLeft: SPACING.xs,
  },
  bigNumber:    { fontSize: 72, textAlign: 'center', letterSpacing: -2 },
  row:          { flexDirection: 'row', gap: SPACING.sm },
  sourceBtn:    { flex: 1, paddingVertical: 10, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.md, backgroundColor: C.bg, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  sourceBtnActive: { backgroundColor: C.health, borderColor: C.health },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 0 },
  input:        { flex: 1, minWidth: 100, borderWidth: 1.5, borderColor: C.cardBorder, borderRightWidth: 0, borderTopLeftRadius: BORDER_RADIUS.md, borderBottomLeftRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, fontSize: 28, textAlign: 'center', color: C.dark, fontWeight: '700', height: 64, backgroundColor: C.bg },
  inputUnit:    { height: 64, paddingHorizontal: 14, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.cardBorder, borderTopRightRadius: BORDER_RADIUS.md, borderBottomRightRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  saveBtn:      { backgroundColor: C.health, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  protocolHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressCircle:  { width: 44, height: 44, borderRadius: 22, backgroundColor: C.health + '14', alignItems: 'center', justifyContent: 'center' },
  sourceBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  progressBar:     { height: 3, backgroundColor: C.cardBorder, borderRadius: BORDER_RADIUS.full, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: C.health, borderRadius: BORDER_RADIUS.full },
  phaseList:       { gap: 0 },
  phaseItem:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 13, minHeight: 52 },
  phaseItemBorder: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  checkbox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone:    { backgroundColor: C.health, borderColor: C.health },
  checkmark:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  phaseText:       { flex: 1 },
  textDone:        { textDecorationLine: 'line-through' as const, opacity: 0.45 },
  timePill:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: C.health + '10', borderWidth: 1, borderColor: C.health + '25' },
  timePillDone:    { backgroundColor: C.cardBorder, borderColor: 'transparent' },
  historyRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  historyValue:    { fontWeight: '700', fontSize: 17 },
});

// ── Formateo de valores numéricos de la API ──────────────────────────────────

/** Convierte "22.918798718377886" → "22.9"; enteros quedan sin decimal. */
function formatCob(raw: number | string): string {
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (isNaN(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Extrae solo la parte numérica legible de la razón del loop de AAPS.
 *  "→ Dosing sensitivity: 34.1 using current BG;COB: 22.9..." → campos separados */
function parseLoopReason(raw: string): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  // BG eventual
  const bgMatch = raw.match(/eventual(?:BG)?[:\s]+([0-9.]+)/i);
  if (bgMatch) result.push({ label: 'BG prevista', value: `${Math.round(parseFloat(bgMatch[1]))} mg/dL` });
  // ISF / sensibilidad
  const isfMatch = raw.match(/sensitivity[:\s]+([0-9.]+)/i);
  if (isfMatch) result.push({ label: 'Sensibilidad', value: `${parseFloat(isfMatch[1]).toFixed(1)}` });
  // COB en razón
  const cobMatch = raw.match(/COB[:\s]+([0-9.]+)/i);
  if (cobMatch) result.push({ label: 'COB', value: `${formatCob(cobMatch[1])} g` });
  // IOB en razón
  const iobMatch = raw.match(/IOB[:\s]+(-?[0-9.]+)/i);
  if (iobMatch) result.push({ label: 'IOB', value: `${parseFloat(iobMatch[1]).toFixed(1)} U` });
  return result;
}

// ── Chip de stat individual ───────────────────────────────────────────────────

function StatChip({ label, value, icon, C, warn = false, accent }: {
  label: string; value: string; icon: string; C: AppColors; warn?: boolean; accent?: string;
}) {
  const color = warn ? C.red : (accent ?? C.health);
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 12, paddingVertical: 10,   // padding generoso: texto no toca bordes
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: color + '14',
      borderWidth: 1, borderColor: color + '35',
      minWidth: 80,                                  // evita chips demasiado estrechos
    }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <View style={{ gap: 2 }}>
        {/* Etiqueta: contraste suficiente, no gris sobre oscuro */}
        <DyslexiaText variant="caption" color={C.darkSecondary}
          style={{ lineHeight: 16, letterSpacing: 0.4, textAlign: 'left' }}>
          {label}
        </DyslexiaText>
        {/* Valor: grande, legible, sin décimas innecesarias */}
        <DyslexiaText variant="body" color={color}
          style={{ fontWeight: '800', lineHeight: 20, letterSpacing: 0.2, textAlign: 'left' }}>
          {value}
        </DyslexiaText>
      </View>
    </View>
  );
}

// ── AAPS inline (dentro de la card del gráfico) ──────────────────────────────

function AAPSInline({ deviceStatus, nsLastTrend, nightscoutUrl, onRefresh, C }: {
  deviceStatus: NightscoutDeviceStatus;
  nsLastTrend?: string;
  nightscoutUrl: string;
  onRefresh: () => void;
  C: AppColors;
}) {
  const hasData = Object.keys(deviceStatus).length > 0 || nsLastTrend;
  const { loopMode, lastLoopAgo, loopReason, iob, cob, reservoir, pumpBattery,
          uploaderBattery, tempBasalRate, tempBasalPct, tempBasalMins,
          eventualBG, lastSMB, lastSMBAgo } = deviceStatus;

  const loopColor =
    loopMode === 'Closed'    ? C.green
    : loopMode === 'Open'    ? C.yellow
    : loopMode === 'LGS'     ? '#F59E0B'
    : loopMode === 'Suspended' ? C.red
    : C.darkSecondary as string;

  const loopLabel =
    loopMode === 'Closed'    ? '🔄 Cerrado'
    : loopMode === 'Open'    ? '🔓 Abierto'
    : loopMode === 'LGS'     ? '⬇ LGS'
    : loopMode === 'Suspended' ? '⏸ Suspendido'
    : undefined;

  const basalStr = tempBasalRate !== undefined
    ? `${tempBasalRate.toFixed(2)} U/h${tempBasalPct !== undefined ? ` (${tempBasalPct}%)` : ''}${tempBasalMins !== undefined ? ` · ${tempBasalMins}m` : ''}`
    : undefined;

  const eventualStr = eventualBG !== undefined ? `${Math.round(eventualBG)} mg/dL` : undefined;

  const chips: { label: string; value: string; icon: string; accent?: string; warn?: boolean }[] = [];
  if (iob !== undefined)      chips.push({ label: 'IOB',         value: `${iob.toFixed(1)} U`,          icon: '💉' });
  if (cob !== undefined)      chips.push({ label: 'COB',         value: `${formatCob(cob)} g`,           icon: '🍞', accent: '#F59E0B' });
  if (basalStr)               chips.push({ label: 'Basal temp',  value: basalStr,                       icon: '⚡', accent: '#8B5CF6' });
  if (eventualStr)            chips.push({ label: 'BG eventual', value: eventualStr,                    icon: '🎯', accent: '#0EA5E9' });
  if (reservoir !== undefined) chips.push({ label: 'Reservorio', value: `${Math.round(reservoir)} U`,   icon: '🛢️', warn: reservoir < 50 });
  if (pumpBattery !== undefined) chips.push({ label: 'Bomba',    value: `${pumpBattery}%`,              icon: pumpBattery > 30 ? '🔋' : '🪫', warn: pumpBattery < 25 });

  // Fila 1: IOB, COB, Basal  — Fila 2: BG Eventual, Reservorio, Bomba
  const row1 = chips.slice(0, 3);
  const row2 = chips.slice(3, 6);

  return (
    <View style={{ marginTop: SPACING.sm, borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: SPACING.sm, gap: 6 }}>

      {/* ── Cabecera: badge loop + tiempo + refresh ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
        {loopLabel ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 6,
            borderRadius: BORDER_RADIUS.full, backgroundColor: loopColor + '20',
            borderWidth: 1, borderColor: loopColor + '50' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: loopColor as string, letterSpacing: 0.3 }}>
              {loopLabel}
            </Text>
          </View>
        ) : null}
        {nsLastTrend && (
          <Text style={{ fontSize: 14 }}>{trendArrow(nsLastTrend)}</Text>
        )}
        {!!loopReason && (
          <Text style={{ flex: 1, fontSize: 10, color: C.darkTertiary as string, fontStyle: 'italic' }} numberOfLines={1}>
            {loopReason}
          </Text>
        )}
        <View style={{ flex: loopReason ? 0 : 1 }} />
        {lastLoopAgo !== undefined && (
          <Text style={{ fontSize: 10, color: (lastLoopAgo > 15 ? C.red : C.darkTertiary) as string }}>
            {lastLoopAgo < 1 ? 'ahora' : `${lastLoopAgo} min`}
          </Text>
        )}
        <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 15, color: C.health as string }}>↺</Text>
        </TouchableOpacity>
      </View>

      {hasData ? (
        <>
          {/* ── Cuadrícula 3 columnas ── */}
          {[row1, row2].map((row, ri) => row.length > 0 && (
            <View key={ri} style={{ flexDirection: 'row', gap: 5 }}>
              {row.map(chip => {
                const accent = chip.warn ? C.red : (chip.accent ?? C.health);
                return (
                  <View key={chip.label} style={{
                    flex: 1, borderRadius: BORDER_RADIUS.md,
                    backgroundColor: (accent as string) + '12',
                    borderWidth: 1, borderColor: (accent as string) + '35',
                    paddingVertical: 8, paddingHorizontal: 10,  // padding generoso
                    alignItems: 'flex-start', gap: 3,
                  }}>
                    <Text style={{ fontSize: 10, color: C.darkSecondary as string, fontWeight: '700',
                      letterSpacing: 0.5, lineHeight: 14, textAlign: 'left' }}>
                      {chip.icon}  {chip.label}
                    </Text>
                    <Text style={{ fontSize: 14, color: accent as string, fontWeight: '800',
                      letterSpacing: 0.1, lineHeight: 18, textAlign: 'left' }}>
                      {chip.value}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      ) : (
        <Text style={{ fontSize: 11, color: C.darkTertiary as string, fontStyle: 'italic' }}>
          Sin datos de AAPS — comprueba que Nightscout tiene datos recientes
        </Text>
      )}

      {/* URL discreta al fondo */}
      <Text style={{ fontSize: 9, color: C.darkTertiary as string, opacity: 0.6 }} numberOfLines={1}>
        🔗 {nightscoutUrl.replace(/^https?:\/\//, '')}
      </Text>
    </View>
  );
}

// ── Tarjeta AAPS / Loop completa ─────────────────────────────────────────────

function AAPSCard({ deviceStatus, nsLastTrend, nightscoutUrl, onRefresh, C }: {
  deviceStatus: NightscoutDeviceStatus;
  nsLastTrend?: string;
  nightscoutUrl: string;
  onRefresh: () => void;
  C: AppColors;
}) {
  const hasData = Object.keys(deviceStatus).length > 0 || nsLastTrend;
  const { loopMode, lastLoopAgo, loopReason, iob, cob, reservoir, pumpBattery,
          uploaderBattery, tempBasalRate, tempBasalPct, tempBasalMins,
          eventualBG, lastSMB, lastSMBAgo } = deviceStatus;

  const loopColor =
    loopMode === 'Closed'    ? C.green
    : loopMode === 'Open'    ? C.yellow
    : loopMode === 'LGS'     ? '#F59E0B'
    : loopMode === 'Suspended' ? C.red
    : C.darkSecondary as string;

  const loopLabel =
    loopMode === 'Closed'    ? '🔄 Cerrado'
    : loopMode === 'Open'    ? '🔓 Abierto'
    : loopMode === 'LGS'     ? '⬇ LGS'
    : loopMode === 'Suspended' ? '⏸ Suspendido'
    : undefined;

  const basalStr = tempBasalRate !== undefined
    ? `${tempBasalRate.toFixed(2)} U/h${tempBasalPct !== undefined ? ` (${tempBasalPct}%)` : ''}${tempBasalMins !== undefined ? ` · ${tempBasalMins} min` : ''}`
    : undefined;

  const eventualStr = eventualBG !== undefined
    ? `${Math.round(eventualBG)} mg/dL`
    : undefined;

  return (
    <View style={{
      backgroundColor: C.card, borderRadius: C.cardRadius,
      borderWidth: 1, borderColor: C.cardBorder,
      overflow: 'hidden', ...C.cardShadow,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        padding: SPACING.md, borderBottomWidth: hasData ? 1 : 0, borderBottomColor: C.cardBorder }}>
        <DyslexiaText variant="small" color={C.darkSecondary} style={{ fontWeight: '700', flex: 1 }}>
          🔗 AAPS · {nightscoutUrl.replace(/^https?:\/\//, '')}
        </DyslexiaText>
        {lastLoopAgo !== undefined && (
          <DyslexiaText variant="caption" color={lastLoopAgo > 15 ? C.red : C.darkTertiary}>
            {lastLoopAgo < 1 ? 'ahora' : `hace ${lastLoopAgo} min`}
          </DyslexiaText>
        )}
        <TouchableOpacity onPress={onRefresh}>
          <DyslexiaText variant="caption" color={C.health}>↺</DyslexiaText>
        </TouchableOpacity>
      </View>

      {hasData ? (
        <View style={{ padding: SPACING.md, gap: SPACING.sm }}>

          {/* Fila 1: Modo loop + tendencia */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
            {loopLabel && (
              <View style={{ paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: BORDER_RADIUS.full, backgroundColor: loopColor + '18',
                borderWidth: 1, borderColor: loopColor + '40' }}>
                <DyslexiaText variant="small" color={loopColor}
                  style={{ fontWeight: '700', letterSpacing: 0.3, textAlign: 'left' }}>
                  {loopLabel}
                </DyslexiaText>
              </View>
            )}
            {nsLastTrend && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <DyslexiaText variant="h3" style={{ lineHeight: 26 }}>{trendArrow(nsLastTrend)}</DyslexiaText>
                <DyslexiaText variant="caption" color={C.darkTertiary}>Tendencia</DyslexiaText>
              </View>
            )}
          </View>

          {/* Razón del loop — parseada en mini-chips, sin texto crudo con siglas */}
          {!!loopReason && (() => {
            const parsed = parseLoopReason(loopReason);
            return parsed.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {parsed.map(p => (
                  <View key={p.label} style={{
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: BORDER_RADIUS.full,
                    backgroundColor: C.cardBorder,
                    flexDirection: 'row', gap: 4, alignItems: 'center',
                  }}>
                    <DyslexiaText variant="caption" color={C.darkSecondary}
                      style={{ letterSpacing: 0.3, lineHeight: 16 }}>
                      {p.label}
                    </DyslexiaText>
                    <DyslexiaText variant="caption" color={C.dark}
                      style={{ fontWeight: '700', lineHeight: 16 }}>
                      {p.value}
                    </DyslexiaText>
                  </View>
                ))}
              </View>
            ) : null;
          })()}

          {/* Chips: IOB, COB, Basal temp, Predicción */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            {iob !== undefined && (
              <StatChip label="IOB" value={`${iob.toFixed(1)} U`} icon="💉" C={C} />
            )}
            {cob !== undefined && (
              <StatChip label="COB" value={`${formatCob(cob)} g`} icon="🍞" C={C} accent="#F59E0B" />
            )}
            {basalStr && (
              <StatChip label="Basal temp" value={basalStr} icon="⚡" C={C} accent="#8B5CF6" />
            )}
            {eventualStr && (
              <StatChip label="BG eventual" value={eventualStr} icon="🎯" C={C} accent="#0EA5E9" />
            )}
          </View>

          {/* Chips: Bomba */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs }}>
            {reservoir !== undefined && (
              <StatChip label="Reservorio" value={`${Math.round(reservoir)} U`} icon="🛢️"
                C={C} warn={reservoir < 50} />
            )}
            {pumpBattery !== undefined && (
              <StatChip label="Batería bomba" value={`${pumpBattery}%`}
                icon={pumpBattery > 30 ? '🔋' : '🪫'} C={C} warn={pumpBattery < 25} />
            )}
            {uploaderBattery !== undefined && (
              <StatChip label="Teléfono" value={`${uploaderBattery}%`} icon="📱" C={C} />
            )}
            {lastSMB !== undefined && (
              <StatChip label={`SMB${lastSMBAgo !== undefined ? ` (${lastSMBAgo} min)` : ''}`}
                value={`${lastSMB.toFixed(2)} U`} icon="⚡" C={C} />
            )}
          </View>
        </View>
      ) : (
        <View style={{ padding: SPACING.md }}>
          <DyslexiaText variant="caption" color={C.darkTertiary}>
            Sin datos de AAPS aún. Comprueba que tu Nightscout tiene datos recientes y que AAPS está subiendo.
          </DyslexiaText>
        </View>
      )}
    </View>
  );
}
