import React from 'react';
import { View, Text, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { DyslexiaText } from './DyslexiaText';
import { useAppColors } from '@/hooks/useAppColors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

function PinDots({ value, error }: { value: string; error?: boolean }) {
  const C = useAppColors();
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.md, marginVertical: SPACING.sm }}>
      {[0, 1, 2, 3].map(i => (
        <View
          key={i}
          style={[
            styles.dot,
            { borderColor: C.cardBorder },
            i < value.length && { backgroundColor: C.study, borderColor: C.study },
            !!error && { borderColor: C.red },
          ]}
        />
      ))}
    </View>
  );
}

function PinPad({ value, onChange, maxLen, onComplete }: {
  value: string; onChange: (v: string) => void; maxLen: number; onComplete?: (final: string) => void;
}) {
  const C = useAppColors();
  const press = (d: string) => {
    if (value.length >= maxLen) return;
    const next = value + d;
    onChange(next);
    if (next.length === maxLen) setTimeout(() => onComplete?.(next), 200);
  };
  const del = () => onChange(value.slice(0, -1));
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={styles.padGrid}>
      {keys.map((k, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.padKey, { backgroundColor: C.bg, borderColor: C.cardBorder }, k === '' && { opacity: 0 }]}
          onPress={() => k === '⌫' ? del() : k !== '' ? press(k) : undefined}
          activeOpacity={0.7}
          disabled={k === ''}
        >
          <Text style={{ fontSize: 20, fontWeight: '600', color: C.dark }}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function PinModal({
  visible,
  onSuccess,
  onCancel,
  pin,
}: {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  pin: string;
}) {
  const C = useAppColors();
  const [entered, setEntered] = React.useState('');
  const [error, setError]     = React.useState('');

  React.useEffect(() => {
    if (!visible) { setEntered(''); setError(''); }
  }, [visible]);

  const check = (final: string) => {
    if (final === pin) {
      onSuccess();
    } else {
      setError('PIN incorrecto. Inténtalo de nuevo.');
      setEntered('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
          <Text style={styles.emoji}>🔒</Text>
          <DyslexiaText variant="h3" color={C.dark} style={styles.title}>Zona Parental</DyslexiaText>
          <DyslexiaText variant="body" color={C.darkSecondary} style={styles.body}>
            Introduce el PIN para acceder a los ajustes.
          </DyslexiaText>
          {!!error && (
            <DyslexiaText variant="small" color={C.red} style={{ textAlign: 'center' }}>{error}</DyslexiaText>
          )}
          <PinDots value={entered} error={!!error} />
          <PinPad value={entered} onChange={setEntered} maxLen={4} onComplete={check} />
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <DyslexiaText variant="small" color={C.darkTertiary}>Cancelar</DyslexiaText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dot:     { width: 16, height: 16, borderRadius: 8, borderWidth: 2, backgroundColor: 'transparent' },
  padGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 216, justifyContent: 'center', gap: SPACING.sm },
  padKey:  { width: 60, height: 60, borderRadius: BORDER_RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card:    { borderRadius: 20, borderWidth: 1, padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, maxWidth: 340, width: '90%' },
  emoji:   { fontSize: 36 },
  title:   { fontWeight: '700', textAlign: 'center' },
  body:    { textAlign: 'center', lineHeight: 22 },
  cancelBtn: { marginTop: SPACING.xs, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
});
