import React from 'react';
import PlaceholderScreen from '@/screens/adult/PlaceholderScreen';
import { View, ScrollView, StyleSheet, TouchableOpacity, Vibration, Text } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { toggleTask } from '@/store/slices/homeSlice';
import { addPoints } from '@/store/slices/gamificationSlice';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { LockedScreen } from '@/components/shared/LockedScreen';

export default function HomeScreen() {
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  if (currentMode === 'adult')  return <PlaceholderScreen emoji="📄" title="Informes" subtitle="Exportación e informes de glucosa. Próximamente." />;
  if (currentMode === 'parent') return <PlaceholderScreen emoji="🔔" title="Alertas" subtitle="Alertas y notificaciones del estado de tu hijo/a. Próximamente." />;
  return <AdolescentHomeScreen />;
}

function AdolescentHomeScreen() {
  const dispatch  = useDispatch();
  const insets    = useSafeAreaInsets();
  const C         = useAppColors();
  const completedTasksRaw = useSelector((s: RootState) => s.home.completedTasks);
  const routineTasks      = useSelector((s: RootState) => s.settings.routineTasks);
  const isFirstLaunch     = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);

  if (isFirstLaunch) return <LockedScreen />;

  const ROUTINE_META = {
    morning:   { label: 'Mañana',  icon: '🌅', color: C.yellow },
    afternoon: { label: 'Tarde',   icon: '📖', color: C.study  },
    evening:   { label: 'Noche',   icon: '🌙', color: C.relation },
  } as const;

  const today = new Date().toDateString();
  const completed = new Set(
    completedTasksRaw.filter(t => new Date(t.date).toDateString() === today).map(t => t.taskId)
  );

  const handleToggle = (taskId: string) => {
    const wasDone = completed.has(taskId);
    dispatch(toggleTask(taskId));
    if (!wasDone) {
      Vibration.vibrate(100);
      dispatch(addPoints(2));
    }
  };

  const styles = makeStyles(C);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <DyslexiaText variant="h2" color={C.dark} style={styles.screenTitle}>Casa</DyslexiaText>

      {(['morning', 'afternoon', 'evening'] as const).map(rid => {
        const meta  = ROUTINE_META[rid];
        const tasks = routineTasks.filter(t => t.routineId === rid).sort((a, b) => a.order - b.order);
        if (tasks.length === 0) return null;
        const done    = tasks.filter(t => completed.has(t.id)).length;
        const pct     = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
        const allDone = done === tasks.length;

        return (
          <View key={rid} style={styles.card}>
            <View style={styles.routineHeader}>
              <View style={styles.routineTitleRow}>
                <Text style={styles.routineIcon}>{meta.icon}</Text>
                <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>{meta.label}</DyslexiaText>
              </View>
              <View style={[styles.countBadge, allDone && styles.countBadgeDone]}>
                <DyslexiaText variant="caption" color={allDone ? '#fff' : C.darkSecondary} style={{ fontWeight: '600' }}>
                  {done}/{tasks.length}
                </DyslexiaText>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, {
                width: `${pct}%` as `${number}%`,
                backgroundColor: allDone ? C.green : meta.color,
              }]} />
            </View>

            <View style={styles.taskList}>
              {tasks.map((task, idx) => {
                const isDone = completed.has(task.id);
                const isLast = idx === tasks.length - 1;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[styles.taskItem, !isLast && styles.taskItemBorder]}
                    activeOpacity={0.6}
                    onPress={() => handleToggle(task.id)}
                  >
                    <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                      {isDone && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.taskEmoji, isDone && { opacity: 0.4 }]}>{task.icon}</Text>
                    <DyslexiaText
                      variant="body"
                      color={isDone ? C.darkTertiary : C.dark}
                      style={[styles.taskLabel, isDone && styles.taskLabelDone]}
                    >
                      {task.label}
                    </DyslexiaText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg },
  content:     { padding: SPACING.md, gap: SPACING.md },
  screenTitle: { fontWeight: '700', paddingVertical: SPACING.sm },
  card:        { backgroundColor: C.card, borderRadius: C.cardRadius, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', ...C.cardShadow },
  routineHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, paddingBottom: SPACING.sm },
  routineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  routineIcon:     { fontSize: 22 },
  countBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder },
  countBadgeDone:  { backgroundColor: C.green, borderColor: C.green },
  progressBar:     { height: 3, backgroundColor: C.cardBorder, marginHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginBottom: SPACING.xs },
  progressFill:    { height: '100%', borderRadius: BORDER_RADIUS.full },
  taskList:        { paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  taskItem:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12, minHeight: 48 },
  taskItemBorder:  { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  checkbox:        { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxDone:    { backgroundColor: C.green, borderColor: C.green },
  checkmark:       { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskEmoji:       { fontSize: 18, width: 28, textAlign: 'center' },
  taskLabel:       { flex: 1 },
  taskLabelDone:   { textDecorationLine: 'line-through', opacity: 0.5 },
});
