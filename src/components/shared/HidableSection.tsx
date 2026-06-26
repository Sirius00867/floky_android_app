import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Modal, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { toggleSection, type ScreenId } from '@/store/slices/layoutSlice';
import { useAppColors } from '@/hooks/useAppColors';
import { DyslexiaText } from './DyslexiaText';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface Props {
  screen: ScreenId;
  sectionId: string;
  label: string;
  children: React.ReactNode;
}

export function HidableSection({ screen, sectionId, label, children }: Props) {
  const dispatch = useDispatch();
  const C = useAppColors();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleHide = () => setConfirmVisible(true);

  const confirmHide = () => {
    dispatch(toggleSection({ screen, sectionId }));
    setConfirmVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      {children}

      {/* Botón ocultar — posición absoluta en esquina superior derecha para no duplicarse en el layout */}
      <View style={[styles.hideBar, { pointerEvents: 'box-none' }]}>
        <TouchableOpacity
          onPress={handleHide}
          style={[styles.hideBtn, { borderColor: C.cardBorder, backgroundColor: C.card }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ fontSize: 11, color: C.darkTertiary as string }}>🙈 Ocultar</Text>
        </TouchableOpacity>
      </View>

      {/* Confirmación */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700', marginBottom: SPACING.xs }}>
              Ocultar sección
            </DyslexiaText>
            <DyslexiaText variant="body" color={C.darkSecondary} style={{ marginBottom: SPACING.md }}>
              Se ocultará «{label}». Puedes volver a activarla desde Ajustes → Personalización.
            </DyslexiaText>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <TouchableOpacity
                onPress={() => setConfirmVisible(false)}
                style={[styles.btn, { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder }]}
              >
                <DyslexiaText variant="small" color={C.darkSecondary}>Cancelar</DyslexiaText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmHide}
                style={[styles.btn, { backgroundColor: '#EF4444', flex: 1 }]}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>Ocultar</DyslexiaText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',   // contexto de apilamiento aislado
  },
  hideBar: {
    position: 'absolute',   // flota sobre el contenido sin afectar el layout
    top: 8,
    right: 8,
    zIndex: 10,
  },
  hideBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    opacity: 0.80,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
