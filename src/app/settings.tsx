import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { MODE_DESCRIPTIONS, MODE_EMOJIS, MODE_LABELS } from '@/constants/modeNavigationConfig';
import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { APP_VERSION } from '@/constants/version';
import { useAppColors, type AppColors } from '@/hooks/useAppColors';
import { useScreenLayout } from '@/hooks/useScreenLayout';
import AdultSettingsScreen from '@/screens/adult/SettingsScreen';
import ParentSettingsScreen from '@/screens/parent/SettingsScreen';
import {
  clearDexcomShareSession,
  loginDexcomShare,
} from '@/services/dexcomShareService';
import {
  clearLibreLinkOfficialSession,
  loginLibreLinkOfficial,
} from '@/services/libreLinkOfficialService';
import {
  clearNightscoutConfig,
  saveNightscoutConfig,
  testNightscoutConnection,
} from '@/services/nightscoutService';
import {
  clearTidepoolSession,
  loginTidepool,
} from '@/services/tidepoolService';
import { clearManualGlucoseReadings } from '@/store/slices/healthSlice';
import {
  addRoutineTask,
  addSubject,
  deleteRoutineTask,
  deleteSubject,
  resetAllUserData,
  setAdolescentCompanion,
  setAiEnabled,
  setColorScheme,
  setDexcomShareUsername,
  setDisplayMode,
  setGamificationEnabled,
  setGlucoseTargetHigh,
  setGlucoseTargetLow,
  setGroqApiKey,
  setLibreLinkUpEmail,
  setNightscoutApiSecret,
  setNightscoutUrl,
  setNotifGlucose,
  setNotifRoutine,
  setNotifStudy,
  setTidepoolEmail,
  setUserName,
  type RoutineTask
} from '@/store/slices/settingsSlice';
import type { UserMode } from '@/store/slices/userModeSlice';
import { setPendingModeIntro, setUserMode } from '@/store/slices/userModeSlice';
import type { RootState } from '@/store/store';
import { persistor } from '@/store/store';
import { sanitizeExternalUrl, validateHttpsUrl } from '@/utils/securityUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector, useStore } from 'react-redux';

const ROUTINE_LABELS: Record<RoutineTask['routineId'], string> = {
  morning:   '🌅 Mañana',
  afternoon: '📖 Tarde',
  evening:   '🌙 Noche',
};

const ICON_OPTIONS = [
  // FP Técnica
  '🔧','⚡','🔌','🚗','🏗️','🛠️','🔩','🖥️','💻','📡',
  // FP Sanidad / Social
  '🏥','💊','🩺','🧬','🧪','👶','🧑‍⚕️','🦷',
  // FP Hostelería / Servicios
  '🍳','🍽️','🧁','☕','🏨','✂️','💈','🛎️',
  // FP Administración / Comercio
  '📊','📋','💼','🏦','📈','🧾','🤝','📦',
  // FP Diseño / Arte / Comunicación
  '🎨','📸','🎬','🎭','✏️','🖌️','📐','🎙️',
  // FP Agraria / Medioambiente
  '🌱','🌿','🐄','🚜','🌾','♻️',
  // General
  '📖','🔢','🌍','⚽','🎵','📝','🗺️',
];
const COLOR_OPTIONS = [
  '#EF4444','#F59E0B','#10B981','#4F46E5','#0EA5E9',
  '#8B5CF6','#EC4899','#64748B','#D97706','#059669',
];
const TASK_ICONS = ['🚿','🍳','🎒','🚪','🍎','📚','🧹','😴','🍽️','🦷','🛏️','🏃','💊','📱','🎮','🧘'];

