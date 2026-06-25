import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type UserMode = 'adolescent' | 'adult' | 'parent';

interface UserModeState {
  currentMode: UserMode;
  onboardingComplete: boolean;
  seenModeIntros: UserMode[];       // modos cuyo intro ya se ha visto
  pendingModeIntro: UserMode | null; // intro pendiente al cambiar de modo
  modePreferences: {
    adolescent: { showEmojis: boolean; textToSpeech: boolean };
    adult:      { showGraphs: boolean; showNumbers: boolean; hideEmojis: boolean };
    parent:     { childVisibility: 'full' | 'summary' | 'alerts-only' };
  };
}

const initialState: UserModeState = {
  currentMode: 'adolescent',
  onboardingComplete: false,
  seenModeIntros: [],
  pendingModeIntro: null,
  modePreferences: {
    adolescent: { showEmojis: true, textToSpeech: true },
    adult:      { showGraphs: true, showNumbers: true, hideEmojis: false },
    parent:     { childVisibility: 'summary' },
  },
};

const userModeSlice = createSlice({
  name: 'userMode',
  initialState,
  reducers: {
    setUserMode: (state, action: PayloadAction<UserMode>) => {
      state.currentMode = action.payload;
    },
    completeOnboarding: (state) => {
      state.onboardingComplete = true;
    },
    markModeIntroSeen: (state, action: PayloadAction<UserMode>) => {
      if (!state.seenModeIntros.includes(action.payload)) {
        state.seenModeIntros.push(action.payload);
      }
      if (state.pendingModeIntro === action.payload) {
        state.pendingModeIntro = null;
      }
    },
    setPendingModeIntro: (state, action: PayloadAction<UserMode | null>) => {
      state.pendingModeIntro = action.payload;
    },
    setModePreference: <M extends UserMode>(
      state: UserModeState,
      action: PayloadAction<{ mode: M; key: keyof UserModeState['modePreferences'][M]; value: any }>,
    ) => {
      const { mode, key, value } = action.payload;
      (state.modePreferences[mode] as any)[key] = value;
    },
    resetOnboarding: (state) => {
      state.onboardingComplete = false;
      state.seenModeIntros = [];
      state.pendingModeIntro = null;
    },
  },
});

export const {
  setUserMode, completeOnboarding, markModeIntroSeen,
  setPendingModeIntro, setModePreference, resetOnboarding,
} = userModeSlice.actions;
export default userModeSlice.reducer;
