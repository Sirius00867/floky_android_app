import React, { useState, useEffect } from 'react';
import {
  View, TextInput, StyleSheet, TouchableOpacity, Text,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import {
  setUserName, completeOnboarding, setDisplayMode,
  setIsMinor, setLegalConsentAccepted, setParentalConsentAccepted,
} from '@/store/slices/settingsSlice';

type Step = 'welcome' | 'age' | 'parentalConsent' | 'legalConsent' | 'childName' | 'mode' | 'permissions' | 'done';
type PermStatus = 'pending' | 'granted' | 'denied';


export default function OnboardingScreen({ onFinish }: { onFinish?: () => void }) {
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();

  const [step, setStep]           = useState<Step>('welcome');
  const [childName, setChildName] = useState('');
  const [isMinorUser, setIsMinorUser] = useState(false);
  const [legalChecked, setLegalChecked]     = useState(false);
  const [medicalChecked, setMedicalChecked] = useState(false);
  const [parentalChecked, setParentalChecked] = useState(false);

  const handleNameNext = () => {
    if (childName.trim().length < 2) return;
    setStep('mode');
  };

  const handleModeSelect = (mode: 'dyslexia' | 'normal') => {
    dispatch(setDisplayMode(mode));
    dispatch(setUserName(childName.trim()));
    setStep('permissions');
  };

  const handlePermissionsDone = () => {
    dispatch(setIsMinor(isMinorUser));
    dispatch(setLegalConsentAccepted(true));
    if (isMinorUser) dispatch(setParentalConsentAccepted(true));
    dispatch(completeOnboarding());
    setStep('done');
    setTimeout(() => onFinish?.(), 800);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {step === 'welcome' && (
          <StepCard
            emoji="👋"
            title="Hola, soy floky 🌸"
            body="Tu centro de mando. Acompaño a tu hijo/a cada día: glucosa, estudio y rutinas — todo en un solo lugar."
            subBody="Primero necesito un par de datos. Solo te llevará un minuto."
            primaryLabel="Empezar configuración"
            onPrimary={() => setStep('age')}
          />
        )}

        {step === 'age' && (
          <View style={styles.card}>
            <Text style={styles.emoji}>🎂</Text>
            <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
              ¿Cuántos años tiene el menor?
            </DyslexiaText>
            <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
              Esto determina los requisitos legales de privacidad que aplican.
            </DyslexiaText>
            <TouchableOpacity
              style={[styles.modeCard]}
              onPress={() => { setIsMinorUser(false); setStep('legalConsent'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeEmoji}>🧑</Text>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>16 años o más</Text>
                <Text style={styles.modeDesc}>Puede aceptar los términos por sí mismo/a</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeCard, styles.modeCardNormal]}
              onPress={() => { setIsMinorUser(true); setStep('parentalConsent'); }}
              activeOpacity={0.8}
            >
              <Text style={styles.modeEmoji}>👧</Text>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, styles.modeTitleNormal]}>Menos de 16 años</Text>
                <Text style={styles.modeDesc}>Se requiere consentimiento parental (RGPD España)</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'parentalConsent' && (
          <View style={styles.card}>
            <Text style={styles.emoji}>👨‍👩‍👧</Text>
            <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
              Consentimiento parental
            </DyslexiaText>
            <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
              El menor tiene menos de 16 años. Según el RGPD y la ley española, un padre, madre o tutor legal debe autorizar el tratamiento de sus datos.
            </DyslexiaText>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setParentalChecked(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, parentalChecked && styles.checkboxChecked]}>
                {parentalChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <DyslexiaText variant="body" color={COLORS.dark} style={styles.consentText}>
                Yo, como padre/madre/tutor legal, doy mi consentimiento expreso para el tratamiento de los datos personales de mi hijo/a menor de 16 años en floky.
              </DyslexiaText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, !parentalChecked && styles.btnDisabled]}
              onPress={() => parentalChecked && setStep('legalConsent')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'legalConsent' && (
          <View style={styles.card}>
            <Text style={styles.emoji}>📋</Text>
            <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
              Antes de empezar
            </DyslexiaText>
            <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
              Por favor lee y acepta los siguientes puntos importantes:
            </DyslexiaText>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setLegalChecked(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, legalChecked && styles.checkboxChecked]}>
                {legalChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <DyslexiaText variant="body" color={COLORS.dark} style={styles.consentText}>
                Entiendo que mis datos se guardan <Text style={{ fontWeight: '700' }}>localmente en este dispositivo</Text> y no se envían a ningún servidor externo sin mi permiso.
              </DyslexiaText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setMedicalChecked(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, medicalChecked && styles.checkboxChecked]}>
                {medicalChecked && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <DyslexiaText variant="body" color={COLORS.dark} style={styles.consentText}>
                Entiendo que floky <Text style={{ fontWeight: '700' }}>NO es un dispositivo médico certificado</Text> (no tiene certificación MDR/SaMD) y no reemplaza el consejo de un profesional médico.
              </DyslexiaText>
            </TouchableOpacity>
            <View style={styles.legalNote}>
              <DyslexiaText variant="caption" color={COLORS.darkTertiary} style={{ lineHeight: 18 }}>
                🚧 floky está en fase beta. Contacto: diegozamoranogarcia@gmail.com
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[styles.btn, (!legalChecked || !medicalChecked) && styles.btnDisabled]}
              onPress={() => (legalChecked && medicalChecked) && setStep('childName')}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>Acepto y continúo →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'childName' && (
          <View style={styles.card}>
            <Text style={styles.emoji}>🧒</Text>
            <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
              ¿Cómo se llama tu hijo/a?
            </DyslexiaText>
            <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
              Usaremos su nombre para personalizar la experiencia.
            </DyslexiaText>
            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor={COLORS.darkTertiary}
              value={childName}
              onChangeText={setChildName}
              autoFocus
              maxLength={20}
              returnKeyType="next"
              onSubmitEditing={handleNameNext}
            />
            <TouchableOpacity
              style={[styles.btn, childName.trim().length < 2 && styles.btnDisabled]}
              onPress={handleNameNext}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'mode' && (
          <View style={styles.card}>
            <Text style={styles.emoji}>🎨</Text>
            <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
              ¿Cómo prefieres la app?
            </DyslexiaText>
            <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
              Puedes cambiarlo más adelante en Ajustes.
            </DyslexiaText>

            <TouchableOpacity style={styles.modeCard} onPress={() => handleModeSelect('dyslexia')} activeOpacity={0.8}>
              <Text style={styles.modeEmoji}>🌈</Text>
              <View style={styles.modeText}>
                <Text style={styles.modeTitle}>Modo Dislexia</Text>
                <Text style={styles.modeDesc}>Letras más grandes · Más espacio · Colores · Texto en voz alta</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modeCard, styles.modeCardNormal]} onPress={() => handleModeSelect('normal')} activeOpacity={0.8}>
              <Text style={styles.modeEmoji}>📋</Text>
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, styles.modeTitleNormal]}>Modo Normal</Text>
                <Text style={styles.modeDesc}>Interfaz compacta y ordenada · Tipografía estándar</Text>
              </View>
              <Text style={styles.modeArrow}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'permissions' && (
          <PermissionsStep name={childName} onDone={handlePermissionsDone} />
        )}

        {step === 'done' && (
          <StepCard
            emoji="✅"
            title={`¡Todo listo, ${childName}!`}
            body="La app está configurada. Puedes ocultar el botón de ajustes desde Configuración para que tu hijo/a no lo vea."
            primaryLabel="Entrar a la app"
            onPrimary={() => onFinish?.()}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Permissions step ─────────────────────────────────────────────────────────

function PermissionsStep({ name, onDone }: { name: string; onDone: () => void }) {
  const [notifStatus, setNotifStatus] = useState<PermStatus>('pending');
  const [requesting, setRequesting]   = useState(false);
  const checkAnim = React.useRef(new Animated.Value(0)).current;

  const requestAll = async () => {
    setRequesting(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setNotifStatus(status === 'granted' ? 'granted' : 'denied');
      if (status === 'granted') {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge:  true,
            shouldShowBanner: true,
            shouldShowList:   true,
          }),
        });
      }
    } catch {
      setNotifStatus('denied');
    }
    Animated.spring(checkAnim, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
    setRequesting(false);
  };

  const allDone = notifStatus !== 'pending';

  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>🔔</Text>
      <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>
        Activar avisos
      </DyslexiaText>
      <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>
        Girasol necesita notificaciones para avisar a {name} cuando sea importante.
      </DyslexiaText>

      <View style={styles.permList}>
        <View style={styles.permRow}>
          <Text style={styles.permIcon}>📳</Text>
          <DyslexiaText variant="body" color={COLORS.dark} style={{ flex: 1 }}>
            Notificaciones — alertas de glucosa y rutinas
          </DyslexiaText>
          <Text style={styles.permBadge}>
            {notifStatus === 'pending' ? '⏳' : notifStatus === 'granted' ? '✅' : '⚠️'}
          </Text>
        </View>
      </View>

      {!allDone ? (
        <TouchableOpacity
          style={[styles.btn, requesting && styles.btnDisabled]}
          onPress={requestAll}
          disabled={requesting}
          activeOpacity={0.8}
        >
          <Text style={styles.btnText}>{requesting ? 'Activando...' : 'Activar notificaciones'}</Text>
        </TouchableOpacity>
      ) : (
        <Animated.View style={{ width: '100%', transform: [{ scale: checkAnim }] }}>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green }]} onPress={onDone} activeOpacity={0.8}>
            <Text style={styles.btnText}>¡Listo! Entrar →</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
        <DyslexiaText variant="caption" color={COLORS.darkTertiary}>Saltar por ahora</DyslexiaText>
      </TouchableOpacity>
    </View>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StepCard({
  emoji, title, body, subBody, primaryLabel, onPrimary,
}: {
  emoji: string; title: string; body: string; subBody?: string;
  primaryLabel: string; onPrimary: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <DyslexiaText variant="h2" color={COLORS.dark} style={styles.title}>{title}</DyslexiaText>
      <DyslexiaText variant="body" color={COLORS.darkSecondary} style={styles.body}>{body}</DyslexiaText>
      {!!subBody && (
        <DyslexiaText variant="small" color={COLORS.darkTertiary} style={styles.subBody}>{subBody}</DyslexiaText>
      )}
      <TouchableOpacity style={styles.btn} onPress={onPrimary} activeOpacity={0.8}>
        <Text style={styles.btnText}>{primaryLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function PinDots({ value, error }: { value: string; error?: boolean }) {
  return (
    <View style={styles.dots}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={[
          styles.dot,
          i < value.length && styles.dotFilled,
          error && styles.dotError,
        ]} />
      ))}
    </View>
  );
}

