import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Subject {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export interface RoutineTask {
  id: string;
  label: string;
  icon: string;
  routineId: 'morning' | 'afternoon' | 'evening';
  order: number;
}

export interface SettingsState {
  userName: string;
  subjects: Subject[];
  routineTasks: RoutineTask[];
  parentPin: string;
  isFirstLaunch: boolean;
  settingsVisible: boolean;
  colorScheme: 'light' | 'dark';
  groqApiKey: string;
  aiEnabled: boolean;
  /** @deprecated usar adolescentCompanion — mantenido para compat con AICompanion */
  companion: 'girasol' | 'rosa' | 'amapola';
  adolescentCompanion: 'gerbera' | 'rosa' | 'tulipan';
  parentCompanion:     'dino'    | 'oso'  | 'pato';
  adultCompanion:      'zen_gem' | 'plasma_orb' | 'origami';
  displayMode: 'dyslexia' | 'normal';
  notifGlucose: boolean;
  notifStudy: boolean;
  notifRoutine: boolean;
  gamificationEnabled: boolean;
  nightscoutUrl: string;
  nightscoutApiSecret: string;  // no persisted — ver store.ts blacklist
  libreLinkUpEmail: string;
  // contraseñas nunca en Redux — las sesiones las gestiona cada servicio
  dexcomShareUsername: string;
  /** true si hay tokens OAuth de Dexcom API guardados */
  dexcomLinked: boolean;
  tidepoolEmail: string;
  // RGPD
  legalConsentAccepted: boolean;
  isMinor: boolean;
  parentalConsentAccepted: boolean;
  // School Mode
  schoolModeEnabled: boolean;
  schoolStartHour: number;  // 0-23
  schoolEndHour: number;    // 0-23
  schoolDays: number[];     // 0=Dom, 1=Lun, ..., 6=Sab
  parentNotificationEmail: string; // email del padre para alertas
  // Adult mode — glucose targets
  glucoseTargetLow: number;   // default 70
  glucoseTargetHigh: number;  // default 180
  // Parent mode — child profile & alerts
  childName: string;
  parentAlertLow: number;    // alert threshold (default 70)
  parentAlertHigh: number;   // alert threshold (default 250)
  parentNotifEnabled: boolean;
}

const DEFAULT_SUBJECTS: Subject[] = [
  { id: 's1', label: 'Módulo 1', icon: '📋', color: '#4F46E5' },
  { id: 's2', label: 'Módulo 2', icon: '🔧', color: '#10B981' },
  { id: 's3', label: 'Módulo 3', icon: '💻', color: '#0EA5E9' },
  { id: 's4', label: 'Inglés',   icon: '🌍', color: '#D97706' },
  { id: 's5', label: 'FOL',      icon: '📊', color: '#8B5CF6' },
  { id: 's6', label: 'Otro',     icon: '📝', color: '#94A3B8' },
];

const DEFAULT_TASKS: RoutineTask[] = [
  // Mañana
  { id: 'm1', label: 'Ducha',           icon: '🚿', routineId: 'morning',   order: 0 },
  { id: 'm2', label: 'Desayuno',        icon: '🍳', routineId: 'morning',   order: 1 },
  { id: 'm3', label: 'Preparar mochila',icon: '🎒', routineId: 'morning',   order: 2 },
  { id: 'm4', label: 'Salida a tiempo', icon: '🚪', routineId: 'morning',   order: 3 },
  // Tarde
  { id: 'a1', label: 'Merienda',        icon: '🍎', routineId: 'afternoon', order: 0 },
  { id: 'a2', label: 'Tareas escolares',icon: '📚', routineId: 'afternoon', order: 1 },
  { id: 'a3', label: 'Ayuda en casa',   icon: '🧹', routineId: 'afternoon', order: 2 },
  { id: 'a4', label: 'Descanso',        icon: '😴', routineId: 'afternoon', order: 3 },
  // Noche
  { id: 'e1', label: 'Cena',            icon: '🍽️', routineId: 'evening',   order: 0 },
  { id: 'e2', label: 'Higiene',         icon: '🦷', routineId: 'evening',   order: 1 },
  { id: 'e3', label: 'Revisar mochila', icon: '🎒', routineId: 'evening',   order: 2 },
  { id: 'e4', label: 'Acostarse',       icon: '🛏️', routineId: 'evening',   order: 3 },
];

const initialState: SettingsState = {
  userName: '',
  subjects: DEFAULT_SUBJECTS,
  routineTasks: DEFAULT_TASKS,
  parentPin: '',
  isFirstLaunch: true,
  settingsVisible: true,
  colorScheme: 'light',
  groqApiKey: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '',
  aiEnabled: true,
  companion: 'girasol',
  adolescentCompanion: 'gerbera',
  parentCompanion:     'dino',
  adultCompanion:      'zen_gem',
  displayMode: 'dyslexia',
  notifGlucose: true,
  notifStudy: true,
  notifRoutine: true,
  gamificationEnabled: true,
  nightscoutUrl: '',
  nightscoutApiSecret: '',
  libreLinkUpEmail: '',
  dexcomShareUsername: '',
  dexcomLinked: false,
  tidepoolEmail: '',
  legalConsentAccepted: false,
  isMinor: false,
  parentalConsentAccepted: false,
  schoolModeEnabled: false,
  schoolStartHour: 8,
  schoolEndHour: 15,
  schoolDays: [1, 2, 3, 4, 5], // lun-vie
  parentNotificationEmail: '',
  glucoseTargetLow: 70,
  glucoseTargetHigh: 180,
  childName: '',
  parentAlertLow: 70,
  parentAlertHigh: 250,
  parentNotifEnabled: true,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setUserName: (state, action: PayloadAction<string>) => {
      state.userName = action.payload;
    },

    addSubject: (state, action: PayloadAction<Omit<Subject, 'id'>>) => {
      state.subjects.push({ id: Date.now().toString(), ...action.payload });
    },
    updateSubject: (state, action: PayloadAction<Subject>) => {
      const idx = state.subjects.findIndex(s => s.id === action.payload.id);
      if (idx >= 0) state.subjects[idx] = action.payload;
    },
    deleteSubject: (state, action: PayloadAction<string>) => {
      state.subjects = state.subjects.filter(s => s.id !== action.payload);
    },

    addRoutineTask: (state, action: PayloadAction<Omit<RoutineTask, 'id' | 'order'>>) => {
      const siblings = state.routineTasks.filter(t => t.routineId === action.payload.routineId);
      state.routineTasks.push({
        id: Date.now().toString(),
        order: siblings.length,
        ...action.payload,
      });
    },
    updateRoutineTask: (state, action: PayloadAction<RoutineTask>) => {
      const idx = state.routineTasks.findIndex(t => t.id === action.payload.id);
      if (idx >= 0) state.routineTasks[idx] = action.payload;
    },
    deleteRoutineTask: (state, action: PayloadAction<string>) => {
      state.routineTasks = state.routineTasks.filter(t => t.id !== action.payload);
    },

    setParentPin: (state, action: PayloadAction<string>) => {
      state.parentPin = action.payload;
    },
    clearParentPin: (state) => {
      state.parentPin = '';
    },
    completeOnboarding: (state) => {
      state.isFirstLaunch = false;
    },
    setSettingsVisible: (state, action: PayloadAction<boolean>) => {
      state.settingsVisible = action.payload;
    },
    setColorScheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.colorScheme = action.payload;
    },
    setGroqApiKey: (state, action: PayloadAction<string>) => {
      state.groqApiKey = action.payload;
    },
    setAiEnabled: (state, action: PayloadAction<boolean>) => {
      state.aiEnabled = action.payload;
    },
    setCompanion: (state, action: PayloadAction<'girasol' | 'rosa' | 'amapola'>) => {
      state.companion = action.payload;
    },
    setAdolescentCompanion: (state, action: PayloadAction<'gerbera' | 'rosa' | 'tulipan'>) => {
      state.adolescentCompanion = action.payload;
    },
    setParentCompanion: (state, action: PayloadAction<'dino' | 'oso' | 'pato'>) => {
      state.parentCompanion = action.payload;
    },
    setAdultCompanion: (state, action: PayloadAction<'zen_gem' | 'plasma_orb' | 'origami'>) => {
      state.adultCompanion = action.payload;
    },
    setDisplayMode: (state, action: PayloadAction<'dyslexia' | 'normal'>) => {
      state.displayMode = action.payload;
    },
    setNotifGlucose: (state, action: PayloadAction<boolean>) => {
      state.notifGlucose = action.payload;
    },
    setNotifStudy: (state, action: PayloadAction<boolean>) => {
      state.notifStudy = action.payload;
    },
    setNotifRoutine: (state, action: PayloadAction<boolean>) => {
      state.notifRoutine = action.payload;
    },
    setGamificationEnabled: (state, action: PayloadAction<boolean>) => {
      state.gamificationEnabled = action.payload;
    },
    setNightscoutUrl: (state, action: PayloadAction<string>) => {
      state.nightscoutUrl = action.payload;
    },
    setNightscoutApiSecret: (state, action: PayloadAction<string>) => {
      state.nightscoutApiSecret = action.payload;
    },
    setLibreLinkUpEmail: (state, action: PayloadAction<string>) => {
      state.libreLinkUpEmail = action.payload;
    },
    setDexcomShareUsername: (state, action: PayloadAction<string>) => {
      state.dexcomShareUsername = action.payload;
    },
    setDexcomLinked: (state, action: PayloadAction<boolean>) => {
      state.dexcomLinked = action.payload;
    },
    setTidepoolEmail: (state, action: PayloadAction<string>) => {
      state.tidepoolEmail = action.payload;
    },
    setLegalConsentAccepted: (state, action: PayloadAction<boolean>) => {
      state.legalConsentAccepted = action.payload;
    },
    setIsMinor: (state, action: PayloadAction<boolean>) => {
      state.isMinor = action.payload;
    },
    setParentalConsentAccepted: (state, action: PayloadAction<boolean>) => {
      state.parentalConsentAccepted = action.payload;
    },
    setSchoolModeEnabled: (state, action: PayloadAction<boolean>) => {
      state.schoolModeEnabled = action.payload;
    },
    setSchoolStartHour: (state, action: PayloadAction<number>) => {
      state.schoolStartHour = Math.max(0, Math.min(23, action.payload));
    },
    setSchoolEndHour: (state, action: PayloadAction<number>) => {
      state.schoolEndHour = Math.max(0, Math.min(23, action.payload));
    },
    setSchoolDays: (state, action: PayloadAction<number[]>) => {
      state.schoolDays = action.payload.filter(d => d >= 0 && d <= 6);
    },
    setParentNotificationEmail: (state, action: PayloadAction<string>) => {
      state.parentNotificationEmail = action.payload;
    },
    setGlucoseTargetLow: (state, action: PayloadAction<number>) => {
      state.glucoseTargetLow = Math.max(40, Math.min(100, action.payload));
    },
    setGlucoseTargetHigh: (state, action: PayloadAction<number>) => {
      state.glucoseTargetHigh = Math.max(120, Math.min(400, action.payload));
    },
    setChildName: (state, action: PayloadAction<string>) => {
      state.childName = action.payload;
    },
    setParentAlertLow: (state, action: PayloadAction<number>) => {
      state.parentAlertLow = Math.max(40, Math.min(100, action.payload));
    },
    setParentAlertHigh: (state, action: PayloadAction<number>) => {
      state.parentAlertHigh = Math.max(150, Math.min(400, action.payload));
    },
    setParentNotifEnabled: (state, action: PayloadAction<boolean>) => {
      state.parentNotifEnabled = action.payload;
    },
    resetAllUserData: () => initialState,
    restoreSettingsFromBackup: (state, action: PayloadAction<Partial<SettingsState>>) => {
      // Merge backup into current state, but always mark as not first launch
      return { ...state, ...action.payload, isFirstLaunch: false };
    },
  },
});

