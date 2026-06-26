import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Text, Alert, Platform, Modal,
} from 'react-native';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { APP_VERSION } from '@/constants/version';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import {
  setUserName, setColorScheme, setAiEnabled, setCompanion, setParentCompanion, setGroqApiKey,
  setNightscoutUrl, setNightscoutApiSecret,
  setLibreLinkUpEmail, setDexcomShareUsername, setTidepoolEmail,
  setChildName, setParentAlertLow, setParentAlertHigh, setParentNotifEnabled,
  setGlucoseTargetLow, setGlucoseTargetHigh,
  resetAllUserData,
} from '@/store/slices/settingsSlice';
import { persistor } from '@/store/store';
import { clearManualGlucoseReadings } from '@/store/slices/healthSlice';
import { setUserMode, setPendingModeIntro } from '@/store/slices/userModeSlice';
import { MODE_LABELS, MODE_EMOJIS, MODE_DESCRIPTIONS } from '@/constants/modeNavigationConfig';
import type { UserMode } from '@/store/slices/userModeSlice';
import {
  testNightscoutConnection,
  saveNightscoutConfig,
  clearNightscoutConfig,
} from '@/services/nightscoutService';
import {
  loginLibreLinkOfficial,
  clearLibreLinkOfficialSession,
} from '@/services/libreLinkOfficialService';
import {
  loginDexcomShare,
  clearDexcomShareSession,
} from '@/services/dexcomShareService';
import {
  loginTidepool,
  clearTidepoolSession,
} from '@/services/tidepoolService';
import { validateHttpsUrl } from '@/utils/securityUtils';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { NumberStepper } from '@/components/shared/NumberStepper';
import type { RootState } from '@/store/store';

const ACCENT = '#8B5CF6'; // violeta — color del modo padre

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const C = useAppColors();
  return (
    <View style={{ paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, paddingBottom: SPACING.xs }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.darkTertiary as string, letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {title}
      </Text>
    </View>
  );
}

// ── Screen principal ──────────────────────────────────────────────────────────

