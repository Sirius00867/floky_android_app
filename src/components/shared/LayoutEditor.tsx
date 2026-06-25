import React, { useState } from 'react';
import {
  View, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Text,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useAppColors } from '@/hooks/useAppColors';
import { useScreenLayout } from '@/hooks/useScreenLayout';
import { DyslexiaText } from './DyslexiaText';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { applyScreenLayout } from '@/store/slices/layoutSlice';
import type { ScreenId, SectionConfig } from '@/store/slices/layoutSlice';
import type { RootState } from '@/store/store';

// Labels y emojis legibles por sección
const SECTION_META: Record<string, { label: string; emoji: string }> = {
  // index
  grid:        { label: 'Módulos principales', emoji: '🟦' },
  actions:     { label: 'Próximas acciones',   emoji: '⚡' },
  missions:    { label: 'Misiones del día',     emoji: '🎯' },
  // health
  register:    { label: 'Registrar glucosa',    emoji: '✏️' },
  protocol:    { label: 'Protocolo diario',     emoji: '📋' },
  dexcom:      { label: 'Conexión Dexcom',      emoji: '📡' },
  chart:       { label: 'Gráfico del día',      emoji: '📈' },
  // study
  stats:       { label: 'Estadísticas',         emoji: '📊' },
  pomodoro:    { label: 'Temporizador',          emoji: '⏱️' },
  breakdown:   { label: 'Desglose de tarea',    emoji: '📝' },
  // home
  morning:     { label: 'Rutina de mañana',     emoji: '🌅' },
  afternoon:   { label: 'Rutina de tarde',      emoji: '📖' },
  evening:     { label: 'Rutina de noche',      emoji: '🌙' },
  // relation
  chat:        { label: 'Chat familiar',        emoji: '💬' },
  weekly:      { label: 'Resumen semanal',      emoji: '📅' },
};

interface Props {
  screen: ScreenId;
  visible: boolean;
  onClose: () => void;
}

export function LayoutEditor({ screen, visible, onClose }: Props) {
  const C = useAppColors();
  const dispatch = useDispatch();
  const { sections, reset } = useScreenLayout(screen);
  const gamificationEnabled = useSelector((s: RootState) => s.settings?.gamificationEnabled ?? true);
  const [localOrder, setLocalOrder] = useState<SectionConfig[]>([]);

  // Sync local order when modal opens
  React.useEffect(() => {
    if (visible) setLocalOrder([...sections]);
  }, [visible]);

  // Sections to show — hide 'missions' if gamification is off
  const visibleSections = localOrder.filter(s => s.id !== 'missions' || gamificationEnabled);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...localOrder];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setLocalOrder(next);
  };

  const moveDown = (idx: number) => {
    if (idx === localOrder.length - 1) return;
    const next = [...localOrder];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setLocalOrder(next);
  };

  const handleSave = () => {
    dispatch(applyScreenLayout({ screen, sections: localOrder }));
    onClose();
  };

  const handleReset = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.cardBorder }]}>

          {/* Header */}
          <View style={styles.header}>
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>
              ✏️ Personalizar sección
            </DyslexiaText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: 20, color: C.darkTertiary as string }}>✕</Text>
            </TouchableOpacity>
          </View>

          <DyslexiaText variant="small" color={C.darkSecondary} style={{ marginBottom: SPACING.md }}>
            Activa, desactiva y reordena con las flechas ↑↓
          </DyslexiaText>

          <ScrollView showsVerticalScrollIndicator={false}>
            {visibleSections.map((sec, idx) => {
              const meta = SECTION_META[sec.id] ?? { label: sec.id, emoji: '▪️' };
              const realIdx = localOrder.findIndex(s => s.id === sec.id);
              return (
                <View key={sec.id} style={[styles.row, { borderColor: C.cardBorder }]}>
                  {/* Toggle */}
                  <TouchableOpacity
                    onPress={() => setLocalOrder(prev => prev.map(s => s.id === sec.id ? { ...s, visible: !s.visible } : s))}
                    style={[styles.toggle, sec.visible && { backgroundColor: C.study }]}>
                    <Text style={{ color: sec.visible ? '#fff' : C.darkTertiary as string, fontSize: 12, fontWeight: '700' }}>
                      {sec.visible ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>

                  {/* Label */}
                  <Text style={{ fontSize: 18, marginHorizontal: 8 }}>{meta.emoji}</Text>
                  <DyslexiaText
                    variant="body"
                    color={sec.visible ? C.dark : C.darkTertiary}
                    style={{ flex: 1, fontWeight: sec.visible ? '600' : '400' }}>
                    {meta.label}
                  </DyslexiaText>

                  {/* Order arrows */}
                  <View style={styles.arrows}>
                    <TouchableOpacity onPress={() => moveUp(realIdx)} disabled={realIdx === 0}
                      style={[styles.arrow, realIdx === 0 && { opacity: 0.2 }]}>
                      <Text style={styles.arrowText}>↑</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveDown(realIdx)} disabled={realIdx === localOrder.length - 1}
                      style={[styles.arrow, realIdx === localOrder.length - 1 && { opacity: 0.2 }]}>
                      <Text style={styles.arrowText}>↓</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleReset} style={[styles.btn, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder }]}>
              <DyslexiaText variant="small" color={C.darkSecondary}>↺ Restablecer</DyslexiaText>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: C.study, flex: 1 }]}>
              <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>Guardar cambios</DyslexiaText>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:    { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, padding: SPACING.md, maxHeight: '85%' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  closeBtn: { padding: 8 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  toggle:   { width: 44, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  arrows:   { flexDirection: 'row', gap: 4 },
  arrow:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  arrowText:{ fontSize: 16, fontWeight: '700', color: '#475569' },
  footer:   { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn:      { paddingVertical: 13, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
});
