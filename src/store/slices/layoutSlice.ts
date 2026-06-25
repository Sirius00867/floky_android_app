import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScreenId = 'index' | 'health' | 'study' | 'home' | 'relation';

export interface SectionConfig {
  id: string;       // stable key
  visible: boolean;
  order: number;
}

export interface ScreenLayout {
  sections: SectionConfig[];
}

type LayoutState = Record<ScreenId, ScreenLayout>;

// ── Default layouts ───────────────────────────────────────────────────────────

const DEFAULT_LAYOUTS: LayoutState = {
  index: {
    sections: [
      { id: 'grid',     visible: true, order: 0 },
      { id: 'actions',  visible: true, order: 1 },
      { id: 'missions', visible: true, order: 2 },
    ],
  },
  health: {
    sections: [
      { id: 'lastReading', visible: false, order: 0 }, // manejado por tabs — oculto por defecto
      { id: 'register',    visible: true,  order: 1 },
      { id: 'protocol',    visible: true,  order: 2 },
      { id: 'dexcom',      visible: true,  order: 3 }, // Dexcom OAuth — conexión directa API
      { id: 'chart',       visible: true,  order: 4 },
      { id: 'history',     visible: false, order: 5 }, // manejado por tabs — oculto por defecto
    ],
  },
  study: {
    sections: [
      { id: 'stats',     visible: true, order: 0 },
      { id: 'pomodoro',  visible: true, order: 1 },
      { id: 'breakdown', visible: true, order: 2 },
    ],
  },
  home: {
    sections: [
      { id: 'morning',   visible: true, order: 0 },
      { id: 'afternoon', visible: true, order: 1 },
      { id: 'evening',   visible: true, order: 2 },
    ],
  },
  relation: {
    sections: [
      { id: 'chat',   visible: true, order: 0 },
      { id: 'weekly', visible: true, order: 1 },
    ],
  },
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const layoutSlice = createSlice({
  name: 'layout',
  initialState: DEFAULT_LAYOUTS,
  reducers: {
    // Reorder sections: receives the full new ordered array of section IDs
    reorderSections(
      state,
      action: PayloadAction<{ screen: ScreenId; orderedIds: string[] }>
    ) {
      const { screen, orderedIds } = action.payload;
      orderedIds.forEach((id, idx) => {
        const sec = state[screen].sections.find(s => s.id === id);
        if (sec) sec.order = idx;
      });
    },

    // Toggle visibility of a single section
    toggleSection(
      state,
      action: PayloadAction<{ screen: ScreenId; sectionId: string }>
    ) {
      const { screen, sectionId } = action.payload;
      const sec = state[screen].sections.find(s => s.id === sectionId);
      if (sec) sec.visible = !sec.visible;
    },

    // Reset a screen to its default layout
    resetScreenLayout(state, action: PayloadAction<ScreenId>) {
      state[action.payload] = DEFAULT_LAYOUTS[action.payload];
    },

    // Reset all screens
    resetAllLayouts() {
      return DEFAULT_LAYOUTS;
    },

    // Apply full ordered + visible layout atomically (used by LayoutEditor on save)
    applyScreenLayout(
      state,
      action: PayloadAction<{ screen: ScreenId; sections: SectionConfig[] }>
    ) {
      const { screen, sections } = action.payload;
      state[screen].sections = sections.map((s, idx) => ({ ...s, order: idx }));
    },
  },
});

export const {
  reorderSections,
  toggleSection,
  resetScreenLayout,
  resetAllLayouts,
  applyScreenLayout,
} = layoutSlice.actions;

export default layoutSlice.reducer;