export default function ParentSettingsScreen() {
  const dispatch  = useDispatch();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const C         = useAppColors();

  const currentMode       = useSelector((s: RootState) => s.userMode?.currentMode ?? 'parent');
  const seenModeIntros    = useSelector((s: RootState) => s.userMode?.seenModeIntros ?? []);
  const userName          = useSelector((s: RootState) => s.settings.userName);
  const childName         = useSelector((s: RootState) => s.settings.childName ?? '');
  const colorScheme       = useSelector((s: RootState) => s.settings.colorScheme ?? 'light');
  const aiEnabled         = useSelector((s: RootState) => s.settings.aiEnabled ?? true);
  const groqApiKey        = useSelector((s: RootState) => s.settings.groqApiKey ?? '');
  const companion         = useSelector((s: RootState) => s.settings.parentCompanion ?? 'dino');
  const envGroqKey        = (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
  const [groqKeyInput, setGroqKeyInput] = useState(groqApiKey);
  const parentAlertLow    = useSelector((s: RootState) => s.settings.parentAlertLow ?? 70);
  const parentAlertHigh   = useSelector((s: RootState) => s.settings.parentAlertHigh ?? 250);
  const parentNotifEnabled = useSelector((s: RootState) => s.settings.parentNotifEnabled ?? true);
  const glucoseTargetLow  = useSelector((s: RootState) => s.settings.glucoseTargetLow ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings.glucoseTargetHigh ?? 180);
  const nightscoutUrl       = useSelector((s: RootState) => s.settings.nightscoutUrl ?? '');
  const nightscoutApiSecret = useSelector((s: RootState) => s.settings.nightscoutApiSecret ?? '');
  const libreLinkUpEmail    = useSelector((s: RootState) => s.settings.libreLinkUpEmail ?? '');
  const dexcomShareUsername = useSelector((s: RootState) => s.settings.dexcomShareUsername ?? '');
  const tidepoolEmail       = useSelector((s: RootState) => s.settings.tidepoolEmail ?? '');

  // Local inputs
  const [nameInput, setNameInput]         = useState(userName);
  const [childNameInput, setChildNameInput] = useState(childName);

  // Sensors
  const [nsUrlInput, setNsUrlInput]         = useState(nightscoutUrl);
  const [nsSecretInput, setNsSecretInput]   = useState(nightscoutApiSecret);
  const [nsSecretVisible, setNsSecretVisible] = useState(false);
  const [nsTesting, setNsTesting]           = useState(false);
  const [nsStatus, setNsStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [nsError, setNsError]               = useState('');
  const [nsExpanded, setNsExpanded]         = useState(true);

  const [lluEmailInput, setLluEmailInput]     = useState(libreLinkUpEmail);
  const [lluPasswordInput, setLluPasswordInput] = useState('');
  const [lluPwVisible, setLluPwVisible]       = useState(false);
  const [lluTesting, setLluTesting]           = useState(false);
  const [lluStatus, setLluStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [lluError, setLluError]               = useState('');
  const [lluExpanded, setLluExpanded]         = useState(true);

  const [dexShareUserInput, setDexShareUserInput]       = useState(dexcomShareUsername);
  const [dexSharePasswordInput, setDexSharePasswordInput] = useState('');
  const [dexSharePwVisible, setDexSharePwVisible]       = useState(false);
  const [dexShareTesting, setDexShareTesting]           = useState(false);
  const [dexShareStatus, setDexShareStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [dexShareError, setDexShareError]               = useState('');
  const [dexShareExpanded, setDexShareExpanded]         = useState(true);

  const [tpEmailInput, setTpEmailInput]     = useState(tidepoolEmail);
  const [tpPasswordInput, setTpPasswordInput] = useState('');
  const [tpPwVisible, setTpPwVisible]       = useState(false);
  const [tpTesting, setTpTesting]           = useState(false);
  const [tpStatus, setTpStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [tpError, setTpError]               = useState('');
  const [tpExpanded, setTpExpanded]         = useState(true);

  const [infoModal, setInfoModal] = useState<'policy' | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);

  const isNsConnected     = !!nightscoutUrl && !!nightscoutApiSecret;
  const isLluConnected    = !!libreLinkUpEmail;
  const isDexShareConnected = !!dexcomShareUsername;
  const isTpConnected     = !!tidepoolEmail;

  // Sensor handlers
  const handleNightscoutConnect = async () => {
    if (!nsUrlInput.trim() || !nsSecretInput.trim()) return;
    const urlCheck = validateHttpsUrl(nsUrlInput.trim());
    if (!urlCheck.ok) { setNsStatus('error'); setNsError(urlCheck.error); return; }
    setNsTesting(true); setNsStatus('idle');
    const result = await testNightscoutConnection(urlCheck.url, nsSecretInput.trim());
    if (result.ok) {
      dispatch(setNightscoutUrl(urlCheck.url));
      dispatch(setNightscoutApiSecret(nsSecretInput.trim()));
      await saveNightscoutConfig({ url: urlCheck.url, apiSecret: nsSecretInput.trim() });
      setNsStatus('ok');
    } else { setNsStatus('error'); setNsError(result.error ?? 'No se pudo conectar'); }
    setNsTesting(false);
  };
  const handleNightscoutDisconnect = async () => {
    dispatch(setNightscoutUrl('')); dispatch(setNightscoutApiSecret(''));
    await clearNightscoutConfig();
    setNsUrlInput(''); setNsSecretInput(''); setNsStatus('idle');
  };

  const handleLibreLinkConnect = async () => {
    if (!lluEmailInput.trim() || !lluPasswordInput.trim()) return;
    setLluTesting(true); setLluStatus('idle');
    const result = await loginLibreLinkOfficial(lluEmailInput.trim(), lluPasswordInput.trim());
    if (result.ok) { dispatch(setLibreLinkUpEmail(lluEmailInput.trim())); setLluStatus('ok'); setLluPasswordInput(''); }
    else { setLluStatus('error'); setLluError(result.error ?? 'Email o contraseña incorrectos'); }
    setLluTesting(false);
  };
  const handleLibreLinkDisconnect = async () => {
    await clearLibreLinkOfficialSession(); dispatch(setLibreLinkUpEmail(''));
    setLluEmailInput(''); setLluPasswordInput(''); setLluStatus('idle');
  };

  const handleDexcomShareConnect = async () => {
    if (!dexShareUserInput.trim() || !dexSharePasswordInput.trim()) return;
    setDexShareTesting(true); setDexShareStatus('idle');
    const result = await loginDexcomShare(dexShareUserInput.trim(), dexSharePasswordInput.trim());
    if (result.ok) { dispatch(setDexcomShareUsername(dexShareUserInput.trim())); setDexShareStatus('ok'); setDexSharePasswordInput(''); }
    else { setDexShareStatus('error'); setDexShareError(result.error ?? 'Usuario o contraseña incorrectos'); }
    setDexShareTesting(false);
  };
  const handleDexcomShareDisconnect = async () => {
    await clearDexcomShareSession(); dispatch(setDexcomShareUsername(''));
    setDexShareUserInput(''); setDexSharePasswordInput(''); setDexShareStatus('idle');
  };

  const handleTidepoolConnect = async () => {
    if (!tpEmailInput.trim() || !tpPasswordInput.trim()) return;
    setTpTesting(true); setTpStatus('idle');
    const result = await loginTidepool(tpEmailInput.trim(), tpPasswordInput.trim());
    if (result.ok) { dispatch(setTidepoolEmail(tpEmailInput.trim())); setTpStatus('ok'); setTpPasswordInput(''); }
    else { setTpStatus('error'); setTpError(result.error ?? 'Email o contraseña incorrectos'); }
    setTpTesting(false);
  };
  const handleTidepoolDisconnect = async () => {
    await clearTidepoolSession(); dispatch(setTidepoolEmail(''));
    setTpEmailInput(''); setTpPasswordInput(''); setTpStatus('idle');
  };

  const s = styles(C);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: insets.top + SPACING.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <DyslexiaText variant="h2" color={C.dark} style={{ fontWeight: '700' }}>Ajustes</DyslexiaText>
          <View style={[s.modeBadge, { backgroundColor: ACCENT + '20', borderColor: ACCENT + '40' }]}>
            <Text style={{ fontSize: 13 }}>👨‍👩‍👧</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT }}>Padre/Madre</Text>
          </View>
        </View>

        {/* ── PERFIL ── */}
        <SectionHeader title="PERFIL" />
        <View style={s.card}>
          <DyslexiaText variant="caption" color={C.darkTertiary} style={s.fieldLabel}>TU NOMBRE (PADRE/MADRE)</DyslexiaText>
          <View style={s.nameRow}>
            <TextInput
              style={s.nameInput}
              placeholder="Tu nombre…"
              placeholderTextColor={C.darkTertiary}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => dispatch(setUserName(nameInput.trim()))}
            />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: ACCENT }]} onPress={() => dispatch(setUserName(nameInput.trim()))}>
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
            </TouchableOpacity>
          </View>

          <View style={s.listItemBorder} />

          <DyslexiaText variant="caption" color={C.darkTertiary} style={s.fieldLabel}>NOMBRE DEL HIJO/A</DyslexiaText>
          <View style={s.nameRow}>
            <TextInput
              style={s.nameInput}
              placeholder="Nombre de tu hijo/a…"
              placeholderTextColor={C.darkTertiary}
              value={childNameInput}
              onChangeText={setChildNameInput}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => dispatch(setChildName(childNameInput.trim()))}
            />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: ACCENT }]} onPress={() => dispatch(setChildName(childNameInput.trim()))}>
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ALERTAS ── */}
        <SectionHeader title="ALERTAS DE GLUCOSA 🚨" />
        <View style={s.card}>
          <DyslexiaText variant="caption" color={C.darkTertiary} style={{ padding: SPACING.md, paddingBottom: 4, lineHeight: 18 }}>
            Recibirás una notificación cuando la glucosa de {childName || 'tu hijo/a'} salga de estos umbrales.
          </DyslexiaText>

          {/* Toggle notificaciones */}
          <View style={[s.listItem, { borderBottomWidth: 1, borderBottomColor: C.cardBorder }]}>
            <Text style={{ fontSize: 20 }}>🔔</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Notificaciones push</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {parentNotifEnabled ? 'Activas — te avisamos si sale de rango' : 'Desactivadas'}
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[s.toggle, parentNotifEnabled && { backgroundColor: ACCENT }]}
              onPress={() => dispatch(setParentNotifEnabled(!parentNotifEnabled))}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, parentNotifEnabled && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {/* Umbral baja */}
          <View style={[s.listItem, { borderBottomWidth: 1, borderBottomColor: C.cardBorder, paddingBottom: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>⬇️ Alerta hipoglucemia</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Alerta urgente por debajo de este valor</DyslexiaText>
            </View>
            <NumberStepper
              value={parentAlertLow}
              min={40} max={100} step={5}
              suffix=" mg/dL"
              color="#EF4444"
              onChange={v => dispatch(setParentAlertLow(v))}
            />
          </View>

          {/* Umbral alta */}
          <View style={[s.listItem, { paddingBottom: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>⬆️ Alerta hiperglucemia</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Aviso cuando supere este valor</DyslexiaText>
            </View>
            <NumberStepper
              value={parentAlertHigh}
              min={150} max={400} step={10}
              suffix=" mg/dL"
              color="#F59E0B"
              onChange={v => dispatch(setParentAlertHigh(v))}
            />
          </View>

          {/* Resumen */}
          <View style={{ margin: SPACING.md, marginTop: 0, padding: SPACING.sm, backgroundColor: ACCENT + '10', borderRadius: BORDER_RADIUS.md, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>Urgente: &lt; {parentAlertLow} mg/dL</DyslexiaText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>En rango: {parentAlertLow}–{parentAlertHigh} mg/dL</DyslexiaText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>Alta: &gt; {parentAlertHigh} mg/dL</DyslexiaText>
            </View>
          </View>
        </View>

        {/* ── SENSOR DEL HIJO/A ── */}
        <SectionHeader title={`SENSOR DE ${(childName || 'TU HIJO/A').toUpperCase()} 💉`} />

        {/* Nightscout */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setNsExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🔗</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Nightscout</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isNsConnected ? `Conectado · ${nightscoutUrl.replace(/^https?:\/\//, '')}` : 'Dexcom, Libre, AAPS, Loop'}
              </DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isNsConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isNsConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isNsConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{nsExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {nsExpanded && !isNsConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="https://nightscout-hijo.fly.dev"
                placeholderTextColor={C.darkTertiary} value={nsUrlInput}
                onChangeText={v => { setNsUrlInput(v); setNsStatus('idle'); }}
                autoCapitalize="none" keyboardType="url" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="API secret"
                  placeholderTextColor={C.darkTertiary} value={nsSecretInput}
                  onChangeText={v => { setNsSecretInput(v); setNsStatus('idle'); }}
                  secureTextEntry={!nsSecretVisible} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setNsSecretVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{nsSecretVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {nsStatus === 'error' && <DyslexiaText variant="caption" color={C.red}>❌ {nsError}</DyslexiaText>}
              {nsStatus === 'ok'    && <DyslexiaText variant="caption" color={C.green}>✅ Conectado</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: ACCENT, opacity: (!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting) ? 0.5 : 1 }]}
                onPress={handleNightscoutConnect} disabled={!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>{nsTesting ? 'Verificando…' : '🔌 Conectar Nightscout'}</DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : nsExpanded && isNsConnected ? (
            <TouchableOpacity style={[s.listItem, { paddingVertical: SPACING.sm }]} onPress={handleNightscoutDisconnect}>
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Nightscout</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* FreeStyle Libre */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setLluExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🩹</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>FreeStyle Libre</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>{isLluConnected ? `Conectado · ${libreLinkUpEmail}` : 'LibreLinkUp'}</DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isLluConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isLluConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>{isLluConnected ? '✓ ON' : 'OFF'}</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{lluExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {lluExpanded && !isLluConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="email LibreLinkUp del hijo/a"
                placeholderTextColor={C.darkTertiary} value={lluEmailInput}
                onChangeText={v => { setLluEmailInput(v); setLluStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña"
                  placeholderTextColor={C.darkTertiary} value={lluPasswordInput}
                  onChangeText={v => { setLluPasswordInput(v); setLluStatus('idle'); }}
                  secureTextEntry={!lluPwVisible} />
                <TouchableOpacity onPress={() => setLluPwVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{lluPwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {lluStatus === 'error' && <DyslexiaText variant="caption" color={C.red}>❌ {lluError}</DyslexiaText>}
              {lluStatus === 'ok'    && <DyslexiaText variant="caption" color={C.green}>✅ Conectado</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: ACCENT, opacity: (!lluEmailInput.trim() || !lluPasswordInput.trim() || lluTesting) ? 0.5 : 1 }]}
                onPress={handleLibreLinkConnect} disabled={!lluEmailInput.trim() || !lluPasswordInput.trim() || lluTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>{lluTesting ? 'Verificando…' : '🩹 Conectar Libre'}</DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : lluExpanded && isLluConnected ? (
            <TouchableOpacity style={[s.listItem, { paddingVertical: SPACING.sm }]} onPress={handleLibreLinkDisconnect}>
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Libre</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Dexcom Share */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setDexShareExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🌐</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Dexcom Share (Web)</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>{isDexShareConnected ? `Conectado · ${dexcomShareUsername}` : 'En navegadores web'}</DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isDexShareConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isDexShareConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>{isDexShareConnected ? '✓ ON' : 'OFF'}</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{dexShareExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {dexShareExpanded && !isDexShareConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="email de la cuenta Dexcom del hijo/a"
                placeholderTextColor={C.darkTertiary} value={dexShareUserInput}
                onChangeText={v => { setDexShareUserInput(v); setDexShareStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña"
                  placeholderTextColor={C.darkTertiary} value={dexSharePasswordInput}
                  onChangeText={v => { setDexSharePasswordInput(v); setDexShareStatus('idle'); }}
                  secureTextEntry={!dexSharePwVisible} />
                <TouchableOpacity onPress={() => setDexSharePwVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{dexSharePwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {dexShareStatus === 'error' && <DyslexiaText variant="caption" color={C.red}>❌ {dexShareError}</DyslexiaText>}
              {dexShareStatus === 'ok'    && <DyslexiaText variant="caption" color={C.green}>✅ Conectado</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: ACCENT, opacity: (!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting) ? 0.5 : 1 }]}
                onPress={handleDexcomShareConnect} disabled={!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>{dexShareTesting ? 'Verificando…' : '🌐 Conectar Dexcom'}</DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : dexShareExpanded && isDexShareConnected ? (
            <TouchableOpacity style={[s.listItem, { paddingVertical: SPACING.sm }]} onPress={handleDexcomShareDisconnect}>
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Dexcom</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tidepool */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setTpExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🌊</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Tidepool</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>{isTpConnected ? `Conectado · ${tidepoolEmail}` : 'Medtronic, Tandem, OmniPod…'}</DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isTpConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isTpConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>{isTpConnected ? '✓ ON' : 'OFF'}</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{tpExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {tpExpanded && !isTpConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="email de Tidepool del hijo/a"
                placeholderTextColor={C.darkTertiary} value={tpEmailInput}
                onChangeText={v => { setTpEmailInput(v); setTpStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña"
                  placeholderTextColor={C.darkTertiary} value={tpPasswordInput}
                  onChangeText={v => { setTpPasswordInput(v); setTpStatus('idle'); }}
                  secureTextEntry={!tpPwVisible} />
                <TouchableOpacity onPress={() => setTpPwVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{tpPwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {tpStatus === 'error' && <DyslexiaText variant="caption" color={C.red}>❌ {tpError}</DyslexiaText>}
              {tpStatus === 'ok'    && <DyslexiaText variant="caption" color={C.green}>✅ Conectado</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: ACCENT, opacity: (!tpEmailInput.trim() || !tpPasswordInput.trim() || tpTesting) ? 0.5 : 1 }]}
                onPress={handleTidepoolConnect} disabled={!tpEmailInput.trim() || !tpPasswordInput.trim() || tpTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>{tpTesting ? 'Verificando…' : '🌊 Conectar Tidepool'}</DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : tpExpanded && isTpConnected ? (
            <TouchableOpacity style={[s.listItem, { paddingVertical: SPACING.sm }]} onPress={handleTidepoolDisconnect}>
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Tidepool</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── OBJETIVOS DE GLUCOSA ── */}
        <SectionHeader title="OBJETIVOS DE GLUCOSA 🎯" />
        <View style={s.card}>
          <View style={{ gap: SPACING.md }}>
            {/* Límite inferior */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>Límite inferior</DyslexiaText>
                <DyslexiaText variant="caption" color={C.darkTertiary}>Mínimo en rango (mg/dL)</DyslexiaText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => dispatch(setGlucoseTargetLow(Math.max(40, glucoseTargetLow - 5)))}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#EF4444', minWidth: 44, textAlign: 'center' }}>{glucoseTargetLow}</Text>
                <TouchableOpacity
                  onPress={() => dispatch(setGlucoseTargetLow(Math.min(glucoseTargetHigh - 5, glucoseTargetLow + 5)))}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Límite superior */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>Límite superior</DyslexiaText>
                <DyslexiaText variant="caption" color={C.darkTertiary}>Máximo en rango (mg/dL)</DyslexiaText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => dispatch(setGlucoseTargetHigh(Math.max(glucoseTargetLow + 5, glucoseTargetHigh - 5)))}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#F59E0B', minWidth: 44, textAlign: 'center' }}>{glucoseTargetHigh}</Text>
                <TouchableOpacity
                  onPress={() => dispatch(setGlucoseTargetHigh(Math.min(350, glucoseTargetHigh + 5)))}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 18, color: C.dark as string, fontWeight: '700' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Preview de zona */}
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
              <View style={{ flex: glucoseTargetLow - 40, backgroundColor: '#EF4444' }} />
              <View style={{ flex: glucoseTargetHigh - glucoseTargetLow, backgroundColor: '#10B981' }} />
              <View style={{ flex: 350 - glucoseTargetHigh, backgroundColor: '#F59E0B' }} />
            </View>
            <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center' }}>
              Rojo &lt;{glucoseTargetLow} · Verde {glucoseTargetLow}–{glucoseTargetHigh} · Ámbar &gt;{glucoseTargetHigh}
            </DyslexiaText>
          </View>
        </View>

        {/* ── APARIENCIA ── */}
        <SectionHeader title="APARIENCIA" />
        <View style={s.card}>
          <View style={s.listItem}>
            <Text style={{ fontSize: 20 }}>{colorScheme === 'dark' ? '🌙' : '☀️'}</Text>
            <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>Tema de color</DyslexiaText>
          </View>
          <View style={s.listItemBorder} />
          <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md }}>
            {(['light', 'dark'] as const).map(sc => (
              <TouchableOpacity
                key={sc}
                style={[s.schemeOption, colorScheme === sc && { backgroundColor: ACCENT + '18', borderColor: ACCENT }]}
                onPress={() => dispatch(setColorScheme(sc))}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22 }}>{sc === 'light' ? '☀️' : '🌙'}</Text>
                <DyslexiaText variant="small" color={colorScheme === sc ? ACCENT : C.darkSecondary} style={{ fontWeight: '600', marginTop: 4 }}>
                  {sc === 'light' ? 'Claro' : 'Oscuro'}
                </DyslexiaText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── ASISTENTE IA ── */}
        <SectionHeader title="ASISTENTE IA ✨" />
        <View style={s.card}>
          <View style={s.listItem}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Asistente IA</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {aiEnabled ? 'Activo — analiza los datos y responde preguntas' : 'Desactivado'}
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[s.toggle, aiEnabled && { backgroundColor: ACCENT }]}
              onPress={() => dispatch(setAiEnabled(!aiEnabled))}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, aiEnabled && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {aiEnabled && (
          <View style={s.card}>
            <DyslexiaText variant="small" color={C.darkSecondary}
              style={{ fontWeight: '600', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
              Elige tu compañera
            </DyslexiaText>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingTop: 0 }}>
              {([
                { id: 'dino', emoji: '🦕', name: 'Dino',  desc: 'Amigable y protector' },
                { id: 'oso',  emoji: '🐻', name: 'Oso',   desc: 'Cálido y seguro' },
                { id: 'pato', emoji: '🐥', name: 'Patito', desc: 'Alegre y cariñoso' },
              ] as const).map(c => {
                const active = companion === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.companionCard, { borderColor: active ? ACCENT : C.cardBorder }, active && { backgroundColor: ACCENT + '14' }]}
                    onPress={() => dispatch(setParentCompanion(c.id))}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 32 }}>{c.emoji}</Text>
                    <DyslexiaText variant="small" color={active ? ACCENT : C.dark}
                      style={{ fontWeight: '700', textAlign: 'center' }}>{c.name}</DyslexiaText>
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', lineHeight: 16 }}>{c.desc}</DyslexiaText>
                    {active && (
                      <View style={[s.companionCheck, { backgroundColor: ACCENT }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* API Key de Groq — oculta si viene de variable de entorno */}
        {aiEnabled && !envGroqKey && (
          <View style={s.card}>
            <DyslexiaText variant="caption" color={C.darkTertiary}
              style={{ fontWeight: '600', paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 4 }}>
              API KEY DE GROQ
            </DyslexiaText>
            <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingTop: 4 }}>
              <TextInput
                style={{
                  flex: 1, backgroundColor: C.bg, borderRadius: 8, padding: SPACING.sm,
                  color: C.dark as string, fontFamily: 'monospace', fontSize: 12,
                  borderWidth: 1, borderColor: C.cardBorder as string,
                }}
                placeholder="gsk_…"
                placeholderTextColor={C.darkTertiary as string}
                value={groqKeyInput}
                onChangeText={setGroqKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={200}
              />
              <TouchableOpacity
                style={{ backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: SPACING.md, justifyContent: 'center' }}
                onPress={() => dispatch(setGroqApiKey(groqKeyInput.trim()))}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
              </TouchableOpacity>
            </View>
            {!!groqApiKey && (
              <DyslexiaText variant="caption" color="#10B981"
                style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm }}>
                ✓ Clave guardada ({groqApiKey.slice(0, 8)}…)
              </DyslexiaText>
            )}
          </View>
        )}
        {aiEnabled && !!envGroqKey && (
          <View style={[s.card, { backgroundColor: '#10B98110' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.md }}>
              <Text style={{ fontSize: 16 }}>🔑</Text>
              <DyslexiaText variant="caption" color="#10B981" style={{ flex: 1 }}>
                API Key gestionada por el sistema ({envGroqKey.slice(0, 8)}…)
              </DyslexiaText>
            </View>
          </View>
        )}

        {/* ── MODO DE USO ── */}
        <SectionHeader title="MODO DE USO 🔄" />
        <View style={s.card}>
          <View style={[s.listItem, { paddingVertical: SPACING.md }]}>
            <Text style={{ fontSize: 20 }}>{MODE_EMOJIS[currentMode as UserMode]}</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>
                Modo actual: {MODE_LABELS[currentMode as UserMode]}
              </DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ lineHeight: 18 }}>
                {MODE_DESCRIPTIONS[currentMode as UserMode]}
              </DyslexiaText>
            </View>
          </View>
          <View style={s.listItemBorder} />
          <TouchableOpacity
            style={s.listItem}
            onPress={() => setShowModeModal(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={ACCENT}>Cambiar modo</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Adolescente · Adulto · Padre/Madre</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── INFO ── */}
        <SectionHeader title="INFORMACIÓN 📋" />
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setInfoModal('policy')}>
            <Text style={{ fontSize: 20 }}>📄</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Políticas y privacidad</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          <View style={s.listItem}>
            <Text style={{ fontSize: 20 }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Contacto</DyslexiaText>
              <DyslexiaText variant="caption" color={ACCENT}>diegozamoranogarcia@gmail.com</DyslexiaText>
            </View>
          </View>
          <View style={s.listItemBorder} />
          <View style={[s.listItem, { opacity: 0.6 }]}>
            <Text style={{ fontSize: 18 }}>🚧</Text>
            <DyslexiaText variant="caption" color={C.darkSecondary} style={{ flex: 1 }}>floky v{APP_VERSION} — Beta</DyslexiaText>
          </View>
        </View>

        {/* ── RGPD ── */}
        <SectionHeader title="MIS DATOS (RGPD) 🔒" />
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => Alert.alert('Limpiar lecturas de glucosa', '¿Eliminar todas las lecturas manuales?',
            [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpiar', style: 'destructive', onPress: () => dispatch(clearManualGlucoseReadings()) }])}>
            <Text style={{ fontSize: 20 }}>🩸</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Limpiar lecturas de glucosa</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          <TouchableOpacity style={s.listItem} onPress={() => Alert.alert('Borrar datos', 'Esta acción eliminará todos los datos guardados.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Borrar todo', style: 'destructive', onPress: async () => {
              dispatch(resetAllUserData()); await persistor.purge();
              if (Platform.OS === 'web') (window as any).location.reload();
            }},
          ])}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Borrar todos los datos</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + SPACING.xxl }} />
      </ScrollView>

      {/* Modal política */}
      <Modal visible={infoModal === 'policy'} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + SPACING.md, maxHeight: '85%' }]}>
            <View style={s.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>📄 Privacidad</DyslexiaText>
              <TouchableOpacity onPress={() => setInfoModal(null)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
              <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                {'🔒 Todos los datos se almacenan localmente en tu dispositivo. No enviamos ni vendemos datos personales a terceros.\n\n👶 Los datos de glucosa de tu hijo/a se gestionan con el máximo cuidado. La sincronización con Nightscout ocurre directamente entre tu dispositivo y tu servidor personal.\n\n⚠️ floky NO es un dispositivo médico certificado. No reemplaza el consejo de tu equipo médico.\n\n📧 Contacto: diegozamoranogarcia@gmail.com'}
              </DyslexiaText>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de cambio de modo — animationType="slide" para compatibilidad web/nativo */}
      <Modal visible={showModeModal} transparent animationType="slide" onRequestClose={() => setShowModeModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 9999 }}>
          <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, gap: 12 }}>
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700', textAlign: 'center' }}>
              Cambiar modo
            </DyslexiaText>
            <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center' }}>
              ¿A qué modo quieres cambiar?
            </DyslexiaText>
            {([
              { mode: 'adolescent' as UserMode, emoji: '⚡', label: 'Adolescente', desc: 'Vista gamificada accesible' },
              { mode: 'adult'      as UserMode, emoji: '📊', label: 'Adulto',      desc: 'Vista simplificada para adultos' },
            ] as const).map(opt => (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => {
                  dispatch(setUserMode(opt.mode));
                  if (!seenModeIntros.includes(opt.mode)) dispatch(setPendingModeIntro(opt.mode));
                  setShowModeModal(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: C.bg, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 24 }}>{opt.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>{opt.label}</DyslexiaText>
                  <DyslexiaText variant="caption" color={C.darkTertiary}>{opt.desc}</DyslexiaText>
                </View>
                <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setShowModeModal(false)}
              style={{ padding: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder }}
            >
              <DyslexiaText variant="body" color={C.darkSecondary}>Cancelar</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function styles(C: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    content:        { padding: SPACING.md, gap: SPACING.xs },
    header:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn:        { padding: SPACING.sm, marginRight: 4 },
    backArrow:      { fontSize: 28, color: C.darkTertiary as string, lineHeight: 32 },
    modeBadge:      { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
    card:           { backgroundColor: C.card, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: C.cardBorder, overflow: 'hidden', marginBottom: SPACING.xs },
    listItem:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
    listItemBorder: { height: 1, backgroundColor: C.cardBorder, marginHorizontal: SPACING.md },
    fieldLabel:     { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    nameRow:        { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, paddingTop: 4 },
    nameInput:      { flex: 1, height: 44, borderWidth: 1, borderColor: C.cardBorder, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, color: C.dark as string, backgroundColor: C.bg, fontSize: 15 },
    saveBtn:        { paddingHorizontal: SPACING.md, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    schemeOption:   { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: C.cardBorder, gap: 4 },
    toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: C.cardBorder, justifyContent: 'center', padding: 3 },
    toggleThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
    toggleThumbOn:  { alignSelf: 'flex-end' },
    badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    pwRow:          { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    pwEye:          { padding: SPACING.sm },
    cancelBtn:      { height: 40, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
    confirmBtn:     { height: 40, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet:     { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, borderWidth: 1, borderColor: C.cardBorder },
    modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: SPACING.md },
    companionCard:  { flex: 1, alignItems: 'center', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, gap: 4, position: 'relative' },
    companionCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  });
}
