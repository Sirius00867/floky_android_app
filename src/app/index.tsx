import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import AdultDashboardScreen from '@/screens/adult/DashboardScreen';
import ParentDashboardScreen from '@/screens/parent/DashboardScreen';
import { DAILY_MISSIONS, addPoints, claimMissionReward } from '@/store/slices/gamificationSlice';
import OnboardingScreen from './onboarding';
import { LayoutEditor } from '@/components/shared/LayoutEditor';
import { HidableSection } from '@/components/shared/HidableSection';
import { useScreenLayout } from '@/hooks/useScreenLayout';

const MODULES = [
  { key: 'health',   label: 'Salud',   icon: '🩺', color: '#059669', bg: '#ECFDF5', bgDark: '#052E16', route: '/health'   as const },
  { key: 'study',    label: 'Estudio', icon: '✏️', color: '#4F46E5', bg: '#EEF2FF', bgDark: '#1E1B4B', route: '/study'    as const },
  { key: 'home',     label: 'Casa',    icon: '🏠', color: '#D97706', bg: '#FFFBEB', bgDark: '#1C1400', route: '/home'     as const },
  { key: 'relation', label: 'Familia', icon: '💬', color: '#DB2777', bg: '#FDF2F8', bgDark: '#2D0A1E', route: '/relation' as const },
];

export default function DashboardScreen() {
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  if (currentMode === 'adult')  return <AdultDashboardScreen />;
  if (currentMode === 'parent') return <ParentDashboardScreen />;
  return <AdolescentDashboard />;
}

