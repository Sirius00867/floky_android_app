import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Text, Alert, Share, Platform, Modal,
} from 'react-native';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { APP_VERSION } from '@/constants/version';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import {
  setUserName, setColorScheme, setDisplayMode, setAiEnabled, setCompanion, setAdultCompanion,
  setNotifGlucose,
  setNightscoutUrl, setNightscoutApiSecret,
  setLibreLinkUpEmail, setDexcomShareUsername, setTidepoolEmail,
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

// ── helpers compartidos ───────────────────────────────────────────────────────

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

export default function AdultSettingsScreen() {
  const dispatch  = useDispatch();
  const router    = useRouter();
  const insets    = useSafeAreaInsets();
  const store     = useStore();
  const C         = useAppColors();

  const currentMode       = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adult');
  const seenModeIntros    = useSelector((s: RootState) => s.userMode?.seenModeIntros ?? []);
  const userName          = useSelector((s: RootState) => s.settings.userName);
  const colorScheme       = useSelector((s: RootState) => s.settings.colorScheme ?? 'light');
  const displayMode       = useSelector((s: RootState) => s.settings.displayMode ?? 'normal');
  const aiEnabled         = useSelector((s: RootState) => s.settings.aiEnabled ?? true);
  const companion         = useSelector((s: RootState) => s.settings.adultCompanion ?? 'zen_gem');
  const notifGlucose      = useSelector((s: RootState) => s.settings.notifGlucose ?? true);
  const glucoseTargetLow  = useSelector((s: RootState) => s.settings.glucoseTargetLow ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings.glucoseTargetHigh ?? 180);
  const nightscoutUrl       = useSelector((s: RootState) => s.settings.nightscoutUrl ?? '');
  const nightscoutApiSecret = useSelector((s: RootState) => s.settings.nightscoutApiSecret ?? '');
  const libreLinkUpEmail    = useSelector((s: RootState) => s.settings.libreLinkUpEmail ?? '');
  const dexcomShareUsername = useSelector((s: RootState) => s.settings.dexcomShareUsername ?? '');
  const tidepoolEmail       = useSelector((s: RootState) => s.settings.tidepoolEmail ?? '');

  const [nameInput, setNameInput]     = useState(userName);
  const [infoModal, setInfoModal]     = useState<'compat' | 'policy' | null>(null);

  // Nightscout
  const [nsUrlInput, setNsUrlInput]         = useState(nightscoutUrl);
  const [nsSecretInput, setNsSecretInput]   = useState(nightscoutApiSecret);
  const [nsSecretVisible, setNsSecretVisible] = useState(false);
  const [nsTesting, setNsTesting]           = useState(false);
  const [nsStatus, setNsStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [nsError, setNsError]               = useState('');
  const [nsExpanded, setNsExpanded]         = useState(true);

  // LibreLink
  const [lluEmailInput, setLluEmailInput]     = useState(libreLinkUpEmail);
  const [lluPasswordInput, setLluPasswordInput] = useState('');
  const [lluPwVisible, setLluPwVisible]       = useState(false);
  const [lluTesting, setLluTesting]           = useState(false);
  const [lluStatus, setLluStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [lluError, setLluError]               = useState('');
  const [lluExpanded, setLluExpanded]         = useState(true);

  // Dexcom Share
  const [dexShareUserInput, setDexShareUserInput]       = useState(dexcomShareUsername);
  const [dexSharePasswordInput, setDexSharePasswordInput] = useState('');
  const [dexSharePwVisible, setDexSharePwVisible]       = useState(false);
  const [dexShareTesting, setDexShareTesting]           = useState(false);
  const [dexShareStatus, setDexShareStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [dexShareError, setDexShareError]               = useState('');
  const [dexShareExpanded, setDexShareExpanded]         = useState(true);

  // Tidepool
  const [tpEmailInput, setTpEmailInput]     = useState(tidepoolEmail);
  const [tpPasswordInput, setTpPasswordInput] = useState('');
  const [tpPwVisible, setTpPwVisible]       = useState(false);
  const [tpTesting, setTpTesting]           = useState(false);
  const [tpStatus, setTpStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [tpError, setTpError]               = useState('');
  const [tpExpanded, setTpExpanded]         = useState(true);

  const isNsConnected     = !!nightscoutUrl && !!nightscoutApiSecret;
  const isLluConnected    = !!libreLinkUpEmail;
  const isDexShareConnected = !!dexcomShareUsername;
  const isTpConnected     = !!tidepoolEmail;

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
    if (result.ok) {
      dispatch(setLibreLinkUpEmail(lluEmailInput.trim()));
      setLluStatus('ok'); setLluPasswordInput('');
    } else { setLluStatus('error'); setLluError(result.error ?? 'Email o contraseña incorrectos'); }
    setLluTesting(false);
  };

  const handleLibreLinkDisconnect = async () => {
    await clearLibreLinkOfficialSession();
    dispatch(setLibreLinkUpEmail(''));
    setLluEmailInput(''); setLluPasswordInput(''); setLluStatus('idle');
  };

  const handleDexcomShareConnect = async () => {
    if (!dexShareUserInput.trim() || !dexSharePasswordInput.trim()) return;
    setDexShareTesting(true); setDexShareStatus('idle'); setDexShareError('');
    const result = await loginDexcomShare(dexShareUserInput.trim(), dexSharePasswordInput.trim());
    if (result.ok) {
      dispatch(setDexcomShareUsername(dexShareUserInput.trim()));
      setDexShareStatus('ok'); setDexSharePasswordInput('');
    } else {
      setDexShareStatus('error');
      setDexShareError(result.error ?? 'No se pudo conectar con Dexcom Share');
    }
    setDexShareTesting(false);
  };

  const handleDexcomShareDisconnect = async () => {
    await clearDexcomShareSession();
    dispatch(setDexcomShareUsername(''));
    setDexShareUserInput(''); setDexSharePasswordInput(''); setDexShareStatus('idle');
  };

  const handleTidepoolConnect = async () => {
    if (!tpEmailInput.trim() || !tpPasswordInput.trim()) return;
    setTpTesting(true); setTpStatus('idle');
    const result = await loginTidepool(tpEmailInput.trim(), tpPasswordInput.trim());
    if (result.ok) {
      dispatch(setTidepoolEmail(tpEmailInput.trim()));
      setTpStatus('ok'); setTpPasswordInput('');
    } else { setTpStatus('error'); setTpError(result.error ?? 'Email o contraseña incorrectos'); }
    setTpTesting(false);
  };

  const handleTidepoolDisconnect = async () => {
    await clearTidepoolSession();
    dispatch(setTidepoolEmail(''));
    setTpEmailInput(''); setTpPasswordInput(''); setTpStatus('idle');
  };

  const handleExportData = async () => {
    try {
      const fullState = store.getState() as any;
      const health    = fullState.health ?? {};
      const readings: any[] = health.readings ?? [];
      const today     = new Date();
      const dateStr   = today.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      let csv = `floky — Datos adulto\nUsuario: ${userName}\nGenerado: ${dateStr}\n\n`;
      csv += `GLUCOSA (últimas 100 lecturas)\nFecha,Valor (mg/dL)\n`;
      readings.slice(-100).forEach((r: any) => {
        csv += `${new Date(r.timestamp).toLocaleString('es-ES')},${r.value ?? '—'}\n`;
      });
      await Share.share({ message: csv, title: 'floky — Mis datos' });
    } catch { Alert.alert('Error', 'No se pudo exportar los datos.'); }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      '⚠️ Borrar todos los datos',
      'Esta acción eliminará permanentemente todos tus datos. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo', style: 'destructive',
          onPress: async () => {
            dispatch(resetAllUserData());
            await persistor.purge();
            if (Platform.OS === 'web') (window as any).location.reload();
          },
        },
      ],
    );
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
          <View style={[s.modeBadge, { backgroundColor: '#3B82F620', borderColor: '#3B82F640' }]}>
            <Text style={{ fontSize: 13 }}>👤</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#3B82F6' }}>Adulto</Text>
          </View>
        </View>

        {/* ── PERFIL ── */}
        <SectionHeader title="PERFIL" />
        <View style={s.card}>
          <DyslexiaText variant="caption" color={C.darkTertiary} style={s.fieldLabel}>TU NOMBRE</DyslexiaText>
          <View style={s.nameRow}>
            <TextInput
              style={s.nameInput}
              placeholder="Escribe tu nombre…"
              placeholderTextColor={C.darkTertiary}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={() => dispatch(setUserName(nameInput.trim()))}
            />
            <TouchableOpacity style={s.saveBtn} onPress={() => dispatch(setUserName(nameInput.trim()))}>
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── OBJETIVOS DE GLUCOSA ── */}
        <SectionHeader title="OBJETIVOS DE GLUCOSA 🎯" />
        <View style={s.card}>
          <DyslexiaText variant="caption" color={C.darkTertiary} style={{ marginBottom: SPACING.sm, lineHeight: 18 }}>
            Define tu rango objetivo personalizado. Afecta los colores y alertas del gráfico.
          </DyslexiaText>

          {/* Umbral bajo */}
          <View style={[s.listItem, { borderBottomWidth: 1, borderBottomColor: C.cardBorder, paddingBottom: SPACING.md, marginBottom: SPACING.md }]}>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>⬇️ Umbral de hipoglucemia</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Por debajo de este valor = baja</DyslexiaText>
            </View>
            <NumberStepper
              value={glucoseTargetLow}
              min={40} max={100} step={5}
              suffix=" mg/dL"
              color="#EF4444"
              onChange={v => dispatch(setGlucoseTargetLow(v))}
            />
          </View>

          {/* Umbral alto */}
          <View style={s.listItem}>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>⬆️ Umbral de hiperglucemia</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Por encima de este valor = alta</DyslexiaText>
            </View>
            <NumberStepper
              value={glucoseTargetHigh}
              min={140} max={350} step={5}
              suffix=" mg/dL"
              color="#F59E0B"
              onChange={v => dispatch(setGlucoseTargetHigh(v))}
            />
          </View>

          {/* Preview del rango */}
          <View style={{ marginTop: SPACING.md, padding: SPACING.sm, backgroundColor: C.health + '10', borderRadius: BORDER_RADIUS.md, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>Baja: &lt; {glucoseTargetLow} mg/dL</DyslexiaText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>Objetivo: {glucoseTargetLow}–{glucoseTargetHigh} mg/dL</DyslexiaText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#F59E0B' }} />
              <DyslexiaText variant="caption" color={C.darkSecondary}>Alta: &gt; {glucoseTargetHigh} mg/dL</DyslexiaText>
            </View>
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
                style={[s.schemeOption, colorScheme === sc && s.schemeOptionActive]}
                onPress={() => dispatch(setColorScheme(sc))}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22 }}>{sc === 'light' ? '☀️' : '🌙'}</Text>
                <DyslexiaText variant="small" color={colorScheme === sc ? C.card : C.darkSecondary}
                  style={{ fontWeight: '600', marginTop: 4 }}>
                  {sc === 'light' ? 'Claro' : 'Oscuro'}
                </DyslexiaText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={s.card}>
          <View style={s.listItem}>
            <Text style={{ fontSize: 20 }}>🎨</Text>
            <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>Modo de visualización</DyslexiaText>
          </View>
          <View style={s.listItemBorder} />
          <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md }}>
            {([
              { id: 'dyslexia', emoji: '🌈', label: 'Dislexia', desc: 'Letras grandes · Más espacio' },
              { id: 'normal',   emoji: '📋', label: 'Normal',   desc: 'Compacto · Estándar' },
            ] as const).map(m => {
              const active = displayMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.schemeOption, active && { backgroundColor: '#3B82F618', borderColor: '#3B82F6' }]}
                  onPress={() => dispatch(setDisplayMode(m.id))}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                  <DyslexiaText variant="small" color={active ? '#3B82F6' : C.darkSecondary}
                    style={{ fontWeight: '700', marginTop: 4, textAlign: 'center' }}>{m.label}</DyslexiaText>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', lineHeight: 16 }}>{m.desc}</DyslexiaText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── ASISTENTE IA ── */}
        <SectionHeader title="ASISTENTE IA ✨" />
        <View style={s.card}>
          <View style={s.listItem}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Asistente de IA</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {aiEnabled ? 'Activo — analiza tus datos y responde preguntas' : 'Desactivado'}
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[s.toggle, aiEnabled && s.toggleOn]}
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
                { id: 'zen_gem',    emoji: '💎', name: 'Zen Gem',    desc: 'Serena y geométrica' },
                { id: 'plasma_orb', emoji: '🔮', name: 'Plasma Orb', desc: 'Tecnológica y fluida' },
                { id: 'origami',    emoji: '🕊️', name: 'Origami',    desc: 'Elegante y minimalista' },
              ] as const).map(c => {
                const active = companion === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.companionCard, { borderColor: active ? C.health : C.cardBorder }, active && { backgroundColor: C.health + '14' }]}
                    onPress={() => dispatch(setAdultCompanion(c.id))}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 32 }}>{c.emoji}</Text>
                    <DyslexiaText variant="small" color={active ? C.health : C.dark}
                      style={{ fontWeight: '700', textAlign: 'center' }}>{c.name}</DyslexiaText>
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', lineHeight: 16 }}>{c.desc}</DyslexiaText>
                    {active && (
                      <View style={[s.companionCheck, { backgroundColor: C.health }]}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── SENSORES CGM ── */}
        <SectionHeader title="SENSORES Y BOMBA 💉" />

        {/* Nightscout */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setNsExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🔗</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Nightscout</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isNsConnected ? `Conectado · ${nightscoutUrl.replace(/^https?:\/\//, '')}` : 'Dexcom, Libre, AAPS, Loop, OmniPod'}
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
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ fontWeight: '600' }}>URL DE TU NIGHTSCOUT</DyslexiaText>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="https://minightscout.fly.dev"
                placeholderTextColor={C.darkTertiary} value={nsUrlInput}
                onChangeText={v => { setNsUrlInput(v); setNsStatus('idle'); }}
                autoCapitalize="none" keyboardType="url" />
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ fontWeight: '600' }}>API SECRET</DyslexiaText>
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Tu API secret"
                  placeholderTextColor={C.darkTertiary} value={nsSecretInput}
                  onChangeText={v => { setNsSecretInput(v); setNsStatus('idle'); }}
                  secureTextEntry={!nsSecretVisible} autoCapitalize="none" />
                <TouchableOpacity onPress={() => setNsSecretVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{nsSecretVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {nsStatus === 'error' && <DyslexiaText variant="caption" color={C.red}>❌ {nsError}</DyslexiaText>}
              {nsStatus === 'ok'    && <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: C.health, opacity: (!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting) ? 0.5 : 1 }]}
                onPress={handleNightscoutConnect} disabled={!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                  {nsTesting ? 'Verificando…' : '🔌 Conectar Nightscout'}
                </DyslexiaText>
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
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isLluConnected ? `Conectado · ${libreLinkUpEmail}` : 'LibreLinkUp vía email'}
              </DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isLluConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isLluConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isLluConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{lluExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {lluExpanded && !isLluConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="tu.email@ejemplo.com"
                placeholderTextColor={C.darkTertiary} value={lluEmailInput}
                onChangeText={v => { setLluEmailInput(v); setLluStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña de LibreLinkUp"
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
                style={[s.saveBtn, { backgroundColor: C.health, opacity: (!lluEmailInput.trim() || !lluPasswordInput.trim() || lluTesting) ? 0.5 : 1 }]}
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
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isDexShareConnected ? `Conectado · ${dexcomShareUsername}` : 'En navegadores web'}
              </DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isDexShareConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isDexShareConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isDexShareConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{dexShareExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {dexShareExpanded && !isDexShareConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              {/* Hint de ayuda */}
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderLeftWidth: 3, borderLeftColor: '#3B82F6' }}>
                <DyslexiaText variant="caption" color="#1D4ED8" style={{ fontWeight: '600' }}>
                  💡 Usa el email y contraseña de dexcom.com (cuenta web), no los de la app del sensor.{'\n'}
                  Activa "Dexcom Share" en tu app Dexcom antes de conectar.
                </DyslexiaText>
              </View>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="Email de dexcom.com"
                placeholderTextColor={C.darkTertiary} value={dexShareUserInput}
                onChangeText={v => { setDexShareUserInput(v); setDexShareStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña de dexcom.com"
                  placeholderTextColor={C.darkTertiary} value={dexSharePasswordInput}
                  onChangeText={v => { setDexSharePasswordInput(v); setDexShareStatus('idle'); }}
                  secureTextEntry={!dexSharePwVisible} />
                <TouchableOpacity onPress={() => setDexSharePwVisible(v => !v)} style={s.pwEye}>
                  <Text style={{ fontSize: 18 }}>{dexSharePwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {dexShareStatus === 'error' && (
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm }}>
                  <DyslexiaText variant="caption" color={C.red}>❌ {dexShareError}</DyslexiaText>
                </View>
              )}
              {dexShareStatus === 'ok' && <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>}
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: C.health, opacity: (!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting) ? 0.5 : 1 }]}
                onPress={handleDexcomShareConnect} disabled={!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>{dexShareTesting ? '⏳ Verificando con Dexcom…' : '🌐 Conectar Dexcom Share'}</DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : dexShareExpanded && isDexShareConnected ? (
            <TouchableOpacity style={[s.listItem, { paddingVertical: SPACING.sm }]} onPress={handleDexcomShareDisconnect}>
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Dexcom Web</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tidepool */}
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setTpExpanded(e => !e)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🌊</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Tidepool</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isTpConnected ? `Conectado · ${tidepoolEmail}` : 'Medtronic, Tandem, OmniPod, Dexcom, Libre'}
              </DyslexiaText>
            </View>
            <View style={[s.badge, { backgroundColor: isTpConnected ? '#10B98120' : C.cardBorder }]}>
              <DyslexiaText variant="caption" color={isTpConnected ? '#10B981' : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isTpConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16, marginLeft: 4 }}>{tpExpanded ? '∧' : '∨'}</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          {tpExpanded && !isTpConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <TextInput style={[s.nameInput, { marginBottom: 0 }]} placeholder="tu.email@ejemplo.com"
                placeholderTextColor={C.darkTertiary} value={tpEmailInput}
                onChangeText={v => { setTpEmailInput(v); setTpStatus('idle'); }}
                autoCapitalize="none" keyboardType="email-address" />
              <View style={s.pwRow}>
                <TextInput style={[s.nameInput, { marginBottom: 0, flex: 1 }]} placeholder="Contraseña de Tidepool"
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
                style={[s.saveBtn, { backgroundColor: '#10B981', opacity: (!tpEmailInput.trim() || !tpPasswordInput.trim() || tpTesting) ? 0.5 : 1 }]}
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

        {/* ── NOTIFICACIONES ── */}
        <SectionHeader title="NOTIFICACIONES 🔔" />
        <View style={s.card}>
          <View style={s.listItem}>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>🩸 Alertas de glucosa</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Avisos cuando salgas de tu rango objetivo</DyslexiaText>
            </View>
            <TouchableOpacity
              style={[s.toggle, notifGlucose && s.toggleOn]}
              onPress={() => dispatch(setNotifGlucose(!notifGlucose))}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, notifGlucose && s.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

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
            onPress={() => Alert.alert(
              'Cambiar modo',
              '¿A qué modo quieres cambiar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: '⚡ Adolescente', onPress: () => {
                    dispatch(setUserMode('adolescent'));
                    if (!seenModeIntros.includes('adolescent')) dispatch(setPendingModeIntro('adolescent'));
                  }},
                { text: '🐥 Padre/Madre', onPress: () => {
                    dispatch(setUserMode('parent'));
                    if (!seenModeIntros.includes('parent')) dispatch(setPendingModeIntro('parent'));
                  }},
              ],
            )}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color="#3B82F6">Cambiar modo</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Adolescente · Adulto · Padre/Madre</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── INFO ── */}
        <SectionHeader title="INFORMACIÓN 📋" />
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={() => setInfoModal('compat')}>
            <Text style={{ fontSize: 20 }}>💉</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Dispositivos compatibles</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
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
              <DyslexiaText variant="caption" color="#3B82F6">diegozamoranogarcia@gmail.com</DyslexiaText>
            </View>
          </View>
          <View style={s.listItemBorder} />
          <View style={[s.listItem, { opacity: 0.6 }]}>
            <Text style={{ fontSize: 20 }}>🚧</Text>
            <DyslexiaText variant="caption" color={C.darkSecondary} style={{ flex: 1 }}>
              floky v{APP_VERSION} — Beta
            </DyslexiaText>
          </View>
        </View>

        {/* ── RGPD ── */}
        <SectionHeader title="MIS DATOS (RGPD) 🔒" />
        <View style={s.card}>
          <TouchableOpacity style={s.listItem} onPress={handleExportData}>
            <Text style={{ fontSize: 20 }}>📤</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Exportar mis datos</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Descarga una copia de tus registros</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          <TouchableOpacity style={s.listItem} onPress={() => {
            Alert.alert('Limpiar lecturas de glucosa', '¿Eliminar todas las lecturas manuales?',
              [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpiar', style: 'destructive', onPress: () => dispatch(clearManualGlucoseReadings()) }]);
          }}>
            <Text style={{ fontSize: 20 }}>🩸</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Limpiar lecturas de glucosa</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={s.listItemBorder} />
          <TouchableOpacity style={s.listItem} onPress={handleDeleteAllData}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Borrar todos mis datos</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + SPACING.xxl }} />
      </ScrollView>

      {/* Modal compat */}
      <Modal visible={infoModal === 'compat'} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: insets.bottom + SPACING.md, maxHeight: '85%' }]}>
            <View style={s.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>💉 Dispositivos compatibles</DyslexiaText>
              <TouchableOpacity onPress={() => setInfoModal(null)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
              <View style={{ gap: SPACING.md, paddingBottom: SPACING.md }}>
                <DyslexiaText variant="caption" color={C.darkSecondary} style={{ lineHeight: 20 }}>
                  {'📡 Sensores: Dexcom G5/G6/G7 · FreeStyle Libre 1/2/3 · Medtronic\n\n💊 Bombas: AAPS · Loop · OmniPod · Tandem · Roche\n\n🔧 La mayoría se conectan vía Nightscout (fly.io gratuito)'}
                </DyslexiaText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                {'🔒 Todos tus datos se almacenan localmente en tu dispositivo. No enviamos ni vendemos datos personales a terceros.\n\n⚠️ floky NO es un dispositivo médico certificado (MDR 2017/745). No reemplaza el consejo de tu equipo médico.\n\n📧 Contacto: diegozamoranogarcia@gmail.com'}
              </DyslexiaText>
            </ScrollView>
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
    saveBtn:        { backgroundColor: C.health, paddingHorizontal: SPACING.md, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    schemeOption:   { flex: 1, alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: C.cardBorder, gap: 4 },
    schemeOptionActive: { backgroundColor: C.health + '18', borderColor: C.health },
    toggle:         { width: 48, height: 28, borderRadius: 14, backgroundColor: C.cardBorder, justifyContent: 'center', padding: 3 },
    toggleOn:       { backgroundColor: '#10B981' },
    toggleThumb:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
    toggleThumbOn:  { alignSelf: 'flex-end' },
    badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    pwRow:          { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    pwEye:          { padding: SPACING.sm },
    modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalSheet:     { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, borderWidth: 1, borderColor: C.cardBorder },
    modalHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: SPACING.md },
    companionCard:  { flex: 1, alignItems: 'center', padding: SPACING.sm, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, gap: 4, position: 'relative' },
    companionCheck: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  });
}