function PinPad({ value, onChange, maxLen, onComplete }: {
  value: string; onChange: (v: string) => void; maxLen: number; onComplete?: (final: string) => void;
}) {
  const press = (d: string) => {
    if (value.length >= maxLen) return;
    const next = value + d;
    onChange(next);
    if (next.length === maxLen) setTimeout(() => onComplete?.(next), 200);
  };
  const del = () => onChange(value.slice(0, -1));
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={styles.pad}>
      {keys.map((k, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.padKey, k === '' && { opacity: 0 }]}
          onPress={() => k === '⌫' ? del() : k !== '' ? press(k) : undefined}
          activeOpacity={0.7}
          disabled={k === ''}
        >
          <Text style={styles.padKeyText}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: SPACING.lg },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  emoji:   { fontSize: 52, marginBottom: SPACING.xs },
  title:   { fontWeight: '700', textAlign: 'center' },
  body:    { textAlign: 'center', lineHeight: 24 },
  subBody: { textAlign: 'center', lineHeight: 20 },
  errorText: { textAlign: 'center' },

  input: {
    width: '100%',
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: 18, color: COLORS.dark,
    textAlign: 'center', backgroundColor: COLORS.bg,
  },

  btn:         { width: '100%', backgroundColor: COLORS.study, borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.sm },
  btnDisabled: { opacity: 0.4 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn:     { paddingVertical: SPACING.sm },

  dots:      { flexDirection: 'row', gap: SPACING.md, marginVertical: SPACING.sm },
  dot:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border, backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: COLORS.study, borderColor: COLORS.study },
  dotError:  { borderColor: COLORS.red },

  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, justifyContent: 'center', gap: SPACING.sm },
  padKey: { width: 68, height: 68, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  padKeyText: { fontSize: 22, fontWeight: '600', color: COLORS.dark },

  modeCard:       { width: '100%', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: '#EEF2FF', borderRadius: BORDER_RADIUS.xl, padding: SPACING.md, borderWidth: 2, borderColor: COLORS.study },
  modeCardNormal: { backgroundColor: '#F8FAFC', borderColor: COLORS.border },
  modeEmoji:      { fontSize: 32 },
  modeText:       { flex: 1, gap: 4 },
  modeTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.study },
  modeTitleNormal:{ color: COLORS.dark },
  modeDesc:       { fontSize: 12, color: COLORS.darkSecondary, lineHeight: 17 },
  modeArrow:      { fontSize: 18, color: COLORS.darkTertiary },

  permList:    { width: '100%', borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  permRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, minHeight: 56 },
  permIcon:    { fontSize: 22, width: 30, textAlign: 'center' },
  permBadge:   { fontSize: 18 },
  permDivider: { height: 1, backgroundColor: COLORS.border },

  consentRow: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, backgroundColor: '#F8FAFC', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  checkbox:   { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  checkboxChecked: { backgroundColor: COLORS.study, borderColor: COLORS.study },
  checkmark:  { color: '#fff', fontSize: 14, fontWeight: '700' },
  consentText:{ flex: 1, lineHeight: 22 },
  legalNote:  { width: '100%', backgroundColor: '#FFF7ED', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: '#FED7AA' },
});
