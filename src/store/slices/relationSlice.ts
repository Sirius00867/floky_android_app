import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DailyChat {
  id: string;
  date: string;
  message: string;
  completed: boolean;
}

interface RelationState {
  dailyChats: DailyChat[];
}

const initialState: RelationState = {
  dailyChats: [],
};

const relationSlice = createSlice({
  name: 'relation',
  initialState,
  reducers: {
    addDailyChat: (state, action: PayloadAction<Omit<DailyChat, 'id'>>) => {
      const newChat: DailyChat = {
        id: Date.now().toString(),
        ...action.payload,
      };
      state.dailyChats.push(newChat);
    },
  },
});

export const { addDailyChat } = relationSlice.actions;
export default relationSlice.reducer;