function AdolescentDashboard() {
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const C             = useAppColors();
  const dispatch      = useDispatch();
  const userName      = useSelector((s: RootState) => s.settings?.userName ?? '');
  const points        = useSelector((s: RootState) => s.gamification.totalPoints);
  const claimedMissions = useSelector((s: RootState) => s.gamification.claimedMissions);
  const glucoseReadings = useSelector((s: RootState) => s.health.glucoseReadings);
  const liveCgm         = useSelector((s: RootState) => s.health.liveCgmReading);
  const isCgmSyncing    = useSelector((s: RootState) => s.health.isCgmSyncing);
  const studyBlocks   = useSelector((s: RootState) => s.study.blocks);
  const routineTasks  = useSelector((s: RootState) => s.settings?.routineTasks ?? []);
  const autonomyLevel = useSelector((s: RootState) => s.health.autonomyLevel);
  const isFirstLaunch = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);
  const gamificationEnabled = useSelector((s: RootState) => s.settings?.gamificationEnabled ?? true);

  // Derived counts
  const today = new Date().toDateString();
  const glucoseToday  = glucoseReadings.filter(r => new Date(r.timestamp).toDateString() === today).length;
  const studyToday    = studyBlocks.filter(b => b.completed && b.date === today).length;
  const glucoseCount  = glucoseReadings.length;
  const studyDone     = studyBlocks.filter(b => b.completed).length;

  // Mission progress (computed from state)
  // RoutineTask doesn't track completion — mission routine_all is placeholder until home module is built
  const allRoutineDone = false;
  const missionProgress: Record<string, number> = {
    glucose_3:   glucoseToday,
    study_1:     studyToday,
    routine_all: allRoutineDone ? 1 : 0,
  };

  // Auto-claim rewards when missions complete
  useEffect(() => {
    DAILY_MISSIONS.forEach(m => {
      const prog = missionProgress[m.id] ?? 0;
      const alreadyClaimed = claimedMissions.some(c => c.missionId === m.id && c.date === today);
      if (prog >= m.target && !alreadyClaimed) {
        dispatch(claimMissionReward({ missionId: m.id, date: today }));
        dispatch(addPoints(m.reward));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glucoseToday, studyToday, allRoutineDone]);

  const { sections } = useScreenLayout('index');
  const [editingLayout, setEditingLayout] = useState(false);

  const hour = new Date().getHours();
  const saludo   = userName ? `, ${userName}` : '';
  const greeting = (hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches') + saludo;

  const glucoseColor = liveCgm
    ? liveCgm.value < 70 ? '#DC2626' : liveCgm.value > 180 ? '#D97706' : '#059669'
    : undefined;

  const stats: Record<string, { value: string; ok: boolean; sub: string; color?: string }> = {
    health: liveCgm
      ? { value: `${liveCgm.value} mg/dL ${liveCgm.trend ?? ''}`, ok: liveCgm.value >= 70 && liveCgm.value <= 180, sub: isCgmSyncing ? '⏳ Actualizando…' : `${liveCgm.source} · Niv. ${autonomyLevel}`, color: glucoseColor }
      : { value: glucoseCount > 0 ? `${glucoseCount} registro${glucoseCount > 1 ? 's' : ''}` : 'Sin datos', ok: glucoseCount > 0, sub: `Autonomía niv. ${autonomyLevel}` },
    study:    { value: studyDone > 0 ? `${studyDone} bloque${studyDone > 1 ? 's' : ''}` : 'Sin bloques',          ok: studyDone > 0,    sub: studyDone >= 3 ? 'Objetivo cumplido' : 'Objetivo: 3 bloques' },
    home:     { value: 'Rutinas del día', ok: true,  sub: 'Mañana · Tarde · Noche' },
    relation: { value: 'Chat familiar',   ok: false, sub: 'Hoy a las 20:00' },
  };

  const styles = makeStyles(C);

  // Show onboarding overlay on first launch
  if (isFirstLaunch) {
    return <OnboardingScreen />;
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: fila superior con puntos + editar alineados a la derecha */}
        <View style={styles.header}>
          <View style={{ flex: 1, paddingLeft: 120 }}>
            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.greetingLabel} numberOfLines={1}>
              {greeting}
            </DyslexiaText>
          </View>
          <View style={styles.headerRight}>
            {gamificationEnabled && (
              <TouchableOpacity style={styles.pointsBadge} activeOpacity={0.8}>
                <Text style={styles.pointsStar}>⭐</Text>
                <DyslexiaText variant="small" color={C.gamification} style={{ fontWeight: '700' }}>{points} pts</DyslexiaText>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setEditingLayout(true)} style={[styles.badge, { backgroundColor: C.study + '14', borderColor: C.study + '30' }]} activeOpacity={0.7}>
              <DyslexiaText variant="small" color={C.study} style={{ fontWeight: '600' }}>✏️</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>

        <LayoutEditor screen="index" visible={editingLayout} onClose={() => setEditingLayout(false)} />

        {sections.filter(s => s.visible).map(section => {
          switch (section.id) {
            case 'grid':
              return (
                <HidableSection key="grid" screen="index" sectionId="grid" label="Módulos principales">
                <View style={styles.grid}>
                  {MODULES.map(mod => {
                    const s = stats[mod.key];
                    return (
                      <TouchableOpacity
                        key={mod.key}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() => router.push(mod.route)}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: C.scheme === 'dark' ? mod.bgDark : mod.bg }]}>
                          <Text style={styles.icon}>{mod.icon}</Text>
                        </View>
                        <DyslexiaText variant="caption" color={C.darkSecondary} style={styles.cardLabel}>{mod.label}</DyslexiaText>
                        <DyslexiaText variant="small" color={s.color ?? C.dark} style={[styles.cardValue, s.color ? { fontWeight: '700' } : undefined]}>{s.value}</DyslexiaText>
                        <View style={styles.cardFooter}>
                          <View style={[styles.dot, { backgroundColor: s.color ?? (s.ok ? C.green : C.yellow) }]} />
                          <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.cardSub}>{s.sub}</DyslexiaText>
                        </View>
                        <View style={[styles.accentBar, { backgroundColor: mod.color }]} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                </HidableSection>
              );
            case 'actions':
              return (
                <HidableSection key="actions" screen="index" sectionId="actions" label="Próximas acciones">
                <SemaforoPanel
                  key="actions"
                  glucoseToday={glucoseToday}
                  studyToday={studyToday}
                  missionsToday={claimedMissions.filter(c => c.date === today).length}
                  styles={styles}
                  C={C}
                  onGlucose={() => router.push('/health')}
                  onStudy={() => router.push('/study')}
                />
                </HidableSection>
              );
            case 'missions':
              if (!gamificationEnabled) return null;
              return (
                <HidableSection key="missions" screen="index" sectionId="missions" label="Misiones del día">
                <React.Fragment>
                  <View style={styles.section}>
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>MISIONES DE HOY</DyslexiaText>
                    {DAILY_MISSIONS.map((m, idx) => {
                      const prog    = missionProgress[m.id] ?? 0;
                      const done    = prog >= m.target;
                      const claimed = claimedMissions.some(c => c.missionId === m.id && c.date === today);
                      const pct     = Math.min(1, prog / m.target);
                      return (
                        <React.Fragment key={m.id}>
                          {idx > 0 && <View style={styles.divider} />}
                          <View style={styles.missionRow}>
                            <Text style={styles.missionIcon}>{m.icon}</Text>
                            <View style={styles.missionInfo}>
                              <View style={styles.missionHeader}>
                                <DyslexiaText variant="small" color={C.dark} style={styles.missionTitle}>{m.title}</DyslexiaText>
                                {claimed && <Text style={styles.missionCheck}>✓</Text>}
                                <DyslexiaText variant="caption" color={done ? m.color : C.darkTertiary} style={styles.missionReward}>+{m.reward} pts</DyslexiaText>
                              </View>
                              <DyslexiaText variant="caption" color={C.darkTertiary}>{m.desc}</DyslexiaText>
                              <View style={styles.progressTrack}>
                                <View style={[styles.progressFill, { width: `${pct * 100}%` as any, backgroundColor: m.color }]} />
                              </View>
                              <DyslexiaText variant="caption" color={C.darkTertiary}>
                                {done ? 'Completada' : `${prog} / ${m.target}`}
                              </DyslexiaText>
                            </View>
                          </View>
                        </React.Fragment>
                      );
                    })}
                  </View>
                  <View style={styles.section}>
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>RESUMEN DE HOY</DyslexiaText>
                    <SummaryRow icon="🩸" label="Glucosa registrada" value={glucoseCount > 0 ? `${glucoseCount}×` : '—'} valueColor={glucoseCount > 0 ? C.green : C.darkTertiary} styles={styles} textColor={C.dark} />
                    <View style={styles.divider} />
                    <SummaryRow icon="📚" label="Bloques de estudio" value={`${studyDone}/3`} valueColor={studyDone >= 3 ? C.green : studyDone > 0 ? C.yellow : C.darkTertiary} styles={styles} textColor={C.dark} />
                    <View style={styles.divider} />
                    <SummaryRow icon="⭐" label="Puntos ganados hoy" value={`${points} pts`} valueColor={C.gamification} styles={styles} textColor={C.dark} />
                  </View>
                </React.Fragment>
                </HidableSection>
              );
            default:
              return null;
          }
        })}
      </ScrollView>

    </>
  );
}

type SemaforoColor = 'green' | 'yellow' | 'red';

function getSemaforoColor(value: number, greenAt: number, yellowAt: number): SemaforoColor {
  if (value >= greenAt) return 'green';
  if (value >= yellowAt) return 'yellow';
  return 'red';
}

const SEMAFORO_COLORS: Record<SemaforoColor, { bg: string; border: string; label: string }> = {
  green:  { bg: '#DCFCE7', border: '#22C55E', label: '#15803D' },
  yellow: { bg: '#FEF9C3', border: '#EAB308', label: '#A16207' },
  red:    { bg: '#FEE2E2', border: '#EF4444', label: '#B91C1C' },
};

function SemaforoPanel({
  glucoseToday, studyToday, missionsToday, styles, C, onGlucose, onStudy,
}: {
  glucoseToday: number; studyToday: number; missionsToday: number;
  styles: ReturnType<typeof makeStyles>; C: AppColors;
  onGlucose: () => void; onStudy: () => void;
}) {
  const items: { key: string; icon: string; label: string; color: SemaforoColor; status: string; action: string; onPress?: () => void }[] = [
    {
      key: 'glucose',
      icon: '🩸',
      label: 'Glucosa',
      color: getSemaforoColor(glucoseToday, 3, 1),
      status: glucoseToday === 0 ? '¡Mide ahora!' : glucoseToday < 3 ? `${glucoseToday}/3 hoy` : '¡Al día!',
      action: glucoseToday < 3 ? 'Registrar' : '✓ Listo',
      onPress: onGlucose,
    },
    {
      key: 'study',
      icon: '📚',
      label: 'Estudio',
      color: getSemaforoColor(studyToday, 2, 1),
      status: studyToday === 0 ? 'Sin bloques' : studyToday === 1 ? '1 bloque' : `${studyToday} bloques`,
      action: studyToday < 2 ? 'Empezar' : '✓ Listo',
      onPress: onStudy,
    },
    {
      key: 'missions',
      icon: '🎯',
      label: 'Misiones',
      color: getSemaforoColor(missionsToday, 2, 1),
      status: missionsToday === 0 ? 'Sin completar' : missionsToday === 1 ? '1 ganada' : `${missionsToday} ganadas`,
      action: missionsToday < 2 ? 'Completar' : '✓ Listo',
    },
  ];

  return (
    <View style={styles.semaforoCard}>
      <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>PRÓXIMAS ACCIONES</DyslexiaText>
      <View style={styles.semaforoRow}>
        {items.map((item, idx) => {
          const pal = SEMAFORO_COLORS[item.color];
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.semaforoItem, idx > 0 && styles.semaforoItemBorder]}
              activeOpacity={item.onPress ? 0.7 : 1}
              onPress={item.onPress}
            >
              {/* Traffic light circle */}
              <View style={[styles.semaforoCircle, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                <Text style={styles.semaforoEmoji}>{item.icon}</Text>
              </View>
              <DyslexiaText variant="caption" color={C.darkSecondary} style={styles.semaforoLabel}>{item.label}</DyslexiaText>
              <DyslexiaText variant="caption" color={pal.label} style={styles.semaforoStatus}>{item.status}</DyslexiaText>
              {item.onPress && (
                <View style={[styles.semaforoPill, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                  <DyslexiaText variant="caption" color={pal.label} style={styles.semaforoPillText}>{item.action}</DyslexiaText>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value, valueColor, styles, textColor }: { icon: string; label: string; value: string; valueColor: string; styles: ReturnType<typeof makeStyles>; textColor: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <DyslexiaText variant="body" color={textColor} style={styles.summaryLabel}>{label}</DyslexiaText>
      <DyslexiaText variant="body" color={valueColor} style={styles.summaryValue}>{value}</DyslexiaText>
    </View>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SPACING.sm },
  greetingLabel: { letterSpacing: 0.8, marginBottom: 2 },
  headerTitle:   { fontWeight: '700' },

  pointsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: C.card,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1, borderColor: C.cardBorder,
    ...C.cardShadow,
  },
  badge: {
    width: 32, height: 32, borderRadius: BORDER_RADIUS.full, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  pointsStar:   { fontSize: 18 },
  pointsNumber: { fontWeight: '700', lineHeight: 22 },
  editBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.study + '14', borderWidth: 1, borderColor: C.study + '30', alignItems: 'center', justifyContent: 'center' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  card: {
    width: '48%',
    backgroundColor: C.card,
    borderRadius: C.cardRadius,
    padding: SPACING.md,
    borderWidth: 1, borderColor: C.cardBorder,
    gap: 5,
    overflow: 'hidden',
    ...C.cardShadow,
  },
  iconWrap: {
    width: 44, height: 44,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  icon:       { fontSize: 22 },
  cardLabel:  { fontWeight: '500', letterSpacing: 0.5 },
  cardValue:  { fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  cardSub:    { flex: 1 },
  accentBar:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },

  section: {
    backgroundColor: C.card,
    borderRadius: C.cardRadius,
    padding: SPACING.md,
    borderWidth: 1, borderColor: C.cardBorder,
    ...C.cardShadow,
  },
  sectionLabel: { letterSpacing: 1, fontWeight: '600', marginBottom: SPACING.sm },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: SPACING.sm },
  summaryIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  summaryLabel: { flex: 1 },
  summaryValue: { fontWeight: '600' },
  divider:      { height: 1, backgroundColor: C.cardBorder },

  semaforoCard:       { backgroundColor: C.card, borderRadius: C.cardRadius, padding: SPACING.md, borderWidth: 1, borderColor: C.cardBorder, ...SHADOWS.sm },
  semaforoRow:        { flexDirection: 'row', marginTop: SPACING.xs },
  semaforoItem:       { flex: 1, alignItems: 'center', gap: 5, paddingVertical: SPACING.xs, paddingHorizontal: 4 },
  semaforoItemBorder: { borderLeftWidth: 1, borderLeftColor: C.cardBorder },
  semaforoCircle:     { width: 56, height: 56, borderRadius: 28, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  semaforoEmoji:      { fontSize: 24 },
  semaforoLabel:      { fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  semaforoStatus:     { fontWeight: '700', textAlign: 'center', fontSize: 11 },
  semaforoPill:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1, marginTop: 2 },
  semaforoPillText:   { fontWeight: '600', fontSize: 10 },

  missionRow:    { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: SPACING.sm },
  missionIcon:   { fontSize: 20, width: 28, textAlign: 'center', marginTop: 2 },
  missionInfo:   { flex: 1, gap: 3 },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  missionTitle:  { flex: 1, fontWeight: '600' },
  missionCheck:  { color: '#059669', fontWeight: '700', fontSize: 14 },
  missionReward: { fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.cardBorder, overflow: 'hidden', marginTop: 4 },
  progressFill:  { height: '100%', borderRadius: 3 },

});