export const {
  setUserName,
  addSubject, updateSubject, deleteSubject,
  addRoutineTask, updateRoutineTask, deleteRoutineTask,
  setParentPin, clearParentPin, completeOnboarding, setSettingsVisible, setColorScheme, setGroqApiKey, setAiEnabled, setCompanion, setAdolescentCompanion, setParentCompanion, setAdultCompanion, setDisplayMode,
  setNotifGlucose, setNotifStudy, setNotifRoutine, setGamificationEnabled,
  setNightscoutUrl, setNightscoutApiSecret,
  setLibreLinkUpEmail,
  setDexcomShareUsername,
  setDexcomLinked,
  setTidepoolEmail,
  setLegalConsentAccepted, setIsMinor, setParentalConsentAccepted,
  // @deprecated — modo escuela eliminado; campos mantenidos para compatibilidad con datos persistidos
  setSchoolModeEnabled, setSchoolStartHour, setSchoolEndHour, setSchoolDays, setParentNotificationEmail,
  setGlucoseTargetLow, setGlucoseTargetHigh,
  setChildName, setParentAlertLow, setParentAlertHigh, setParentNotifEnabled,
  resetAllUserData,
  restoreSettingsFromBackup,
} = settingsSlice.actions;
export default settingsSlice.reducer;
