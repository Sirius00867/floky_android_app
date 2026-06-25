import React, { useState } from 'react';
import PlaceholderScreen from '@/screens/adult/PlaceholderScreen';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { addDailyChat } from '@/store/slices/relationSlice';
import { addPoints } from '@/store/slices/gamificationSlice';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { LockedScreen } from '@/components/shared/LockedScreen';

const CHAT_TOPICS = [
  'Que fue lo mejor de hoy?',
  'Que te hizo sonreir hoy?',
  'Cual fue tu momento favorito?',
  'Aprendiste algo interesante hoy?',
];

export default function RelationScreen() {
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  if (currentMode === 'adult')  return <PlaceholderScreen emoji="⚙️" title="Ajustes" subtitle="Ve a Ajustes desde el menú lateral." />;
  if (currentMode === 'parent') return <PlaceholderScreen emoji="⚙️" title="Ajustes" subtitle="Ve a Ajustes desde el menú lateral." />;
  return <AdolescentRelationScreen />;
}

function AdolescentRelationScreen() {
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();
  const C        = useAppColors();
  const chats         = useSelector((s: RootState) => s.relation.dailyChats);
  const isFirstLaunch = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);
  const [message, setMessage] = useState('');

  if (isFirstLaunch) return <LockedScreen />;

  const todayStr  = new Date().toDateString();
  const todayChat = chats.find(c => new Date(c.date).toDateString() === todayStr);
  const topic = CHAT_TOPICS[new Date().getDay() % CHAT_TOPICS.length];

  const handleSend = () => {
    if (message.trim().length < 3) {
      Alert.alert('Escribe algo', 'Tu mensaje es demasiado corto.');
      return;
    }
    dispatch(addDailyChat({ date: new Date().toISOString(), message: message.trim(), completed: true }));
    dispatch(addPoints(5));
    setMessage('');
    Alert.alert('Enviado', 'Mensaje enviado a tu familia. +5 puntos');
  };

  const styles = makeStyles(C);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.md }]}>
      <DyslexiaText variant="h2" color={C.dark}>💬 Relación</DyslexiaText>

      <View style={styles.card}>
        <DyslexiaText variant="h3" color={C.dark}>Chat diario - 10 min</DyslexiaText>
        <DyslexiaText variant="small" color={C.darkSecondary}>Solo temas positivos. Sin salud ni notas.</DyslexiaText>

        <View style={styles.topicBox}>
          <DyslexiaText variant="body" color={C.relation}>{topic}</DyslexiaText>
        </View>

        {todayChat ? (
          <View style={styles.sentBox}>
            <DyslexiaText variant="small" color={C.green}>Enviado hoy</DyslexiaText>
            <DyslexiaText variant="body" color={C.dark}>{todayChat.message}</DyslexiaText>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              multiline
              numberOfLines={3}
              placeholder="Escribe aqui..."
              placeholderTextColor={C.gray}
              value={message}
              onChangeText={setMessage}
              maxLength={150}
            />
            <DyslexiaText variant="caption" color={C.darkTertiary}>{message.length}/150</DyslexiaText>
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <DyslexiaText variant="body" color="#fff">Enviar (+5 pts)</DyslexiaText>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.card}>
        <DyslexiaText variant="h3" color={C.dark}>Reunion semanal</DyslexiaText>
        <DyslexiaText variant="body" color={C.darkSecondary}>Domingos a las 19:00 - 15 minutos con estructura fija</DyslexiaText>
        {[
          '1. Que funciono esta semana?',
          '2. Que no funciono?',
          '3. Que cambiamos?',
          '4. Que recompensa corresponde?',
        ].map((item, i) => (
          <View key={i} style={styles.weeklyItem}>
            <DyslexiaText variant="body" color={C.dark}>{item}</DyslexiaText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const makeStyles = (C: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content:   { padding: SPACING.md, gap: SPACING.md, paddingBottom: SPACING.xxl },
  card:      { backgroundColor: C.card, borderRadius: C.cardRadius, padding: SPACING.md, borderWidth: 1, borderColor: C.cardBorder, gap: SPACING.sm, ...C.cardShadow },
  topicBox:  { backgroundColor: C.scheme === 'dark' ? '#2D1B2E' : '#FDF2F8', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: C.relation + '30' },
  sentBox:   { backgroundColor: C.scheme === 'dark' ? '#052E16' : '#ECFDF5', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, gap: SPACING.xs, borderWidth: 1, borderColor: C.green + '40' },
  input:     { borderWidth: 1.5, borderColor: C.cardBorder, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, fontSize: 16, minHeight: 100, textAlignVertical: 'top', color: C.dark, backgroundColor: C.bg },
  sendBtn:   { backgroundColor: C.relation, padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  weeklyItem:{ borderLeftWidth: 3, borderLeftColor: C.cardBorder, paddingLeft: SPACING.md, paddingVertical: SPACING.xs },
});
