import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  selectedTab: number;
  isDyslexiaMode: boolean;
}

const initialState: UIState = {
  selectedTab: 0,
  isDyslexiaMode: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedTab: (state, action: PayloadAction<number>) => {
      state.selectedTab = action.payload;
    },
    setDyslexiaMode: (state, action: PayloadAction<boolean>) => {
      state.isDyslexiaMode = action.payload;
    },
  },
});

export const { setSelectedTab, setDyslexiaMode } = uiSlice.actions;
export default uiSlice.reducer;
