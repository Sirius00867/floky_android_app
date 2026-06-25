import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModeTheme } from '@/hooks/useModeTheme';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface Props {
  title:    string;
  emoji:    string;
  subtitle?: string;
}

export default function PlaceholderScreen({ title, emoji, subtitle }: Props) {
  const { colors: C } = useModeTheme();
  const insets        = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: C.bg, paddingTop: insets.top + 72 }]}>
      <View style={[styles.card, { backgroundColor: C.white, borderColor: C.border }]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.title, { color: C.dark }]}>{title}</Text>
        <Text style={[styles.sub, { color: C.darkTertiary }]}>
          {subtitle ?? 'Esta sección estará disponible próximamente.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: SPACING.lg },
  card:      { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, maxWidth: 320, width: '100%' },
  emoji:     { fontSize: 48 },
  title:     { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  sub:       { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