export default function SettingsScreen() {
  const dispatch = useDispatch();
  const router   = useRouter();
  const insets   = useSafeAreaInsets();

  const C               = useAppColors();
  const modeRehydrated  = useSelector((s: RootState) => (s.userMode as any)?._persist?.rehydrated ?? false);
  const currentMode     = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  const seenModeIntros  = useSelector((s: RootState) => s.userMode?.seenModeIntros ?? []);
  const userName        = useSelector((s: RootState) => s.settings.userName);
  const subjects        = useSelector((s: RootState) => s.settings.subjects);
  const routineTasks    = useSelector((s: RootState) => s.settings.routineTasks);
  const settingsVisible = useSelector((s: RootState) => s.settings.settingsVisible);
  const colorScheme     = useSelector((s: RootState) => s.settings.colorScheme ?? 'light');
  const groqApiKey      = useSelector((s: RootState) => s.settings.groqApiKey ?? '');
  const aiEnabled       = useSelector((s: RootState) => s.settings.aiEnabled ?? true);
  // La env var se inyecta en tiempo de compilación — si está definida, no se necesita input manual
  const envGroqKey      = (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '').trim();
  const companion       = useSelector((s: RootState) => s.settings.adolescentCompanion ?? 'gerbera');
  const displayMode     = useSelector((s: RootState) => s.settings.displayMode ?? 'dyslexia');
  const gamificationEnabled = useSelector((s: RootState) => s.settings.gamificationEnabled ?? true);
  const notifGlucose    = useSelector((s: RootState) => s.settings.notifGlucose ?? true);
  const notifStudy      = useSelector((s: RootState) => s.settings.notifStudy   ?? true);
  const notifRoutine    = useSelector((s: RootState) => s.settings.notifRoutine  ?? true);
  const glucoseTargetLow  = useSelector((s: RootState) => s.settings.glucoseTargetLow  ?? 70);
  const glucoseTargetHigh = useSelector((s: RootState) => s.settings.glucoseTargetHigh ?? 180);
  const nightscoutUrl       = useSelector((s: RootState) => s.settings.nightscoutUrl ?? '');
  const nightscoutApiSecret = useSelector((s: RootState) => s.settings.nightscoutApiSecret ?? '');
  const libreLinkUpEmail     = useSelector((s: RootState) => s.settings.libreLinkUpEmail ?? '');
  const dexcomShareUsername  = useSelector((s: RootState) => s.settings.dexcomShareUsername ?? '');
  const tidepoolEmail        = useSelector((s: RootState) => s.settings.tidepoolEmail ?? '');

  const [groqKeyInput, setGroqKeyInput] = useState(groqApiKey);

  const [nsUrlInput, setNsUrlInput]         = useState(nightscoutUrl);
  const [nsSecretInput, setNsSecretInput]   = useState(nightscoutApiSecret);
  const [nsSecretVisible, setNsSecretVisible] = useState(false);
  const [editingSections, setEditingSections] = useState<'health' | 'study' | 'index' | 'home' | 'relation' | null>(null);
  const [infoModal, setInfoModal] = useState<'compat' | 'policy' | null>(null);
  const [showModeModal, setShowModeModal] = useState(false);
  const [nsTesting, setNsTesting]         = useState(false);
  const [nsStatus, setNsStatus]           = useState<'idle'|'ok'|'error'>('idle');
  const [nsError, setNsError]             = useState('');
  const [nsErrorCode, setNsErrorCode]     = useState<'cors'|'network'|'auth'|'server'|'url'|undefined>(undefined);
  const [nsExpanded, setNsExpanded]       = useState(false);

  // LibreLinkUp
  const [lluEmailInput, setLluEmailInput]       = useState(libreLinkUpEmail);
  const [lluPasswordInput, setLluPasswordInput] = useState('');
  const [lluPwVisible, setLluPwVisible]         = useState(false);
  const [lluTesting, setLluTesting]             = useState(false);
  const [lluStatus, setLluStatus]               = useState<'idle'|'ok'|'error'>('idle');
  const [lluError, setLluError]                 = useState('');
  const [lluExpanded, setLluExpanded]           = useState(false);

  // Dexcom Share
  const [dexShareUserInput, setDexShareUserInput]       = useState(dexcomShareUsername);
  const [dexSharePasswordInput, setDexSharePasswordInput] = useState('');
  const [dexSharePwVisible, setDexSharePwVisible]       = useState(false);
  const [dexShareTesting, setDexShareTesting]           = useState(false);
  const [dexShareStatus, setDexShareStatus]             = useState<'idle'|'ok'|'error'>('idle');
  const [dexShareError, setDexShareError]               = useState('');
  const [dexShareErrorCode, setDexShareErrorCode]       = useState<'credentials'|'network'|'server'|'rate_limit'|'validation'|undefined>(undefined);
  const [dexShareExpanded, setDexShareExpanded]         = useState(false);

  const [nameInput, setNameInput] = useState(userName);

  // ── Scroll-to-tab desde ServicesHubCard ──────────────────────────────────
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const sectionYRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!tab) return;
    if (tab === 'nightscout')   setNsExpanded(true);
    if (tab === 'dexcomshare')  setDexShareExpanded(true);
    if (tab === 'libre')        setLluExpanded(true);
    if (tab === 'tidepool')     setTpExpanded(true);
    // Pequeño delay para que el acordeón se expanda antes de hacer scroll
    const t = setTimeout(() => {
      const y = sectionYRef.current[tab];
      if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
    }, 150);
    return () => clearTimeout(t);
  }, [tab]);

  // Modal — Asignatura nueva
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubjectLabel, setNewSubjectLabel]   = useState('');
  const [newSubjectIcon, setNewSubjectIcon]     = useState(ICON_OPTIONS[0]);
  const [newSubjectColor, setNewSubjectColor]   = useState(COLOR_OPTIONS[0]);

  // Modal — Tarea nueva
  const [showTaskModal, setShowTaskModal]       = useState(false);
  const [newTaskLabel, setNewTaskLabel]         = useState('');
  const [newTaskIcon, setNewTaskIcon]           = useState(TASK_ICONS[0]);
  const [newTaskRoutine, setNewTaskRoutine]     = useState<RoutineTask['routineId']>('morning');

  const saveName = () => {
    dispatch(setUserName(nameInput.trim()));
  };

  const handleAddSubject = () => {
    if (!newSubjectLabel.trim()) return;
    dispatch(addSubject({ label: newSubjectLabel.trim(), icon: newSubjectIcon, color: newSubjectColor }));
    setNewSubjectLabel(''); setShowSubjectModal(false);
  };

  const handleDeleteSubject = (id: string) => {
    dispatch(deleteSubject(id));
  };

  const handleAddTask = () => {
    if (!newTaskLabel.trim()) return;
    dispatch(addRoutineTask({ label: newTaskLabel.trim(), icon: newTaskIcon, routineId: newTaskRoutine }));
    setNewTaskLabel(''); setShowTaskModal(false);
  };

  const handleDeleteTask = (id: string) => {
    dispatch(deleteRoutineTask(id));
  };

  const handleNightscoutConnect = async () => {
    if (!nsUrlInput.trim() || !nsSecretInput.trim()) return;
    // Auto-sanitizar URL (añade https://, quita espacios y barra final) antes de validar
    const sanitized = sanitizeExternalUrl(nsUrlInput.trim());
    if (sanitized !== nsUrlInput) setNsUrlInput(sanitized); // actualiza el input en pantalla
    const urlCheck = validateHttpsUrl(sanitized);
    if (!urlCheck.ok) { setNsStatus('error'); setNsError(urlCheck.error); setNsErrorCode('url'); return; }
    setNsTesting(true);
    setNsStatus('idle');
    setNsErrorCode(undefined);
    const result = await testNightscoutConnection(urlCheck.url, nsSecretInput.trim());
    if (result.ok) {
      dispatch(setNightscoutUrl(urlCheck.url));
      dispatch(setNightscoutApiSecret(nsSecretInput.trim()));
      await saveNightscoutConfig({ url: urlCheck.url, apiSecret: nsSecretInput.trim() });
      setNsStatus('ok');
    } else {
      setNsStatus('error');
      setNsErrorCode(result.errorCode);
      setNsError(result.error ?? 'No se pudo conectar');
    }
    setNsTesting(false);
  };

  const handleNightscoutDisconnect = async () => {
    dispatch(setNightscoutUrl(''));
    dispatch(setNightscoutApiSecret(''));
    await clearNightscoutConfig();
    setNsUrlInput('');
    setNsSecretInput('');
    setNsStatus('idle');
  };

  const isNsConnected = !!nightscoutUrl && !!nightscoutApiSecret;

  // LibreLink Official handler
  const handleLibreLinkConnect = async () => {
    if (!lluEmailInput.trim() || !lluPasswordInput.trim()) return;
    setLluTesting(true);
    setLluStatus('idle');
    const result = await loginLibreLinkOfficial(lluEmailInput.trim(), lluPasswordInput.trim());
    if (result.ok) {
      dispatch(setLibreLinkUpEmail(lluEmailInput.trim())); // solo email, nunca contraseña
      setLluStatus('ok');
      setLluPasswordInput('');
    } else {
      setLluStatus('error');
      setLluError(result.error ?? 'Email o contraseña incorrectos');
    }
    setLluTesting(false);
  };

  const handleLibreLinkDisconnect = async () => {
    await clearLibreLinkOfficialSession();
    dispatch(setLibreLinkUpEmail(''));
    setLluEmailInput('');
    setLluPasswordInput('');
    setLluStatus('idle');
  };

  const isLluConnected = !!libreLinkUpEmail;

  // Dexcom Share handler
  const handleDexcomShareConnect = async () => {
    if (!dexShareUserInput.trim() || !dexSharePasswordInput.trim()) return;
    setDexShareTesting(true);
    setDexShareStatus('idle');
    setDexShareErrorCode(undefined);
    try {
      const result = await loginDexcomShare(dexShareUserInput.trim(), dexSharePasswordInput.trim());
      if (result.ok) {
        dispatch(setDexcomShareUsername(dexShareUserInput.trim())); // solo usuario, nunca contraseña
        setDexShareStatus('ok');
        setDexSharePasswordInput('');
      } else {
        setDexShareStatus('error');
        setDexShareErrorCode(result.errorCode);
        setDexShareError(result.error ?? '❌ Error al conectar con Dexcom. Inténtalo de nuevo.');
      }
    } catch {
      setDexShareStatus('error');
      setDexShareErrorCode('network');
      setDexShareError('❌ No se pudo conectar con el servidor de Dexcom. Inténtalo de nuevo más tarde.');
    } finally {
      setDexShareTesting(false);
    }
  };

  const handleDexcomShareDisconnect = async () => {
    await clearDexcomShareSession();
    dispatch(setDexcomShareUsername(''));
    setDexShareUserInput('');
    setDexSharePasswordInput('');
    setDexShareStatus('idle');
  };

  const isDexShareConnected = !!dexcomShareUsername;

  // Tidepool
  const [tpEmailInput, setTpEmailInput]       = useState(tidepoolEmail);
  const [tpPasswordInput, setTpPasswordInput] = useState('');
  const [tpPwVisible, setTpPwVisible]         = useState(false);
  const [tpTesting, setTpTesting]             = useState(false);
  const [tpStatus, setTpStatus]               = useState<'idle'|'ok'|'error'>('idle');
  const [tpError, setTpError]                 = useState('');
  const [tpExpanded, setTpExpanded]           = useState(false);

  const isTpConnected = !!tidepoolEmail;

  const handleTidepoolConnect = async () => {
    if (!tpEmailInput.trim() || !tpPasswordInput.trim()) return;
    setTpTesting(true);
    setTpStatus('idle');
    const result = await loginTidepool(tpEmailInput.trim(), tpPasswordInput.trim());
    if (result.ok) {
      dispatch(setTidepoolEmail(tpEmailInput.trim())); // solo email, nunca contraseña
      setTpStatus('ok');
      setTpPasswordInput('');
    } else {
      setTpStatus('error');
      setTpError(result.error ?? 'Email o contraseña incorrectos');
    }
    setTpTesting(false);
  };

  const handleTidepoolDisconnect = async () => {
    await clearTidepoolSession();
    dispatch(setTidepoolEmail(''));
    setTpEmailInput('');
    setTpPasswordInput('');
    setTpStatus('idle');
  };

  const store = useStore();

  const handleExportData = async () => {
    try {
      const fullState = store.getState() as any;
      const health    = fullState.health  ?? {};
      const study     = fullState.study   ?? {};
      const gamif     = fullState.gamification ?? {};
      const today     = new Date();
      const dateStr   = today.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
      const fileName  = `floky-datos-${today.toISOString().split('T')[0]}`;

      const readings: any[] = health.readings ?? [];
      const sessions: any[] = study.pomodoroSessions ?? study.sessions ?? [];
      const pts   = gamif.points ?? gamif.totalPoints ?? 0;
      const strk  = gamif.streak ?? 0;

      if (Platform.OS === 'web') {
        // Metro resuelve exportDocx.web.ts en web, exportDocx.ts (stub) en native
        const { generateDocxBlob } = require('@/utils/exportDocx');
        const blob = await generateDocxBlob({
          userName, dateStr, colorScheme, displayMode, gamificationEnabled,
          subjects, readings, sessions, points: pts, streak: strk,
        });
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href    = url;
          a.download = `${fileName}.docx`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        let csv = `floky - Exportación de datos personales\n`;
        csv += `Usuario: ${userName}\nGenerado: ${dateStr}\n\n`;
        csv += `⚠️ AVISO: floky NO es un dispositivo médico certificado\n\n`;
        csv += `PERFIL Y CONFIGURACIÓN\n`;
        csv += `Nombre,${userName}\nTema,${colorScheme === 'dark' ? 'Oscuro' : 'Claro'}\nModo,${displayMode === 'dyslexia' ? 'Dislexia' : 'Normal'}\n\n`;
        csv += `ASIGNATURAS\n`;
        subjects.forEach(s => csv += `${s.icon} ${s.label}\n`);
        csv += `\nGLUCOSA (últimos 50)\nFecha,Valor (mg/dL),Notas\n`;
        readings.slice(-50).forEach((r: any) => {
          csv += `${new Date(r.timestamp).toLocaleString('es-ES')},${r.value ?? r.glucose ?? '—'},"${r.notes ?? ''}"\n`;
        });
        csv += `\nSESIONES DE ESTUDIO (últimas 30)\nFecha,Duración (min),Asignatura\n`;
        sessions.slice(-30).forEach((s: any) => {
          csv += `${s.date ? new Date(s.date).toLocaleDateString('es-ES') : '—'},${s.duration ?? s.minutes ?? '—'},${s.subject ?? s.subjectId ?? '—'}\n`;
        });
        csv += `\nGAMIFICACIÓN\nPuntos,${pts}\nRacha,${strk} días\n`;
        await Share.share({ message: csv, title: 'floky — Mis datos' });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar los datos.');
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      '⚠️ Borrar todos los datos',
      'Esta acción eliminará permanentemente todos tus registros de glucosa, estudio, rutinas y configuración. No se puede deshacer.\n\n¿Estás seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, borrar todo',
          style: 'destructive',
          onPress: async () => {
            dispatch(resetAllUserData());
            await persistor.purge();
            if (Platform.OS === 'web') {
              (window as any).location.reload();
            }
          },
        },
      ]
    );
  };

  // ── Enrutar a screens independientes según modo ──────────────────────────
  // Esperar a que Redux Persist rehidrate userMode antes de decidir qué mostrar
  if (!modeRehydrated) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  if (currentMode === 'adult')  return <AdultSettingsScreen />;
  if (currentMode === 'parent') return <ParentSettingsScreen />;

  const styles = makeStyles(C);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACING.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <DyslexiaText variant="h2" color={C.dark} style={{ fontWeight: '700' }}>Personalizar</DyslexiaText>
        </View>

        {/* ── PERFIL ── */}
        <SectionHeader title="PERFIL" />
        <View style={styles.card}>
          <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>TU NOMBRE</DyslexiaText>
          <View style={styles.nameRow}>
            <TextInput
              style={styles.nameInput}
              placeholder="Escribe tu nombre…"
              placeholderTextColor={C.darkTertiary}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ASIGNATURAS ── */}
        <SectionHeader title="ASIGNATURAS DE ESTUDIO" />
        <View style={styles.card}>
          {subjects.map((sub, idx) => (
            <View key={sub.id} style={[styles.listItem, idx < subjects.length - 1 && styles.listItemBorder]}>
              <View style={[styles.subjectDot, { backgroundColor: sub.color }]}>
                <Text style={styles.subjectDotIcon}>{sub.icon}</Text>
              </View>
              <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>{sub.label}</DyslexiaText>
              <TouchableOpacity onPress={() => handleDeleteSubject(sub.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={() => setShowSubjectModal(true)}>
            <View style={styles.addIcon}><Text style={styles.addPlus}>+</Text></View>
            <DyslexiaText variant="body" color={C.study} style={{ fontWeight: '600' }}>Añadir asignatura</DyslexiaText>
          </TouchableOpacity>
        </View>

        {/* ── RUTINAS ── */}
        <SectionHeader title="TAREAS DE RUTINA" />
        {(['morning', 'afternoon', 'evening'] as const).map(rid => {
          const tasks = routineTasks.filter(t => t.routineId === rid).sort((a, b) => a.order - b.order);
          return (
            <View key={rid} style={[styles.card, { marginBottom: SPACING.sm }]}>
              <DyslexiaText variant="small" color={C.darkSecondary} style={styles.routineGroupLabel}>
                {ROUTINE_LABELS[rid]}
              </DyslexiaText>
              {tasks.map((task, idx) => (
                <View key={task.id} style={[styles.listItem, idx < tasks.length - 1 && styles.listItemBorder]}>
                  <Text style={styles.taskIcon}>{task.icon}</Text>
                  <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>{task.label}</DyslexiaText>
                  <TouchableOpacity onPress={() => handleDeleteTask(task.id)} style={styles.deleteBtn}>
                    <Text style={styles.deleteIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addRow} onPress={() => { setNewTaskRoutine(rid); setShowTaskModal(true); }}>
                <View style={styles.addIcon}><Text style={styles.addPlus}>+</Text></View>
                <DyslexiaText variant="body" color={C.home} style={{ fontWeight: '600' }}>Añadir tarea</DyslexiaText>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* ── APARIENCIA ── */}
        <SectionHeader title="APARIENCIA" />
        <View style={styles.card}>
          <View style={styles.listItem}>
            <Text style={{ fontSize: 20 }}>{colorScheme === 'dark' ? '🌙' : '☀️'}</Text>
            <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>Tema de color</DyslexiaText>
          </View>
          <View style={[styles.listItemBorder]} />
          <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md }}>
            {(['light', 'dark'] as const).map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.schemeOption, colorScheme === s && styles.schemeOptionActive]}
                onPress={() => dispatch(setColorScheme(s))}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22 }}>{s === 'light' ? '☀️' : '🌙'}</Text>
                <DyslexiaText
                  variant="small"
                  color={colorScheme === s ? C.card : C.darkSecondary}
                  style={{ fontWeight: '600', marginTop: 4 }}
                >
                  {s === 'light' ? 'Claro' : 'Oscuro'}
                </DyslexiaText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modo de visualización */}
        <View style={styles.card}>
          <View style={styles.listItem}>
            <Text style={{ fontSize: 20 }}>🎨</Text>
            <DyslexiaText variant="body" color={C.dark} style={{ flex: 1 }}>Modo de visualización</DyslexiaText>
          </View>
          <View style={styles.listItemBorder} />
          <View style={{ flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md }}>
            {([
              { id: 'dyslexia', emoji: '🌈', label: 'Dislexia', desc: 'Letras grandes · Más espacio' },
              { id: 'normal',   emoji: '📋', label: 'Normal',   desc: 'Compacto · Estándar' },
            ] as const).map(m => {
              const active = displayMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.schemeOption, active && { backgroundColor: C.study + '18', borderColor: C.study }]}
                  onPress={() => dispatch(setDisplayMode(m.id))}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                  <DyslexiaText variant="small" color={active ? C.study : C.darkSecondary}
                    style={{ fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
                    {m.label}
                  </DyslexiaText>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', lineHeight: 16 }}>
                    {m.desc}
                  </DyslexiaText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── GAMIFICACIÓN ── */}
        <SectionHeader title="GAMIFICACIÓN 🎮" />
        <View style={styles.card}>
          <View style={styles.listItem}>
            <Text style={{ fontSize: 20 }}>⭐</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Sistema de puntos</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {gamificationEnabled
                  ? 'Activo — ganas puntos por tus logros'
                  : 'Desactivado — sin puntos ni misiones'}
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[styles.toggle, gamificationEnabled && styles.toggleOn]}
              onPress={() => dispatch(setGamificationEnabled(!gamificationEnabled))}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, gamificationEnabled && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── ASISTENTE IA ── */}
        <SectionHeader title="ASISTENTE IA 🌸" />

        {/* Toggle activar/desactivar */}
        <View style={styles.card}>
          <View style={styles.listItem}>
            <Text style={{ fontSize: 20 }}>✨</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Asistente de IA</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {aiEnabled ? 'Activo — te ayuda con tus tareas' : 'Desactivado'}
              </DyslexiaText>
            </View>
            <TouchableOpacity
              style={[styles.toggle, aiEnabled && styles.toggleOn]}
              onPress={() => dispatch(setAiEnabled(!aiEnabled))}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, aiEnabled && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* API Key de Groq — oculta si viene de variable de entorno */}
        {aiEnabled && !envGroqKey && (
          <View style={styles.card}>
            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>API KEY DE GROQ</DyslexiaText>
            <View style={styles.nameRow}>
              <TextInput
                style={[styles.nameInput, { flex: 1, fontFamily: 'monospace', fontSize: 12 }]}
                placeholder="gsk_…"
                placeholderTextColor={C.darkTertiary}
                value={groqKeyInput}
                onChangeText={setGroqKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
                maxLength={200}
              />
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => dispatch(setGroqApiKey(groqKeyInput.trim()))}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '600' }}>Guardar</DyslexiaText>
              </TouchableOpacity>
            </View>
            {!!groqApiKey && (
              <DyslexiaText variant="caption" color="#10B981" style={{ marginTop: 4 }}>
                ✓ Clave guardada ({groqApiKey.slice(0, 8)}…)
              </DyslexiaText>
            )}
            <DyslexiaText variant="caption" color={C.darkTertiary} style={{ marginTop: 4, lineHeight: 18 }}>
              Consigue tu clave gratuita en console.groq.com
            </DyslexiaText>
          </View>
        )}
        {aiEnabled && !!envGroqKey && (
          <View style={[styles.card, { backgroundColor: '#10B98110' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.sm }}>
              <Text style={{ fontSize: 16 }}>🔑</Text>
              <DyslexiaText variant="caption" color="#10B981" style={{ flex: 1 }}>
                API Key gestionada por el sistema ({envGroqKey.slice(0, 8)}…)
              </DyslexiaText>
            </View>
          </View>
        )}

        {/* Selector de compañera */}
        {aiEnabled && (
          <View style={styles.card}>
            <DyslexiaText variant="small" color={C.darkSecondary} style={{ fontWeight: '600' }}>
              Elige tu compañera
            </DyslexiaText>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {([
                { id: 'gerbera', emoji: '🌸', name: 'Gerbera', desc: 'Colorida y explosiva' },
                { id: 'rosa',    emoji: '🌹', name: 'Rosa',    desc: 'Clásica y elegante' },
                { id: 'tulipan', emoji: '🌷', name: 'Tulipán', desc: 'Suave y relajante' },
              ] as const).map(c => {
                const active = companion === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.companionCard,
                      { borderColor: active ? C.study : C.cardBorder },
                      active && { backgroundColor: C.study + '14' },
                    ]}
                    onPress={() => dispatch(setAdolescentCompanion(c.id))}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 32 }}>{c.emoji}</Text>
                    <DyslexiaText variant="small" color={active ? C.study : C.dark}
                      style={{ fontWeight: '700', textAlign: 'center' }}>
                      {c.name}
                    </DyslexiaText>
                    <DyslexiaText variant="caption" color={C.darkTertiary} style={{ textAlign: 'center', lineHeight: 16 }}>
                      {c.desc}
                    </DyslexiaText>
                    {active && (
                      <View style={[styles.companionCheck, { backgroundColor: C.study }]}>
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
        <View style={styles.card} onLayout={e => { sectionYRef.current['nightscout'] = e.nativeEvent.layout.y; }}>
          {/* Estado de conexión — toca para expandir */}
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setNsExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🔗</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Nightscout</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isNsConnected
                  ? `Conectado · ${nightscoutUrl.replace(/^https?:\/\//, '')}`
                  : 'Toca para configurar · Dexcom, Libre, AAPS, Loop, OmniPod'}
              </DyslexiaText>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: isNsConnected ? C.green + '20' : C.cardBorder },
              { borderColor: isNsConnected ? C.green + '40' : 'transparent' },
            ]}>
              <DyslexiaText variant="caption" color={isNsConnected ? C.green : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isNsConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary, fontSize: 16, marginLeft: 4 }}>
              {nsExpanded ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <View style={styles.listItemBorder} />

          {/* Formulario / desconectar — visible cuando expandido */}
          {nsExpanded && !isNsConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                URL DE TU NIGHTSCOUT
              </DyslexiaText>
              <TextInput
                style={[styles.nameInput, { marginBottom: 0 }]}
                placeholder="https://minightscout.fly.dev"
                placeholderTextColor={C.darkTertiary}
                value={nsUrlInput}
                onChangeText={v => { setNsUrlInput(v); setNsStatus('idle'); }}
                autoCapitalize="none"
                keyboardType="url"
                returnKeyType="next"
              />
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                API SECRET
              </DyslexiaText>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.nameInput, { marginBottom: 0, flex: 1 }]}
                  placeholder="Tu API secret de Nightscout"
                  placeholderTextColor={C.darkTertiary}
                  value={nsSecretInput}
                  onChangeText={v => { setNsSecretInput(v); setNsStatus('idle'); }}
                  secureTextEntry={!nsSecretVisible}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleNightscoutConnect}
                />
                <TouchableOpacity onPress={() => setNsSecretVisible(v => !v)} style={styles.pwEye}>
                  <Text style={{ fontSize: 18 }}>{nsSecretVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {nsStatus === 'error' && (
                <View style={{
                  backgroundColor: nsErrorCode === 'cors' ? '#FFF8E1' : '#FFF0F0',
                  borderRadius: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: nsErrorCode === 'cors' ? '#F59E0B' : C.red,
                  padding: SPACING.sm,
                  gap: 3,
                }}>
                  <DyslexiaText variant="caption" color={nsErrorCode === 'cors' ? '#B45309' : C.red} style={{ fontWeight: '700' }}>
                    {nsError}
                  </DyslexiaText>
                  {nsErrorCode === 'cors' && (
                    <DyslexiaText variant="caption" color={C.darkTertiary}>
                      {'En Nightscout, ve a Admin → Edit Config → ENABLE_CORS y ponlo en "true". Guarda y reinicia.'}
                    </DyslexiaText>
                  )}
                </View>
              )}
              {nsStatus === 'ok' && (
                <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: C.health,
                  opacity: (!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting) ? 0.5 : 1,
                }]}
                onPress={handleNightscoutConnect}
                disabled={!nsUrlInput.trim() || !nsSecretInput.trim() || nsTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                  {nsTesting ? '⏳ Verificando…' : '🔌 Conectar Nightscout'}
                </DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : nsExpanded && isNsConnected ? (
            <TouchableOpacity
              style={[styles.listItem, { paddingVertical: SPACING.sm }]}
              onPress={handleNightscoutDisconnect}
            >
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Nightscout</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Info sensores compatibles */}
        <View style={[styles.card, { backgroundColor: C.health + '08', borderColor: C.health + '20' }]}>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 18 }}>ℹ️</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>
                Sensores y bombas compatibles vía Nightscout
              </DyslexiaText>
              {[
                { emoji: '📡', text: 'CGM: Dexcom G5/G6/G7 · FreeStyle Libre 1/2/3 · Medtronic' },
                { emoji: '💉', text: 'Bombas: AAPS · Loop (iOS) · Omnipod · Tandem · Roche Accu-Chek' },
                { emoji: '🔧', text: 'Necesitas tu propio servidor Nightscout (gratuito en fly.io)' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 12, lineHeight: 18 }}>{item.emoji}</Text>
                  <DyslexiaText variant="caption" color={C.darkSecondary} style={{ flex: 1, lineHeight: 18 }}>{item.text}</DyslexiaText>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── LIBRELINKUP ── */}
        <View style={styles.card} onLayout={e => { sectionYRef.current['libre'] = e.nativeEvent.layout.y; }}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setLluExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🩹</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>FreeStyle Libre</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isLluConnected
                  ? `Conectado · ${libreLinkUpEmail}`
                  : 'Toca para configurar · LibreLinkUp vía email'}
              </DyslexiaText>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: isLluConnected ? C.green + '20' : C.cardBorder },
              { borderColor: isLluConnected ? C.green + '40' : 'transparent' },
            ]}>
              <DyslexiaText variant="caption" color={isLluConnected ? C.green : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isLluConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary, fontSize: 16, marginLeft: 4 }}>
              {lluExpanded ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <View style={styles.listItemBorder} />

          {lluExpanded && !isLluConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                EMAIL LIBRELINKUP
              </DyslexiaText>
              <TextInput
                style={[styles.nameInput, { marginBottom: 0 }]}
                placeholder="tu.email@ejemplo.com"
                placeholderTextColor={C.darkTertiary}
                value={lluEmailInput}
                onChangeText={v => { setLluEmailInput(v); setLluStatus('idle'); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                CONTRASEÑA
              </DyslexiaText>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.nameInput, { marginBottom: 0, flex: 1 }]}
                  placeholder="Tu contraseña de LibreLinkUp"
                  placeholderTextColor={C.darkTertiary}
                  value={lluPasswordInput}
                  onChangeText={v => { setLluPasswordInput(v); setLluStatus('idle'); }}
                  secureTextEntry={!lluPwVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleLibreLinkConnect}
                />
                <TouchableOpacity onPress={() => setLluPwVisible(v => !v)} style={styles.pwEye}>
                  <Text style={{ fontSize: 18 }}>{lluPwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {lluStatus === 'error' && (
                <DyslexiaText variant="caption" color={C.red}>❌ {lluError}</DyslexiaText>
              )}
              {lluStatus === 'ok' && (
                <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: C.health,
                  opacity: (!lluEmailInput.trim() || !lluPasswordInput.trim() || lluTesting) ? 0.5 : 1,
                }]}
                onPress={handleLibreLinkConnect}
                disabled={!lluEmailInput.trim() || !lluPasswordInput.trim() || lluTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                  {lluTesting ? 'Verificando…' : '🩹 Conectar Libre'}
                </DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : lluExpanded && isLluConnected ? (
            <TouchableOpacity
              style={[styles.listItem, { paddingVertical: SPACING.sm }]}
              onPress={handleLibreLinkDisconnect}
            >
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Libre</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── DEXCOM SHARE (WEB) ── */}
        <View style={styles.card} onLayout={e => { sectionYRef.current['dexcomshare'] = e.nativeEvent.layout.y; }}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setDexShareExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🌐</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Dexcom Share (Web)</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isDexShareConnected
                  ? `Conectado · ${dexcomShareUsername}`
                  : 'Toca para configurar · En navegadores web'}
              </DyslexiaText>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: isDexShareConnected ? C.green + '20' : C.cardBorder },
              { borderColor: isDexShareConnected ? C.green + '40' : 'transparent' },
            ]}>
              <DyslexiaText variant="caption" color={isDexShareConnected ? C.green : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isDexShareConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary, fontSize: 16, marginLeft: 4 }}>
              {dexShareExpanded ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <View style={styles.listItemBorder} />

          {dexShareExpanded && !isDexShareConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              {/* Explicación del flujo de Dexcom Share */}
              <View style={{ backgroundColor: C.health + '15', borderRadius: 10, padding: SPACING.sm, borderLeftWidth: 3, borderLeftColor: C.health }}>
                <DyslexiaText variant="caption" color={C.health} style={{ fontWeight: '700', marginBottom: 4 }}>
                  ℹ️ ¿Cómo funciona Dexcom Share?
                </DyslexiaText>
                <DyslexiaText variant="caption" color={C.darkSecondary} style={{ lineHeight: 18 }}>
                  {'1. En la app Dexcom, activa "Share" y comparte tu sensor por email con quien quieras.\n\n2. Aquí pon el email y contraseña de tu propia cuenta Dexcom (la del sensor). No es una contraseña de invitación.\n\n3. Si alguien te ha compartido sus datos, usa Nightscout en su lugar.'}
                </DyslexiaText>
              </View>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                TU EMAIL DE DEXCOM
              </DyslexiaText>
              <TextInput
                style={[styles.nameInput, { marginBottom: 0 }]}
                placeholder="tu.email@ejemplo.com"
                placeholderTextColor={C.darkTertiary}
                value={dexShareUserInput}
                onChangeText={v => { setDexShareUserInput(v); setDexShareStatus('idle'); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                CONTRASEÑA DE TU CUENTA DEXCOM
              </DyslexiaText>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.nameInput, { marginBottom: 0, flex: 1 }]}
                  placeholder="Contraseña de dexcom.com"
                  placeholderTextColor={C.darkTertiary}
                  value={dexSharePasswordInput}
                  onChangeText={v => { setDexSharePasswordInput(v); setDexShareStatus('idle'); }}
                  secureTextEntry={!dexSharePwVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleDexcomShareConnect}
                />
                <TouchableOpacity onPress={() => setDexSharePwVisible(v => !v)} style={styles.pwEye}>
                  <Text style={{ fontSize: 18 }}>{dexSharePwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {dexShareStatus === 'error' && (
                <View style={{
                  backgroundColor: dexShareErrorCode === 'credentials' ? '#FFF0F0' : dexShareErrorCode === 'network' ? '#FFF8F0' : '#FFF5F0',
                  borderRadius: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: dexShareErrorCode === 'credentials' ? C.red : dexShareErrorCode === 'network' ? '#F59E0B' : C.red,
                  padding: SPACING.sm,
                  gap: 3,
                }}>
                  <DyslexiaText variant="caption" color={C.red} style={{ fontWeight: '700' }}>
                    {dexShareError}
                  </DyslexiaText>
                  {dexShareErrorCode === 'credentials' && (
                    <DyslexiaText variant="caption" color={C.darkTertiary}>
                      Asegúrate de usar las credenciales de dexcom.com, no las de la app Dexcom G-series.
                    </DyslexiaText>
                  )}
                  {dexShareErrorCode === 'server' && (
                    <DyslexiaText variant="caption" color={C.darkTertiary}>
                      Los servidores de Dexcom (EE.UU. y Europa) no responden. Espera unos minutos.
                    </DyslexiaText>
                  )}
                  {dexShareErrorCode === 'network' && (
                    <DyslexiaText variant="caption" color={C.darkTertiary}>
                      Comprueba tu conexión Wi-Fi o datos móviles.
                    </DyslexiaText>
                  )}
                </View>
              )}
              {dexShareStatus === 'ok' && (
                <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: C.health,
                  opacity: (!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting) ? 0.5 : 1,
                }]}
                onPress={handleDexcomShareConnect}
                disabled={!dexShareUserInput.trim() || !dexSharePasswordInput.trim() || dexShareTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                  {dexShareTesting ? '⏳ Verificando servidores Dexcom…' : '🌐 Conectar Dexcom Web'}
                </DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : dexShareExpanded && isDexShareConnected ? (
            <TouchableOpacity
              style={[styles.listItem, { paddingVertical: SPACING.sm }]}
              onPress={handleDexcomShareDisconnect}
            >
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Dexcom Web</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* ── TIDEPOOL ── */}
        <View style={styles.card} onLayout={e => { sectionYRef.current['tidepool'] = e.nativeEvent.layout.y; }}>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setTpExpanded(e => !e)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🌊</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Tidepool</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                {isTpConnected
                  ? `Conectado · ${tidepoolEmail}`
                  : 'API oficial · Medtronic, Tandem, OmniPod, Dexcom, Libre'}
              </DyslexiaText>
            </View>
            <View style={[
              styles.badge,
              { backgroundColor: isTpConnected ? C.green + '20' : C.cardBorder },
              { borderColor: isTpConnected ? C.green + '40' : 'transparent' },
            ]}>
              <DyslexiaText variant="caption" color={isTpConnected ? C.green : C.darkSecondary} style={{ fontWeight: '700' }}>
                {isTpConnected ? '✓ ON' : 'OFF'}
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary, fontSize: 16, marginLeft: 4 }}>
              {tpExpanded ? '∧' : '∨'}
            </Text>
          </TouchableOpacity>

          <View style={styles.listItemBorder} />

          {tpExpanded && !isTpConnected ? (
            <View style={{ padding: SPACING.md, gap: SPACING.sm }}>
              <View style={[{ backgroundColor: C.green + '10', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, borderWidth: 1, borderColor: C.green + '30' }]}>
                <DyslexiaText variant="caption" color={C.green} style={{ fontWeight: '700', lineHeight: 18 }}>
                  {'✅ API 100% OFICIAL\nTidepool es una organización non-profit aprobada por la FDA. Sus APIs son abiertas y no requieren acuerdo de empresa.'}
                </DyslexiaText>
              </View>
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                EMAIL TIDEPOOL
              </DyslexiaText>
              <TextInput
                style={[styles.nameInput, { marginBottom: 0 }]}
                placeholder="tu.email@ejemplo.com"
                placeholderTextColor={C.darkTertiary}
                value={tpEmailInput}
                onChangeText={v => { setTpEmailInput(v); setTpStatus('idle'); }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />
              <DyslexiaText variant="caption" color={C.darkTertiary} style={{ letterSpacing: 0.5, fontWeight: '600' }}>
                CONTRASEÑA
              </DyslexiaText>
              <View style={styles.pwRow}>
                <TextInput
                  style={[styles.nameInput, { marginBottom: 0, flex: 1 }]}
                  placeholder="Tu contraseña de Tidepool"
                  placeholderTextColor={C.darkTertiary}
                  value={tpPasswordInput}
                  onChangeText={v => { setTpPasswordInput(v); setTpStatus('idle'); }}
                  secureTextEntry={!tpPwVisible}
                  returnKeyType="done"
                  onSubmitEditing={handleTidepoolConnect}
                />
                <TouchableOpacity onPress={() => setTpPwVisible(v => !v)} style={styles.pwEye}>
                  <Text style={{ fontSize: 18 }}>{tpPwVisible ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {tpStatus === 'error' && (
                <DyslexiaText variant="caption" color={C.red}>❌ {tpError}</DyslexiaText>
              )}
              {tpStatus === 'ok' && (
                <DyslexiaText variant="caption" color={C.green}>✅ Conectado correctamente</DyslexiaText>
              )}
              <TouchableOpacity
                style={[styles.saveBtn, {
                  backgroundColor: C.green,
                  opacity: (!tpEmailInput.trim() || !tpPasswordInput.trim() || tpTesting) ? 0.5 : 1,
                }]}
                onPress={handleTidepoolConnect}
                disabled={!tpEmailInput.trim() || !tpPasswordInput.trim() || tpTesting}
              >
                <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700' }}>
                  {tpTesting ? 'Verificando…' : '🌊 Conectar Tidepool'}
                </DyslexiaText>
              </TouchableOpacity>
            </View>
          ) : tpExpanded && isTpConnected ? (
            <TouchableOpacity
              style={[styles.listItem, { paddingVertical: SPACING.sm }]}
              onPress={handleTidepoolDisconnect}
            >
              <Text style={{ fontSize: 18 }}>🔌</Text>
              <DyslexiaText variant="body" color={C.red}>Desconectar Tidepool</DyslexiaText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Bombas compatibles vía Tidepool */}
        <View style={[styles.card, { backgroundColor: C.green + '06', borderColor: C.green + '20' }]}>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', padding: SPACING.sm }}>
            <Text style={{ fontSize: 18 }}>💉</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>
                Bombas de insulina compatibles (vía Tidepool)
              </DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkSecondary} style={{ lineHeight: 18 }}>
                {'🔵 Medtronic MiniMed 530G/630G/670G/780G\n' +
                 '🟠 Tandem t:slim X2 (Control-IQ/Basal-IQ)\n' +
                 '🟢 Insulet OmniPod DASH/5\n' +
                 '🔴 Roche Accu-Chek Combo · Insight · Solo\n' +
                 '🩵 Dexcom G5/G6/G7 · FreeStyle Libre 2/3\n' +
                 '⬛ Animas y otras vía Nightscout/AAPS\n' +
                 '🟡 YpsoPump (vía AAPS + Nightscout)'}
              </DyslexiaText>
            </View>
          </View>
        </View>

        {/* ── OBJETIVOS DE GLUCOSA ── */}
        <SectionHeader title="OBJETIVOS DE GLUCOSA 🎯" />
        <View style={styles.card}>
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

        {/* ── NOTIFICACIONES ── */}
        <SectionHeader title="NOTIFICACIONES 🔔" />
        <View style={styles.card}>
          {([
            { key: 'glucose', label: '🩸 Glucosa', desc: '6 recordatorios diarios (7:30 - 22:00)', value: notifGlucose, action: setNotifGlucose },
            { key: 'study',   label: '✏️ Estudio',  desc: 'Recordatorio a las 16:00',              value: notifStudy,   action: setNotifStudy   },
            { key: 'routine', label: '📋 Rutinas',  desc: 'Mañana, tarde y noche',                 value: notifRoutine, action: setNotifRoutine  },
          ] as const).map((item, idx, arr) => (
            <View
              key={item.key}
              style={[styles.listItem, idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.cardBorder, paddingBottom: SPACING.sm, marginBottom: SPACING.sm }]}
            >
              <View style={{ flex: 1 }}>
                <DyslexiaText variant="body" color={C.dark}>{item.label}</DyslexiaText>
                <DyslexiaText variant="caption" color={C.darkTertiary}>{item.desc}</DyslexiaText>
              </View>
              <TouchableOpacity
                style={[styles.toggle, item.value && styles.toggleOn]}
                onPress={() => dispatch(item.action(!item.value))}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, item.value && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* ── PERSONALIZACIÓN DE SECCIONES ── */}
        <SectionHeader title="PERSONALIZACIÓN DE PANTALLAS 🎨" />
        <View style={styles.card}>
          <View style={{ gap: SPACING.sm }}>
            <ScreenRow id="health" emoji="💉" label="Salud & Diabetes" screens="Glucosa, protocolo, AAPS" onPress={setEditingSections} isLast={false} />
            <ScreenRow id="study" emoji="✏️" label="Estudio" screens="Pomodoro, tareas, estadísticas" onPress={setEditingSections} isLast={false} />
            <ScreenRow id="index" emoji="🏠" label="Inicio" screens="Módulos, acciones, misiones" onPress={setEditingSections} isLast={false} />
            <ScreenRow id="home" emoji="🏡" label="Rutinas" screens="Mañana, tarde, noche" onPress={setEditingSections} isLast={false} />
            <ScreenRow id="relation" emoji="👥" label="Familia" screens="Chat, resumen semanal" onPress={setEditingSections} isLast={true} />
          </View>
        </View>

        {/* ── INFORMACIÓN ── */}
        <SectionHeader title="INFORMACIÓN 📋" />

        {/* Modo de la aplicación */}
        <SectionHeader title="MODO DE USO 🔄" />
        <View style={styles.card}>
          <View style={[styles.listItem, { paddingVertical: SPACING.md }]}>
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
          <View style={styles.listItemBorder} />
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setShowModeModal(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 20 }}>🔄</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.study}>Cambiar modo</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>
                Adolescente · Adulto · Padre/Madre · Médico
              </DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App en desarrollo */}
        <View style={[styles.card, { backgroundColor: C.study + '08', borderColor: C.study + '25' }]}>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start', padding: SPACING.md }}>
            <Text style={{ fontSize: 20 }}>🚧</Text>
            <View style={{ flex: 1, gap: 4 }}>
              <DyslexiaText variant="body" color={C.dark} style={{ fontWeight: '700' }}>
                Aplicación en desarrollo (v{APP_VERSION})
              </DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkSecondary} style={{ lineHeight: 18 }}>
                floky está en fase beta. Pueden aparecer errores o cambios en futuras versiones. Gracias por tu paciencia y apoyo.
              </DyslexiaText>
            </View>
          </View>
        </View>

        {/* Botones: Políticas y Compatibilidades */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={() => setInfoModal('compat')}>
            <Text style={{ fontSize: 20 }}>💉</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Dispositivos compatibles</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Sensores CGM y bombas de insulina</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={styles.listItemBorder} />
          <TouchableOpacity style={styles.listItem} onPress={() => setInfoModal('policy')}>
            <Text style={{ fontSize: 20 }}>📄</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Políticas y privacidad</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Uso de datos y términos de la app</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={styles.listItemBorder} />
          <View style={styles.listItem}>
            <Text style={{ fontSize: 20 }}>✉️</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Contacto</DyslexiaText>
              <DyslexiaText variant="caption" color={C.study}>diegozamoranogarcia@gmail.com</DyslexiaText>
            </View>
          </View>
        </View>

        {/* RGPD: Exportar / Borrar datos */}
        <SectionHeader title="MIS DATOS (RGPD) 🔒" />
        <View style={styles.card}>
          <TouchableOpacity style={styles.listItem} onPress={handleExportData}>
            <Text style={{ fontSize: 20 }}>📤</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.dark}>Exportar mis datos</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Descarga una copia de toda tu información</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={styles.listItemBorder} />
          <TouchableOpacity style={styles.listItem} onPress={() => {
            Alert.alert(
              'Limpiar lecturas de glucosa',
              '¿Eliminar todas las lecturas manuales de glucosa? Las lecturas del sensor (CGM) se mantendrán.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpiar', style: 'destructive', onPress: () => dispatch(clearManualGlucoseReadings()) },
              ]
            );
          }}>
            <Text style={{ fontSize: 20 }}>🩸</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Limpiar lecturas de glucosa</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Elimina las lecturas manuales registradas en la app</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
          <View style={styles.listItemBorder} />
          <TouchableOpacity style={styles.listItem} onPress={handleDeleteAllData}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
            <View style={{ flex: 1 }}>
              <DyslexiaText variant="body" color={C.red}>Borrar todos mis datos</DyslexiaText>
              <DyslexiaText variant="caption" color={C.darkTertiary}>Elimina permanentemente toda la información de la app</DyslexiaText>
            </View>
            <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + SPACING.xxl }} />
      </ScrollView>

      {/* ── MODAL: Compatibilidades ── */}
      <Modal visible={infoModal === 'compat'} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.md, maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xs }}>
              <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>💉 Dispositivos compatibles</DyslexiaText>
              <TouchableOpacity onPress={() => setInfoModal(null)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: C.darkTertiary as string }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
              <View style={{ gap: SPACING.md, paddingHorizontal: SPACING.xs, paddingBottom: SPACING.md }}>
                <View style={[{ backgroundColor: C.health + '10', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: C.health + '25', gap: SPACING.sm }]}>
                  <DyslexiaText variant="small" color={C.health} style={{ fontWeight: '700' }}>📡 Sensores CGM</DyslexiaText>
                  {['Dexcom G5 / G6 / G7', 'FreeStyle Libre 1 / 2 / 3', 'Medtronic Enlite / Guardian', 'Eversense (vía Nightscout)'].map(s => (
                    <View key={s} style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <Text style={{ color: C.health as string }}>•</Text>
                      <DyslexiaText variant="body" color={C.dark}>{s}</DyslexiaText>
                    </View>
                  ))}
                </View>
                <View style={[{ backgroundColor: C.study + '10', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: C.study + '25', gap: SPACING.sm }]}>
                  <DyslexiaText variant="small" color={C.study} style={{ fontWeight: '700' }}>💊 Bombas de insulina</DyslexiaText>
                  {['AAPS (Android APS)', 'Loop / iAPS (iOS)', 'Medtronic MiniMed 530G / 630G / 670G / 780G', 'Tandem t:slim X2 (Control-IQ / Basal-IQ)', 'Insulet OmniPod DASH / 5', 'Roche Accu-Chek Combo / Insight / Solo', 'YpsoPump (vía AAPS + Nightscout)'].map(s => (
                    <View key={s} style={{ flexDirection: 'row', gap: SPACING.sm }}>
                      <Text style={{ color: C.study as string }}>•</Text>
                      <DyslexiaText variant="body" color={C.dark}>{s}</DyslexiaText>
                    </View>
                  ))}
                </View>
                <View style={[{ backgroundColor: C.cardBorder + '40', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: 4 }]}>
                  <DyslexiaText variant="small" color={C.darkSecondary} style={{ fontWeight: '700' }}>🔧 Conexión necesaria</DyslexiaText>
                  <DyslexiaText variant="caption" color={C.darkTertiary} style={{ lineHeight: 18 }}>
                    La mayoría de dispositivos se conectan vía Nightscout (servidor gratuito en fly.io). Dexcom y FreeStyle Libre también tienen conexión directa desde ajustes.{'\n\n'}
                    💡 YpsoPump: conecta tu bomba a AAPS → AAPS sube datos a Nightscout → floky los muestra automáticamente.
                  </DyslexiaText>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Políticas ── */}
      <Modal visible={infoModal === 'policy'} transparent animationType="slide" onRequestClose={() => setInfoModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.md, maxHeight: '85%' }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.xs }}>
              <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>📄 Políticas y privacidad</DyslexiaText>
              <TouchableOpacity onPress={() => setInfoModal(null)} style={{ padding: 8 }}>
                <Text style={{ fontSize: 20, color: C.darkTertiary as string }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: SPACING.sm }}>
              <View style={{ gap: SPACING.md, paddingHorizontal: SPACING.xs, paddingBottom: SPACING.md }}>
                <View style={{ gap: SPACING.sm }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>🔒 Privacidad de datos</DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    floky almacena todos tus datos localmente en tu dispositivo. No enviamos ni vendemos ningún dato personal a terceros.
                  </DyslexiaText>
                </View>
                <View style={styles.listItemBorder} />
                <View style={{ gap: SPACING.sm }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>💉 Datos médicos</DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    Los registros de glucosa y datos de salud se guardan únicamente en este dispositivo. Si usas Nightscout, la sincronización ocurre directamente entre tu dispositivo y tu servidor personal.
                  </DyslexiaText>
                </View>
                <View style={styles.listItemBorder} />
                <View style={{ gap: SPACING.sm }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>⚠️ Uso responsable — NO es un dispositivo médico</DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    floky es una herramienta de apoyo y organización personal. <Text style={{ fontWeight: '700', color: C.red as string }}>NO es un Software as Medical Device (SaMD) certificado bajo el Reglamento MDR 2017/745 de la UE.</Text>
                  </DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    No reemplaza el diagnóstico, tratamiento ni consejo de un profesional médico. Consulta siempre a tu equipo médico para cualquier decisión sobre tu salud.
                  </DyslexiaText>
                </View>
                <View style={styles.listItemBorder} />
                <View style={{ gap: SPACING.sm }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>👨‍👩‍👧 Menores de 16 años (RGPD España)</DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    Para usuarios menores de 16 años, la ley española (LO 3/2018 LOPDGDD) exige consentimiento expreso del padre, madre o tutor legal para el tratamiento de datos personales.
                  </DyslexiaText>
                </View>
                <View style={styles.listItemBorder} />
                <View style={{ gap: SPACING.sm }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>🚧 App en desarrollo (beta)</DyslexiaText>
                  <DyslexiaText variant="body" color={C.darkSecondary} style={{ lineHeight: 22 }}>
                    Esta aplicación está en fase de desarrollo activo. Pueden existir errores o cambios de funcionalidad en futuras versiones. Para reportar problemas o sugerencias escríbenos a:
                  </DyslexiaText>
                  <DyslexiaText variant="body" color={C.study} style={{ fontWeight: '600' }}>
                    diegozamoranogarcia@gmail.com
                  </DyslexiaText>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Personalizar secciones ── */}
      {editingSections && (
        <SectionCustomizationModal
          screen={editingSections}
          onClose={() => setEditingSections(null)}
        />
      )}

      {/* ── MODAL: Nueva asignatura ── */}
      <Modal visible={showSubjectModal} transparent animationType="slide" onRequestClose={() => setShowSubjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHandle} />
            <DyslexiaText variant="h3" color={C.dark} style={styles.modalTitle}>Nueva asignatura</DyslexiaText>

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>NOMBRE</DyslexiaText>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Filosofía"
              placeholderTextColor={C.darkTertiary}
              value={newSubjectLabel}
              onChangeText={setNewSubjectLabel}
              maxLength={20}
              autoFocus
            />

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>ICONO</DyslexiaText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING.md }}>
              <View style={styles.iconPickerRow}>
                {ICON_OPTIONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, newSubjectIcon === ic && styles.iconOptionActive]}
                    onPress={() => setNewSubjectIcon(ic)}>
                    <Text style={styles.iconOptionText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>COLOR</DyslexiaText>
            <View style={styles.colorPickerRow}>
              {COLOR_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorSwatch, { backgroundColor: c }, newSubjectColor === c && styles.colorSwatchActive]}
                  onPress={() => setNewSubjectColor(c)} />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowSubjectModal(false)}>
                <DyslexiaText variant="body" color={C.darkSecondary}>Cancelar</DyslexiaText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: newSubjectColor }]} onPress={handleAddSubject}>
                <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '600' }}>Añadir</DyslexiaText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: Nueva tarea ── */}
      <Modal visible={showTaskModal} transparent animationType="slide" onRequestClose={() => setShowTaskModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHandle} />
            <DyslexiaText variant="h3" color={C.dark} style={styles.modalTitle}>
              Nueva tarea — {ROUTINE_LABELS[newTaskRoutine]}
            </DyslexiaText>

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>NOMBRE</DyslexiaText>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej: Leer 20 minutos"
              placeholderTextColor={C.darkTertiary}
              value={newTaskLabel}
              onChangeText={setNewTaskLabel}
              maxLength={30}
              autoFocus
            />

            <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.fieldLabel}>ICONO</DyslexiaText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING.md }}>
              <View style={styles.iconPickerRow}>
                {TASK_ICONS.map(ic => (
                  <TouchableOpacity
                    key={ic}
                    style={[styles.iconOption, newTaskIcon === ic && styles.iconOptionActive]}
                    onPress={() => setNewTaskIcon(ic)}>
                    <Text style={styles.iconOptionText}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowTaskModal(false)}>
                <DyslexiaText variant="body" color={C.darkSecondary}>Cancelar</DyslexiaText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.home }]} onPress={handleAddTask}>
                <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '600' }}>Añadir</DyslexiaText>
              </TouchableOpacity>
            </View>
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
              { mode: 'adult'  as UserMode, emoji: '📊', label: 'Adulto',      desc: 'Vista simplificada para adultos' },
              { mode: 'parent' as UserMode, emoji: '🐥', label: 'Padre/Madre', desc: 'Monitorización del hijo/a' },
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

