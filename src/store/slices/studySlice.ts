import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StudyBlock {
  id: string;
  date: string;
  subject: string;
  duration: 15 | 20;
  completed: boolean;
  completedAt?: string;
}

export interface TaskStep {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskBreakdown {
  id: string;
  title: string;
  steps: TaskStep[];
  createdAt: string;
}

interface StudyState {
  blocks: StudyBlock[];
  totalBlocksThisWeek: number;
  currentStreak: number;
  activeTask: TaskBreakdown | null;
}

const initialState: StudyState = {
  blocks: [],
  totalBlocksThisWeek: 0,
  currentStreak: 0,
  activeTask: null,
};

const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {
    addStudyBlock: (state, action: PayloadAction<Omit<StudyBlock, 'id'>>) => {
      state.blocks.push({ id: Date.now().toString(), ...action.payload });
    },
    completeStudyBlock: (state, action: PayloadAction<string>) => {
      const block = state.blocks.find(b => b.id === action.payload);
      if (block) {
        block.completed = true;
        block.completedAt = new Date().toISOString();
      }
    },
    setActiveTask: (state, action: PayloadAction<{ title: string; steps: string[] }>) => {
      state.activeTask = {
        id: Date.now().toString(),
        title: action.payload.title,
        steps: action.payload.steps.map((text, i) => ({ id: `${Date.now()}_${i}`, text, done: false })),
        createdAt: new Date().toISOString(),
      };
    },
    toggleStep: (state, action: PayloadAction<string>) => {
      const step = state.activeTask?.steps.find(s => s.id === action.payload);
      if (step) step.done = !step.done;
    },
    clearTask: (state) => {
      state.activeTask = null;
    },
  },
});

export const { addStudyBlock, completeStudyBlock, setActiveTask, toggleStep, clearTask } = studySlice.actions;
export default studySlice.reducer;
