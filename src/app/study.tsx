import React, { useState, useEffect, useRef } from 'react';
import PlaceholderScreen from '@/screens/adult/PlaceholderScreen';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, Vibration, Alert,
  Text, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { addStudyBlock, setActiveTask, toggleStep, clearTask } from '@/store/slices/studySlice';
import { addPoints } from '@/store/slices/gamificationSlice';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { LockedScreen } from '@/components/shared/LockedScreen';
import { LayoutEditor } from '@/components/shared/LayoutEditor';
import { HidableSection } from '@/components/shared/HidableSection';
import { useScreenLayout } from '@/hooks/useScreenLayout';

const MAX_STEPS = 5;

export default function StudyScreen() {
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  if (currentMode === 'adult')  return <PlaceholderScreen emoji="💉" title="Insulina" subtitle="Registro de insulina y carbohidratos. Próximamente." />;
  if (currentMode === 'parent') return <PlaceholderScreen emoji="📚" title="Escuela" subtitle="Seguimiento escolar de tu hijo/a. Próximamente." />;
  return <AdolescentStudyScreen />;
}

function AdolescentStudyScreen() {
  const dispatch  = useDispatch();
  const insets    = useSafeAreaInsets();
  const C         = useAppColors();
  const blocks     = useSelector((s: RootState) => s.study.blocks);
  const SUBJECTS   = useSelector((s: RootState) => s.settings.subjects);
  const activeTask = useSelector((s: RootState) => s.study.activeTask);
  const isFirstLaunch = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);

  // Pomodoro state
  const [duration, setDuration]       = useState<15 | 20>(15);
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [isRunning, setIsRunning]     = useState(false);
  const [subjectIdx, setSubjectIdx]   = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subject = SUBJECTS[subjectIdx];

  const todayStr       = new Date().toDateString();
  const todayBlocks    = blocks.filter(b => new Date(b.date).toDateString() === todayStr);
  const completedToday = todayBlocks.filter(b => b.completed).length;
  const minutesToday   = todayBlocks.filter(b => b.completed).reduce((sum, b) => sum + b.duration, 0);
  const needsBreak     = completedToday > 0 && completedToday % 3 === 0;

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            Vibration.vibrate([500, 300, 500, 300, 500]);
            dispatch(addStudyBlock({ date: new Date().toISOString(), subject: subject.label, duration, completed: true, completedAt: new Date().toISOString() }));
            dispatch(addPoints(15));
            Alert.alert('¡Bloque completado!', `${duration} min de ${subject.label}. +15 puntos ⭐\nDescansa 5 minutos.`);
            return duration * 60;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const startTimer = () => { setSecondsLeft(duration * 60); setIsRunning(true); };
  const stopTimer  = () => { setIsRunning(false); setSecondsLeft(duration * 60); };

  const mins        = Math.floor(secondsLeft / 60);
  const secs        = secondsLeft % 60;
  const progress    = 1 - secondsLeft / (duration * 60);
  const accentColor = isRunning ? subject.color : C.study;

  const { sections } = useScreenLayout('study');
  const [editingLayout, setEditingLayout] = useState(false);

  // Task modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [taskTitle, setTaskTitle]       = useState('');
  const [stepInputs, setStepInputs]     = useState(['', '']);
  const [draggingIdx, setDraggingIdx] = useState(-1);
  const dragFromRef  = useRef(-1);
  const stepRowRefs  = useRef<(View | null)[]>([]);
  const handleRefs   = useRef<(Text | null)[]>([]);

  // Drag-and-drop: only the ⠿ handle is draggable; rows are drop targets
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // Handles → drag sources
    handleRefs.current.slice(0, stepInputs.length).forEach((ref, idx) => {
      const el = ref as unknown as HTMLElement;
      if (!el?.setAttribute) return;
      el.setAttribute('draggable', 'true');
      el.style.cursor = 'grab';
      el.style.userSelect = 'none';
      el.style.webkitUserSelect = 'none';
      el.ondragstart = (e: DragEvent) => {
        dragFromRef.current = idx;
        setDraggingIdx(idx);
        e.stopPropagation();
      };
      el.ondragend = () => setDraggingIdx(-1);
    });
    // Rows → drop targets only (NOT draggable themselves)
    stepRowRefs.current.slice(0, stepInputs.length).forEach((ref, idx) => {
      const el = ref as unknown as HTMLElement;
      if (!el) return;
      el.ondragover = (e: DragEvent) => e.preventDefault();
      el.ondrop = () => {
        const from = dragFromRef.current;
        if (from < 0 || from === idx) { setDraggingIdx(-1); return; }
        setStepInputs(prev => {
          const arr = [...prev];
          const [moved] = arr.splice(from, 1);
          arr.splice(idx, 0, moved);
          return arr;
        });
        setDraggingIdx(-1);
      };
    });
  }, [stepInputs.length, modalVisible]);

  if (isFirstLaunch) return <LockedScreen />;

  const openModal = () => {
    setTaskTitle('');
    setStepInputs(['', '']);
    setModalVisible(true);
  };

  const addStepInput = () => {
    if (stepInputs.length < MAX_STEPS) setStepInputs(prev => [...prev, '']);
  };

  const updateStep = (idx: number, val: string) => {
    setStepInputs(prev => prev.map((s, i) => i === idx ? val : s));
  };

  const removeStepInput = (idx: number) => {
    if (stepInputs.length <= 1) return;
    setStepInputs(prev => prev.filter((_, i) => i !== idx));
  };

  const saveTask = () => {
    const title = taskTitle.trim();
    const steps = stepInputs.map(s => s.trim()).filter(Boolean);
    if (!title || steps.length === 0) return;
    dispatch(setActiveTask({ title, steps }));
    setModalVisible(false);
  };

  const handleToggleStep = (id: string) => {
    dispatch(toggleStep(id));
    // Check if all steps done after toggle
    if (activeTask) {
      const steps = activeTask.steps.map(s => s.id === id ? { ...s, done: !s.done } : s);
      const allDone = steps.every(s => s.done);
      if (allDone) {
        dispatch(addPoints(10));
        if (Platform.OS === 'web') {
          if (window.confirm('¡Has terminado todos los pasos! +10 puntos ⭐\n\n¿Empezar nueva tarea?')) {
            dispatch(clearTask());
          }
        } else {
          Alert.alert('¡Tarea completada!', '¡Has terminado todos los pasos! +10 puntos ⭐', [
            { text: 'Nueva tarea', onPress: () => dispatch(clearTask()) },
            { text: '¡Genial!', style: 'cancel' },
          ]);
        }
      }
    }
  };

  // Task progress
  const doneSteps  = activeTask?.steps.filter(s => s.done).length ?? 0;
  const totalSteps = activeTask?.steps.length ?? 0;
  const taskPct    = totalSteps > 0 ? doneSteps / totalSteps : 0;
  const allDone    = totalSteps > 0 && doneSteps === totalSteps;

  const styles = makeStyles(C);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={[styles.headerIcon, { backgroundColor: C.study + '18' }]}>
              <Text style={{ fontSize: 18 }}>✏️</Text>
            </View>
            <DyslexiaText variant="h2" color={C.dark} style={{ fontWeight: '700' }}>Estudio</DyslexiaText>
            {needsBreak && (
              <View style={styles.breakBadge}>
                <DyslexiaText variant="caption" color={C.home} style={{ fontWeight: '600' }}>☕ Descansa</DyslexiaText>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setEditingLayout(true)} style={styles.editBtn}>
            <DyslexiaText variant="small" color={C.study} style={{ fontWeight: '600' }}>✏️ Editar</DyslexiaText>
          </TouchableOpacity>
        </View>

        <LayoutEditor screen="study" visible={editingLayout} onClose={() => setEditingLayout(false)} />

        {sections.filter(s => s.visible).map(section => {
          switch (section.id) {
            case 'stats':
              return (
                <HidableSection key="stats" screen="study" sectionId="stats" label="Estadísticas">
                <View style={styles.statsRow}>
                  <StatChip value={String(completedToday)} label="bloques" icon="✅" color={C.study} darkTertiary={C.darkTertiary} />
                  <View style={styles.statDivider} />
                  <StatChip value={`${minutesToday}`} label="minutos" icon="🕐" color={C.green} darkTertiary={C.darkTertiary} />
                  <View style={styles.statDivider} />
                  <StatChip value={`${completedToday * 15}`} label="puntos" icon="⭐" color={C.gamification} darkTertiary={C.darkTertiary} />
                </View>
                </HidableSection>
              );
            case 'pomodoro':
              return (
                <HidableSection key="pomodoro" screen="study" sectionId="pomodoro" label="Temporizador Pomodoro">
                <View style={styles.pomodoroCard}>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>ASIGNATURA</DyslexiaText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                    <View style={styles.subjectRow}>
                      {SUBJECTS.map((s, i) => {
                        const active = i === subjectIdx;
                        return (
                          <TouchableOpacity
                            key={s.label}
                            style={[styles.subjectChip, active && { backgroundColor: s.color, borderColor: s.color }]}
                            onPress={() => { if (!isRunning) setSubjectIdx(i); }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.subjectIcon}>{s.icon}</Text>
                            <DyslexiaText variant="small" color={active ? '#fff' : C.darkSecondary}
                              style={{ fontWeight: active ? '600' : '400' }}>
                              {s.label}
                            </DyslexiaText>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>DURACIÓN</DyslexiaText>
                  <View style={styles.segmented}>
                    {([15, 20] as const).map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[styles.segment, duration === d && [styles.segmentActive, { backgroundColor: accentColor }]]}
                        onPress={() => { if (!isRunning) { setDuration(d); setSecondsLeft(d * 60); } }}
                        activeOpacity={0.7}
                      >
                        <DyslexiaText variant="small" color={duration === d ? '#fff' : C.darkSecondary}
                          style={{ fontWeight: '600' }}>
                          {d} min
                        </DyslexiaText>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.timerWrap}>
                    <Text
                      style={[styles.timerText, { color: accentColor }]}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                    >
                      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                    </Text>
                    {isRunning && (
                      <>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, {
                            width: `${Math.round(progress * 100)}%` as `${number}%`,
                            backgroundColor: accentColor,
                          }]} />
                        </View>
                        <DyslexiaText variant="caption" color={C.darkTertiary}>
                          {subject.icon} {subject.label} · {duration} min
                        </DyslexiaText>
                      </>
                    )}
                  </View>
                  {!isRunning ? (
                    <TouchableOpacity
                      style={[styles.mainBtn, { backgroundColor: needsBreak ? C.gray : accentColor }]}
                      onPress={startTimer}
                      disabled={needsBreak}
                      activeOpacity={0.85}
                    >
                      <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '600' }}>
                        {needsBreak ? '☕ Descansa primero' : 'Empezar sesión'}
                      </DyslexiaText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.mainBtn, { backgroundColor: '#EF4444' }]} onPress={stopTimer} activeOpacity={0.85}>
                      <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '600' }}>Cancelar</DyslexiaText>
                    </TouchableOpacity>
                  )}
                </View>
                </HidableSection>
              );
            case 'breakdown':
              return (
                <HidableSection key="breakdown" screen="study" sectionId="breakdown" label="Desglose de tarea">
                <View style={styles.card}>
                  <View style={styles.taskHeader}>
                    <View>
                      <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionLabel}>DESGLOSE DE TAREA</DyslexiaText>
                      {activeTask && (
                        <DyslexiaText variant="small" color={C.darkSecondary} style={styles.taskProgressLabel}>
                          {doneSteps} de {totalSteps} pasos completados
                        </DyslexiaText>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[styles.newTaskBtn, { backgroundColor: C.study + '18', borderColor: C.study + '40' }]}
                      onPress={activeTask ? () => {
                        if (Platform.OS === 'web') {
                          if (window.confirm('¿Descartar la tarea actual y crear una nueva?')) {
                            dispatch(clearTask()); openModal();
                          }
                        } else {
                          Alert.alert('Nueva tarea', '¿Quieres descartar la tarea actual?', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Sí, nueva', onPress: () => { dispatch(clearTask()); openModal(); } },
                          ]);
                        }
                      } : openModal}
                      activeOpacity={0.7}
                    >
                      <DyslexiaText variant="caption" color={C.study} style={{ fontWeight: '600' }}>
                        {activeTask ? '↺ Cambiar' : '+ Nueva'}
                      </DyslexiaText>
                    </TouchableOpacity>
                  </View>
                  {!activeTask ? (
                    <TouchableOpacity style={styles.emptyTask} onPress={openModal} activeOpacity={0.7}>
                      <Text style={styles.emptyTaskIcon}>📝</Text>
                      <DyslexiaText variant="body" color={C.darkSecondary} style={{ textAlign: 'center' }}>
                        Divide tu tarea en pasos pequeños
                      </DyslexiaText>
                      <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center' }}>
                        Máximo {MAX_STEPS} pasos · Toca para empezar
                      </DyslexiaText>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <DyslexiaText variant="body" color={C.dark} style={styles.taskTitle}>
                        {activeTask.title}
                      </DyslexiaText>
                      <View style={styles.taskProgressTrack}>
                        <View style={[styles.taskProgressFill, {
                          width: `${Math.round(taskPct * 100)}%` as any,
                          backgroundColor: allDone ? C.green : C.study,
                        }]} />
                      </View>
                      <View style={styles.stepsList}>
                        {activeTask.steps.map((step, idx) => (
                          <TouchableOpacity
                            key={step.id}
                            style={[styles.stepRow, idx < activeTask.steps.length - 1 && styles.stepBorder]}
                            onPress={() => handleToggleStep(step.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.stepCheck, step.done && { backgroundColor: C.green, borderColor: C.green }]}>
                              {step.done && <Text style={styles.stepCheckMark}>✓</Text>}
                            </View>
                            <View style={styles.stepNumber}>
                              <DyslexiaText variant="caption" color={step.done ? C.green : C.darkTertiary} style={styles.stepNum}>
                                {idx + 1}
                              </DyslexiaText>
                            </View>
                            <DyslexiaText
                              variant="body"
                              color={step.done ? C.darkTertiary : C.dark}
                              style={[styles.stepText, step.done && styles.stepTextDone]}
                            >
                              {step.text}
                            </DyslexiaText>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {allDone && (
                        <View style={styles.allDoneBanner}>
                          <Text style={{ fontSize: 20 }}>🎉</Text>
                          <DyslexiaText variant="small" color={C.green} style={{ fontWeight: '700', flex: 1 }}>
                            ¡Tarea completada! +10 pts
                          </DyslexiaText>
                          <TouchableOpacity onPress={() => dispatch(clearTask())}>
                            <DyslexiaText variant="caption" color={C.darkTertiary}>Nueva →</DyslexiaText>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </View>
                </HidableSection>
              );
            default:
              return null;
          }
        })}

        {todayBlocks.length > 0 && (
          <View style={styles.card}>
            <DyslexiaText variant="small" color={C.darkTertiary} style={styles.sectionLabel}>COMPLETADO HOY</DyslexiaText>
            {todayBlocks.filter(b => b.completed).map((b, i) => {
              const sub = SUBJECTS.find(s => s.label === b.subject);
              return (
                <View key={i} style={[styles.blockItem, i < todayBlocks.length - 1 && styles.blockItemBorder]}>
                  <View style={[styles.blockDot, { backgroundColor: sub?.color ?? C.gray }]} />
                  <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>{b.subject}</DyslexiaText>
                  <DyslexiaText variant="small" color={C.darkSecondary}>{b.duration} min</DyslexiaText>
                  <DyslexiaText variant="caption" color={C.green} style={{ fontWeight: '600', marginLeft: 4 }}>+15</DyslexiaText>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* New Task Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>Nueva tarea</DyslexiaText>
            <DyslexiaText variant="caption" color={C.darkTertiary}>
              Escribe el nombre y divide en hasta {MAX_STEPS} pasos
            </DyslexiaText>

            <TextInput
              style={[styles.titleInput, { color: C.dark, borderColor: taskTitle ? C.study : C.cardBorder }]}
              placeholder="¿Qué tienes que hacer?"
              placeholderTextColor={C.darkTertiary}
              value={taskTitle}
              onChangeText={setTaskTitle}
              maxLength={60}
            />

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.stepsLabel}>
              PASOS ({stepInputs.length}/{MAX_STEPS})
            </DyslexiaText>

            {stepInputs.map((val, idx) => (
              <View
                key={idx}
                ref={el => { stepRowRefs.current[idx] = el; }}
                style={[styles.stepInputRow, draggingIdx === idx && { opacity: 0.35 }]}
              >
                <Text ref={el => { handleRefs.current[idx] = el; }} style={styles.dragHandle}>⠿</Text>
                <View style={styles.stepInputNum}>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={{ fontWeight: '700' }}>{idx + 1}</DyslexiaText>
                </View>
                <TextInput
                  style={[styles.stepInput, { color: C.dark, borderColor: val ? C.study + '60' : C.cardBorder }]}
                  placeholder={`Paso ${idx + 1}…`}
                  placeholderTextColor={C.darkTertiary}
                  value={val}
                  onChangeText={t => updateStep(idx, t)}
                  maxLength={80}
                />
                {stepInputs.length > 1 && (
                  <TouchableOpacity onPress={() => removeStepInput(idx)} style={styles.removeBtn}>
                    <Text style={{ fontSize: 16, color: C.darkTertiary }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {stepInputs.length < MAX_STEPS && (
              <TouchableOpacity style={[styles.addStepBtn, { borderColor: C.cardBorder }]} onPress={addStepInput} activeOpacity={0.7}>
                <DyslexiaText variant="small" color={C.darkTertiary}>+ Añadir paso</DyslexiaText>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: C.bg, borderColor: C.cardBorder }]}
                onPress={() => setModalVisible(false)} activeOpacity={0.7}>
                <DyslexiaText variant="body" color={C.darkSecondary} style={{ fontWeight: '600' }}>Cancelar</DyslexiaText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, {
                  backgroundColor: taskTitle.trim() && stepInputs.some(s => s.trim()) ? C.study : C.gray,
                }]}
                onPress={saveTask}
                activeOpacity={0.85}
              >
                <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '600' }}>Guardar tarea</DyslexiaText>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function StatChip({ value, label, icon, color, darkTertiary }: { value: string; label: string; icon: string; color: string; darkTertiary: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, gap: 4 }}>
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <DyslexiaText variant="h2" color={color} style={{ fontWeight: '700', letterSpacing: -0.5 }}>{value}</DyslexiaText>
      <DyslexiaText variant="caption" color={darkTertiary} style={{ fontWeight: '500' }}>{label}</DyslexiaText>
    </View>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg },
  content:      { padding: SPACING.md, gap: SPACING.lg, paddingBottom: SPACING.xxl },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.xs },
  headerIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  breakBadge:   { backgroundColor: C.home + '14', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, borderWidth: 1, borderColor: C.home + '30' },
  editBtn:      { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BORDER_RADIUS.full, backgroundColor: C.study + '14', borderWidth: 1, borderColor: C.study + '30' },
  statsRow:     { flexDirection: 'row', backgroundColor: C.card, borderRadius: C.cardRadius, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', ...C.cardShadow },
  statDivider:  { width: 1, backgroundColor: C.cardBorder, marginVertical: SPACING.md },
  pomodoroCard: { backgroundColor: C.card, borderRadius: C.cardRadius, padding: SPACING.md, borderWidth: 1, borderColor: C.cardBorder, gap: SPACING.sm, ...C.cardShadow },
  sectionLabel: { letterSpacing: 0.8, fontWeight: '600', marginBottom: -2 },
  subjectScroll:{ marginHorizontal: -SPACING.xs },
  subjectRow:   { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.xs },
  subjectChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: SPACING.sm, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.cardBorder },
  subjectIcon:  { fontSize: 14 },
  segmented:    { flexDirection: 'row', backgroundColor: C.bg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: C.cardBorder, padding: 3 },
  segment:      { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: BORDER_RADIUS.md - 2 },
  segmentActive:{ borderRadius: BORDER_RADIUS.md - 2 },
  timerWrap:    { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg, gap: SPACING.sm },
  timerText:    { fontSize: 76, fontWeight: '700', letterSpacing: -2 },
  progressBar:  { width: '100%', height: 4, backgroundColor: C.cardBorder, borderRadius: BORDER_RADIUS.full, overflow: 'hidden', marginTop: SPACING.md },
  progressFill: { height: '100%', borderRadius: BORDER_RADIUS.full },
  mainBtn:      { padding: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center', minHeight: 54, justifyContent: 'center' },

  card:         { backgroundColor: C.card, borderRadius: C.cardRadius, padding: SPACING.md, borderWidth: 1, borderColor: C.cardBorder, gap: SPACING.sm, ...C.cardShadow },

  // Task Breakdown
  taskHeader:        { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  taskProgressLabel: { marginTop: 2 },
  newTaskBtn:        { paddingHorizontal: SPACING.sm, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  emptyTask:         { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyTaskIcon:     { fontSize: 36 },
  taskTitle:         { fontWeight: '600', lineHeight: 24 },
  taskProgressTrack: { height: 8, borderRadius: 4, backgroundColor: C.cardBorder, overflow: 'hidden' },
  taskProgressFill:  { height: '100%', borderRadius: 4 },
  stepsList:         { gap: 0, marginTop: SPACING.xs },
  stepRow:           { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12, minHeight: 52 },
  stepBorder:        { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  stepCheck:         { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepCheckMark:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepNumber:        { width: 20, alignItems: 'center', flexShrink: 0 },
  stepNum:           { fontWeight: '700' },
  stepText:          { flex: 1, lineHeight: 22 },
  stepTextDone:      { opacity: 0.45 },
  allDoneBanner:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.green + '15', borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, marginTop: SPACING.xs },

  // Completed blocks
  blockItem:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 10 },
  blockItemBorder:  { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  blockDot:         { width: 10, height: 10, borderRadius: 5 },

  // Modal
  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  modalCard:     { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, gap: SPACING.md, maxHeight: '90%' },
  modalHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: SPACING.xs },
  titleInput:    { borderWidth: 1.5, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, fontSize: 16, fontWeight: '600', backgroundColor: C.bg },
  stepsLabel:    { letterSpacing: 0.8, fontWeight: '600' },
  stepInputRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  dragHandle:    { fontSize: 18, color: '#CBD5E1', paddingHorizontal: 2 },
  stepInputNum:  { width: 24, height: 24, borderRadius: 12, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepInput:     { flex: 1, borderWidth: 1.5, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: 15, backgroundColor: C.bg },
  removeBtn:     { padding: 6 },
  addStepBtn:    { borderWidth: 1, borderStyle: 'dashed', borderRadius: BORDER_RADIUS.lg, padding: SPACING.sm, alignItems: 'center' },
  modalActions:  { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  modalBtn:      { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder, minHeight: 52, justifyContent: 'center' },
  modalBtnPrimary: { borderWidth: 0 },
});
