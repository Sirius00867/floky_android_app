import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DailyMissionDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  target: number;
  reward: number;
  color: string;
}

export const DAILY_MISSIONS: DailyMissionDef[] = [
  { id: 'glucose_3',   icon: '🩸', title: 'Mide tu glucosa',    desc: 'Registra 3 mediciones hoy',           target: 3, reward: 30, color: '#059669' },
  { id: 'study_1',     icon: '📚', title: 'Bloque de estudio',  desc: 'Completa 1 bloque Pomodoro',           target: 1, reward: 20, color: '#4F46E5' },
  { id: 'routine_all', icon: '✅', title: 'Rutina completa',    desc: 'Completa todas tus tareas del día',    target: 1, reward: 25, color: '#D97706' },
];

interface ClaimedMission {
  missionId: string;
  date: string;
}

interface GamificationState {
  totalPoints: number;
  autonomyLevel: 1 | 2 | 3;
  claimedMissions: ClaimedMission[];
}

const initialState: GamificationState = {
  totalPoints: 0,
  autonomyLevel: 1,
  claimedMissions: [],
};

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    addPoints: (state, action: PayloadAction<number>) => {
      state.totalPoints += action.payload;
    },
    claimMissionReward: (state, action: PayloadAction<{ missionId: string; date: string }>) => {
      state.claimedMissions.push(action.payload);
      // Limpia entradas de más de 7 días para no crecer indefinidamente
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      state.claimedMissions = state.claimedMissions.filter(
        c => new Date(c.date) >= cutoff
      );
    },
  },
});

export const { addPoints, claimMissionReward } = gamificationSlice.actions;
export default gamificationSlice.reducer;
