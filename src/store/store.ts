import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  createMigrate,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { persistStorage } from './storage';
import healthReducer from './slices/healthSlice';
import studyReducer from './slices/studySlice';
import homeReducer from './slices/homeSlice';
import relationReducer from './slices/relationSlice';
import gamificationReducer from './slices/gamificationSlice';
import uiReducer from './slices/uiSlice';
import settingsReducer from './slices/settingsSlice';
import layoutReducer from './slices/layoutSlice';
import userModeReducer from './slices/userModeSlice';

// Version 6: restore 'dexcom' section to health layout (Dexcom OAuth connection card)
const layoutMigrations = { 3: () => undefined, 4: () => undefined, 5: () => undefined, 6: () => undefined } as const;

const layoutPersistConfig = {
  key: 'layout',
  version: 6,
  storage: persistStorage,
  migrate: createMigrate(layoutMigrations as any, { debug: false }),
};

// Version 1: add insulinPatterns array to existing persisted state
const healthMigrations = {
  1: (state: any) => ({ insulinPatterns: [], ...state }),
} as const;

const healthPersistConfig = {
  key: 'health',
  version: 1,
  storage: persistStorage,
  migrate: createMigrate(healthMigrations as any, { debug: false }),
};

const settingsPersistConfig = {
  key: 'settings',
  storage: persistStorage,
  // Nunca persistir secretos — se recargan de env vars o los introduce el usuario
  blacklist: ['nightscoutApiSecret'] as string[],
};

const gamificationPersistConfig = {
  key: 'gamification',
  storage: persistStorage,
};

const studyPersistConfig = {
  key: 'study',
  storage: persistStorage,
};

const persistedHealthReducer        = persistReducer(healthPersistConfig, healthReducer);
const persistedSettingsReducer      = persistReducer(settingsPersistConfig, settingsReducer);
const persistedGamificationReducer  = persistReducer(gamificationPersistConfig, gamificationReducer);
const persistedStudyReducer         = persistReducer(studyPersistConfig, studyReducer);
const persistedLayoutReducer        = persistReducer(layoutPersistConfig, layoutReducer);

const userModePersistConfig = {
  key: 'userMode',
  storage: persistStorage,
};
const persistedUserModeReducer = persistReducer(userModePersistConfig, userModeReducer);

export const store = configureStore({
  reducer: {
    health: persistedHealthReducer,
    study: persistedStudyReducer,
    home: homeReducer,
    relation: relationReducer,
    gamification: persistedGamificationReducer,
    ui: uiReducer,
    settings: persistedSettingsReducer,
    layout: persistedLayoutReducer,
    userMode: persistedUserModeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Auto-backup de ajustes cifrado — se actualiza 2 s después de cada cambio
import { saveSettingsBackup } from '@/services/settingsBackup';
let _backupTimer: ReturnType<typeof setTimeout> | null = null;
store.subscribe(() => {
  if (_backupTimer) clearTimeout(_backupTimer);
  _backupTimer = setTimeout(() => {
    const s = store.getState();
    saveSettingsBackup(s.settings as unknown as Record<string, unknown>);
  }, 2000);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
