import React, { useEffect, useState } from 'react';
import {
  Modal, View, ScrollView, TouchableOpacity, TextInput, Alert,
  StyleSheet, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { DyslexiaText } from './shared/DyslexiaText';
import { addInsulinPattern, updateInsulinPattern, type InsulinPattern } from '@/store/slices/healthSlice';
import { useAppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  editing?: InsulinPattern;
}

export function PatternLogger({ visible, onClose, editing }: Props) {
  const dispatch = useDispatch();
  const C = useAppColors();

  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');
  const [rapidUnits, setRapidUnits] = useState('');
  const [carbRations, setCarbRations] = useState('');
  const [days, setDays] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      if (editing) {
        setLabel(editing.label);
        setTime(editing.time);
        setRapidUnits(String(editing.rapidUnits));
        setCarbRations(String(editing.carbRations));
        setDays([...editing.days]);
      } else {
        setLabel('');
        setTime('');
        setRapidUnits('');
        setCarbRations('');
        setDays([]);
      }
    }
  }, [visible, editing]);

  const toggleDay = (dayNum: number) => {
    setDays(prev => prev.includes(dayNum) ? prev.filter(d => d !== dayNum) : [...prev, dayNum].sort((a, b) => a - b));
  };

  const setDaysQuick = (dayNums: number[]) => {
    setDays(dayNums.length === 0 ? [] : Array.from({ length: 7 }, (_, i) => i).filter(i => dayNums.includes(i)));
  };

  const handleTimeChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 2) {
      clean = clean.slice(0, 2) + ':' + clean.slice(2, 4);
    }
    setTime(clean.slice(0, 5));
  };

  const handleSave = () => {
    if (!label.trim() || !time.trim() || !rapidUnits.trim() || !carbRations.trim() || days.length === 0) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      Alert.alert('Error', 'Hora debe ser HH:MM');
      return;
    }

    if (editing) {
      dispatch(updateInsulinPattern({
        id: editing.id,
        label: label.trim(),
        time,
        rapidUnits: parseFloat(rapidUnits),
        carbRations: parseFloat(carbRations),
        days,
        active: editing.active,
      }));
    } else {
      dispatch(addInsulinPattern({
        label: label.trim(),
        time,
        rapidUnits: parseFloat(rapidUnits),
        carbRations: parseFloat(carbRations),
        days,
      }));
    }
    onClose();
  };

  const styles = makeStyles(C);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.header}>
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>
              💉 {editing ? 'Editar' : 'Nuevo'} patrón
            </DyslexiaText>
            <TouchableOpacity onPress={onClose}>
              <DyslexiaText variant="body" color={C.darkTertiary}>✕</DyslexiaText>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginBottom: SPACING.xs }}>
              Nombre
            </DyslexiaText>
            <TextInput
              style={[styles.input, { borderColor: C.cardBorder }]}
              placeholder="ej: Desayuno"
              placeholderTextColor={C.darkTertiary}
              value={label}
              onChangeText={setLabel}
            />

            <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginTop: SPACING.md, marginBottom: SPACING.xs }}>
              Hora (HH:MM)
            </DyslexiaText>
            <TextInput
              style={[styles.input, { borderColor: C.cardBorder }]}
              placeholder="08:00"
              placeholderTextColor={C.darkTertiary}
              value={time}
              onChangeText={handleTimeChange}
              maxLength={5}
            />

            <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginTop: SPACING.md, marginBottom: SPACING.xs }}>
              Insulina rápida (unidades)
            </DyslexiaText>
            <TextInput
              style={[styles.input, { borderColor: C.cardBorder }]}
              placeholder="5"
              placeholderTextColor={C.darkTertiary}
              value={rapidUnits}
              onChangeText={setRapidUnits}
              keyboardType="decimal-pad"
            />

            <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginTop: SPACING.md, marginBottom: SPACING.xs }}>
              Raciones de carbohidratos
            </DyslexiaText>
            <TextInput
              style={[styles.input, { borderColor: C.cardBorder }]}
              placeholder="2.5"
              placeholderTextColor={C.darkTertiary}
              value={carbRations}
              onChangeText={setCarbRations}
              keyboardType="decimal-pad"
            />

            <View style={{ marginTop: SPACING.lg, marginBottom: SPACING.md }}>
              <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginBottom: SPACING.sm }}>
                Días
              </DyslexiaText>

              <View style={{ flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.sm }}>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: days.length === 5 && !days.includes(0) && !days.includes(6) ? C.study : C.bg }]} onPress={() => setDaysQuick([1, 2, 3, 4, 5])}>
                  <DyslexiaText variant="small" color={days.length === 5 && !days.includes(0) && !days.includes(6) ? '#fff' : C.darkSecondary}>L–V</DyslexiaText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: days.length === 2 && days.includes(5) && days.includes(6) ? C.study : C.bg }]} onPress={() => setDaysQuick([5, 6])}>
                  <DyslexiaText variant="small" color={days.length === 2 && days.includes(5) && days.includes(6) ? '#fff' : C.darkSecondary}>S–D</DyslexiaText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickBtn, { backgroundColor: days.length === 7 ? C.study : C.bg }]} onPress={() => setDaysQuick([0, 1, 2, 3, 4, 5, 6])}>
                  <DyslexiaText variant="small" color={days.length === 7 ? '#fff' : C.darkSecondary}>Todos</DyslexiaText>
                </TouchableOpacity>
              </View>

              <View style={styles.dayGrid}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
                  <TouchableOpacity key={i} style={[styles.dayBtn, days.includes(i) && { backgroundColor: C.study }]} onPress={() => toggleDay(i)}>
                    <DyslexiaText variant="small" color={days.includes(i) ? '#fff' : C.darkSecondary} style={{ fontWeight: '600' }}>
                      {d}
                    </DyslexiaText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ backgroundColor: C.bg, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg }}>
              <DyslexiaText variant="small" color={C.darkTertiary} style={{ marginBottom: SPACING.xs }}>
                📋 Resumen:
              </DyslexiaText>
              <DyslexiaText variant="body" color={C.dark}>
                {label || '(sin nombre)'} · {time || '--:--'}
              </DyslexiaText>
              <DyslexiaText variant="small" color={C.darkSecondary}>
                {rapidUnits || '0'} ud rápida · {carbRations || '0'} rac · {days.length > 0 ? `${days.length} día${days.length > 1 ? 's' : ''}` : 'sin días'}
              </DyslexiaText>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.bg, borderColor: C.cardBorder, borderWidth: 1 }]} onPress={onClose}>
              <DyslexiaText variant="small" color={C.darkSecondary}>Cancelar</DyslexiaText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.health, flex: 1 }]} onPress={handleSave}>
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                {editing ? 'Actualizar' : 'Crear'}
              </DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C: ReturnType<typeof useAppColors>) => StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', paddingHorizontal: SPACING.md },
  card:     { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: C.cardBorder, padding: SPACING.md, maxHeight: '90%' },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  input:    { borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, fontSize: 16, color: C.dark, marginBottom: SPACING.sm },
  quickBtn: { flex: 1, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  dayGrid:  { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
  dayBtn:   { flex: 1, minWidth: '30%', paddingVertical: 10, borderRadius: BORDER_RADIUS.md, backgroundColor: C.bg, alignItems: 'center' },
  actions:  { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn:      { flex: 1, paddingVertical: 12, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
});
