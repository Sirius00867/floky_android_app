import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Routine {
  id: string;
  name: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  completed: boolean;
  completedDate?: string;
}

interface CompletedTask {
  taskId: string;
  date: string;
}

interface HomeState {
  routines: Routine[];
  completedTasks: CompletedTask[];
}

const initialState: HomeState = {
  routines: [],
  completedTasks: [],
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    addRoutine: (state, action: PayloadAction<Omit<Routine, 'id'>>) => {
      const newRoutine: Routine = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.routines.push(newRoutine);
    },
    completeRoutine: (state, action: PayloadAction<string>) => {
      const routine = state.routines.find(r => r.id === action.payload);
      if (routine) {
        routine.completed = true;
        routine.completedDate = new Date().toISOString();
      }
    },
    toggleTask: (state, action: PayloadAction<string>) => {
      const today = new Date().toDateString();
      const idx = state.completedTasks.findIndex(
        t => t.taskId === action.payload && new Date(t.date).toDateString() === today
      );
      if (idx >= 0) {
        state.completedTasks.splice(idx, 1);
      } else {
        state.completedTasks.push({ taskId: action.payload, date: new Date().toISOString() });
      }
    },
  },
});

export const { addRoutine, completeRoutine, toggleTask } = homeSlice.actions;
export default homeSlice.reducer;