function SectionCustomizationModal({ screen, onClose }: { screen: 'health' | 'study' | 'index' | 'home' | 'relation'; onClose: () => void }) {
  const C = useAppColors();
  const styles = makeStyles(C);
  const { sections, toggle, reset } = useScreenLayout(screen);
  const insets = useSafeAreaInsets();

  const SECTION_META: Record<string, { label: string; emoji: string }> = {
    grid:        { label: 'Módulos principales', emoji: '🟦' },
    actions:     { label: 'Próximas acciones',   emoji: '⚡' },
    missions:    { label: 'Misiones del día',     emoji: '🎯' },
    register:    { label: 'Registrar glucosa',    emoji: '✏️' },
    protocol:    { label: 'Protocolo diario',     emoji: '📋' },
    dexcom:      { label: 'Conexión & AAPS',      emoji: '📡' },
    chart:       { label: 'Gráfico del día',      emoji: '📈' },
    stats:       { label: 'Estadísticas',         emoji: '📊' },
    pomodoro:    { label: 'Temporizador',          emoji: '⏱️' },
    breakdown:   { label: 'Desglose de tarea',    emoji: '📝' },
    morning:     { label: 'Rutina de mañana',     emoji: '🌅' },
    afternoon:   { label: 'Rutina de tarde',      emoji: '📖' },
    evening:     { label: 'Rutina de noche',      emoji: '🌙' },
    chat:        { label: 'Chat familiar',        emoji: '💬' },
    weekly:      { label: 'Resumen semanal',      emoji: '📅' },
  };

  const handleReset = () => {
    reset();
    onClose();
  };

  return (
    <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
        <View style={[styles.modalSheet, { backgroundColor: C.card, borderColor: C.cardBorder, maxHeight: '85%' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
            <DyslexiaText variant="h3" color={C.dark} style={{ fontWeight: '700' }}>
              ✏️ Personalizar pantalla
            </DyslexiaText>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20, color: C.darkTertiary as string }}>✕</Text>
            </TouchableOpacity>
          </View>

          <DyslexiaText variant="small" color={C.darkSecondary} style={{ marginBottom: SPACING.md }}>
            Activa o desactiva las secciones que quieres ver
          </DyslexiaText>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '65%' }}>
            {sections.map((sec, idx) => {
              const meta = SECTION_META[sec.id] ?? { label: sec.id, emoji: '▪️' };
              return (
                <View key={sec.id} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder }]}>
                  <TouchableOpacity
                    onPress={() => toggle(sec.id)}
                    style={[
                      { width: 44, height: 26, borderRadius: 13, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
                      sec.visible && { backgroundColor: C.study }
                    ]}>
                    <Text style={{ color: sec.visible ? '#fff' : C.darkTertiary as string, fontSize: 12, fontWeight: '700' }}>
                      {sec.visible ? 'ON' : 'OFF'}
                    </Text>
                  </TouchableOpacity>

                  <Text style={{ fontSize: 18, marginHorizontal: 8 }}>{meta.emoji}</Text>
                  <DyslexiaText
                    variant="body"
                    color={sec.visible ? C.dark : C.darkTertiary}
                    style={{ flex: 1, fontWeight: sec.visible ? '600' : '400' }}>
                    {meta.label}
                  </DyslexiaText>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: C.cardBorder }}>
            <TouchableOpacity onPress={handleReset} style={[styles.cancelBtn, { flex: 1 }]}>
              <DyslexiaText variant="small" color={C.darkSecondary}>↺ Restablecer</DyslexiaText>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={[styles.confirmBtn, { flex: 1, backgroundColor: C.study }]}>
              <DyslexiaText variant="body" color="#fff" style={{ fontWeight: '700' }}>Hecho</DyslexiaText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

type ScreenIdParam = 'health' | 'study' | 'index' | 'home' | 'relation';

function ScreenRow({ id, emoji, label, screens, onPress, isLast }: {
  id: ScreenIdParam;
  emoji: string;
  label: string;
  screens: string;
  onPress: (id: ScreenIdParam) => void;
  isLast: boolean;
}) {
  const C = useAppColors();
  const styles = makeStyles(C);
  return (
    <TouchableOpacity
      style={[
        styles.listItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: C.cardBorder, paddingBottom: SPACING.sm, marginBottom: SPACING.sm },
      ]}
      onPress={() => onPress(id)}
    >
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <DyslexiaText variant="body" color={C.dark}>{label}</DyslexiaText>
        <DyslexiaText variant="caption" color={C.darkTertiary}>{screens}</DyslexiaText>
      </View>
      <Text style={{ color: C.darkTertiary as string, fontSize: 16 }}>›</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  const C = useAppColors();
  const styles = makeStyles(C);
  return (
    <DyslexiaText variant="caption" color={C.darkTertiary} style={styles.sectionHeader}>
      {title}
    </DyslexiaText>
  );
}


const makeStyles = (C: AppColors) => StyleSheet.create({
  content: { padding: SPACING.md, gap: SPACING.sm },

  header:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  backBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center', ...C.cardShadow },
  backArrow: { fontSize: 24, color: C.dark, lineHeight: 28, marginTop: -2 },

  sectionHeader:    { letterSpacing: 1, fontWeight: '600', marginTop: SPACING.sm, marginBottom: 2, marginLeft: 4 },
  routineGroupLabel:{ fontWeight: '600', marginBottom: SPACING.xs },

  card: {
    backgroundColor: C.card,
    borderRadius: C.cardRadius,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: 'hidden',
    ...C.cardShadow,
  },

  fieldLabel: { letterSpacing: 0.8, fontWeight: '600', marginBottom: 6, paddingHorizontal: SPACING.md, paddingTop: SPACING.md },

  nameRow:   { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  nameInput: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 16, color: C.dark },
  pwRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  pwEye:  { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  saveBtn:   { backgroundColor: C.study, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },

  listItem:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12, paddingHorizontal: SPACING.md, minHeight: 52 },
  listItemBorder: { borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  subjectDot:     { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subjectDotIcon: { fontSize: 16 },
  taskIcon:       { fontSize: 20, width: 34, textAlign: 'center' },
  deleteBtn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  deleteIcon:     { fontSize: 12, color: C.red, fontWeight: '700' },
  badge:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12, paddingHorizontal: SPACING.md, borderTopWidth: 1, borderTopColor: C.cardBorder },
  addIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.cardBorder, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontSize: 18, color: C.darkSecondary, lineHeight: 22 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.md, gap: SPACING.sm },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: 'center', marginBottom: SPACING.sm },
  modalTitle:   { fontWeight: '700', paddingHorizontal: SPACING.xs },
  modalInput:   { backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 16, color: C.dark, marginHorizontal: SPACING.xs },

  iconPickerRow: { flexDirection: 'row', gap: SPACING.xs, paddingHorizontal: SPACING.md, paddingBottom: SPACING.xs },
  iconOption:    { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.cardBorder, alignItems: 'center', justifyContent: 'center' },
  iconOptionActive: { borderColor: C.study, borderWidth: 2, backgroundColor: '#EEF2FF' },
  iconOptionText: { fontSize: 22 },

  colorPickerRow:   { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', paddingHorizontal: SPACING.xs },
  colorSwatch:      { width: 32, height: 32, borderRadius: 16 },
  colorSwatchActive:{ borderWidth: 3, borderColor: C.dark },

  modalActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  cancelBtn:    { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.full, backgroundColor: C.bg, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  confirmBtn:   { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.full, alignItems: 'center' },

  schemeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    backgroundColor: C.bg,
    gap: 2,
  },
  schemeOptionActive: {
    backgroundColor: C.study,
    borderColor: C.study,
  },

  toggle: {
    width: 46, height: 26, borderRadius: 13,
    backgroundColor: C.cardBorder,
    justifyContent: 'center', paddingHorizontal: 3,
  },
  toggleOn: { backgroundColor: C.health },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    ...C.cardShadow,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  companionCard: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2, borderColor: 'transparent',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  companionCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
});

