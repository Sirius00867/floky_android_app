import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  value:    number;
  min:      number;
  max:      number;
  step?:    number;
  suffix?:  string;
  color?:   string;
  onChange: (v: number) => void;
}

export function NumberStepper({ value, min, max, step = 1, suffix = '', color, onChange }: Props) {
  const C = useAppColors();
  const accent = color ?? C.health;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>−</Text>
      </TouchableOpacity>
      <Text style={{ minWidth: 68, textAlign: 'center', fontSize: 18, fontWeight: '800', color: accent as string }}>
        {value}{suffix}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(Math.min(max, value + step))}
        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}
