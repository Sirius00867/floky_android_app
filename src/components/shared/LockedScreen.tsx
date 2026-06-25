import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DyslexiaText } from './DyslexiaText';
import { useAppColors } from '@/hooks/useAppColors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

export function LockedScreen() {
  const C      = useAppColors();
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.cardBorder }]}>
        <Text style={styles.icon}>🔒</Text>
        <DyslexiaText variant="h3" color={C.dark} style={styles.title}>
          Completa la configuración
        </DyslexiaText>
        <DyslexiaText variant="body" color={C.darkSecondary} style={styles.body}>
          Termina el registro inicial desde la pantalla de Inicio para acceder a esta sección.
        </DyslexiaText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:  { borderRadius: BORDER_RADIUS.xl, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, width: '100%', maxWidth: 340, ...SHADOWS.sm },
  icon:  { fontSize: 48, marginBottom: 4 },
  title: { fontWeight: '700', textAlign: 'center' },
  body:  { textAlign: 'center', lineHeight: 22 },
});
