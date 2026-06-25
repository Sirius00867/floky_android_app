import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FlokyJson } from '@/types/flokyData';

interface GlucoseReading {
  id: string;
  value: number;
  timestamp: string;
  source: string;
  notes?: string;
}

interface ProtocolEntry {
  phaseId: string;
  date: string;
}

export interface InsulinPattern {
  id: string;
  label: string;
  time: string;       // "HH:MM"
  days: number[];     // 0=Dom … 6=Sáb
  rapidUnits: number;
  carbRations: number;
  active: boolean;
}

export interface LiveCgmReading {
  value: number;
  trend?: string;   // 'Flat' | 'FortyFiveUp' | 'SingleUp' | etc.
  source: string;   // 'Nightscout' | 'FreeStyle Libre' | 'Dexcom Share' | ...
  timestamp: string;
}

interface HealthState {
  glucoseReadings: GlucoseReading[];
  autonomyLevel: 1 | 2 | 3;
  lastUpdated: string | null;
  completedProtocolPhases: ProtocolEntry[];
  insulinPatterns: InsulinPattern[];
  liveCgmReading: LiveCgmReading | null;
  lastCgmSync: string | null;
  isCgmSyncing: boolean;
  /** Snapshot procesado por flokyParser — única fuente de verdad para la UI */
  flokySnapshot: FlokyJson | null;
}

const initialState: HealthState = {
  glucoseReadings: [],
  autonomyLevel: 1,
  lastUpdated: null,
  completedProtocolPhases: [],
  insulinPatterns: [],
  liveCgmReading: null,
  lastCgmSync: null,
  isCgmSyncing: false,
  flokySnapshot: null,
};

const healthSlice = createSlice({
  name: 'health',
  initialState,
  reducers: {
    addGlucoseReading: (state, action: PayloadAction<Omit<GlucoseReading, 'id'>>) => {
      state.glucoseReadings.push({ id: Date.now().toString(), ...action.payload });
      state.lastUpdated = new Date().toISOString();
    },
    setAutonomyLevel: (state, action: PayloadAction<1 | 2 | 3>) => {
      state.autonomyLevel = action.payload;
    },
    toggleProtocolPhase: (state, action: PayloadAction<string>) => {
      const today = new Date().toDateString();
      const idx = state.completedProtocolPhases.findIndex(
        p => p.phaseId === action.payload && new Date(p.date).toDateString() === today
      );
      if (idx >= 0) {
        state.completedProtocolPhases.splice(idx, 1);
      } else {
        state.completedProtocolPhases.push({ phaseId: action.payload, date: new Date().toISOString() });
      }
    },
    addInsulinPattern: (state, action: PayloadAction<Omit<InsulinPattern, 'id' | 'active'>>) => {
      state.insulinPatterns.push({ id: Date.now().toString(), active: true, ...action.payload });
    },
    updateInsulinPattern: (state, action: PayloadAction<InsulinPattern>) => {
      const idx = state.insulinPatterns.findIndex(p => p.id === action.payload.id);
      if (idx >= 0) state.insulinPatterns[idx] = action.payload;
    },
    deleteInsulinPattern: (state, action: PayloadAction<string>) => {
      state.insulinPatterns = state.insulinPatterns.filter(p => p.id !== action.payload);
    },
    togglePatternActive: (state, action: PayloadAction<string>) => {
      const p = state.insulinPatterns.find(p => p.id === action.payload);
      if (p) p.active = !p.active;
    },
    setLiveCgmReading: (state, action: PayloadAction<LiveCgmReading>) => {
      state.liveCgmReading = action.payload;
      state.lastCgmSync = new Date().toISOString();
      state.isCgmSyncing = false;

      // Acumular en historial si el dato es ≥4 min más nuevo que el último CGM guardado
      const newTs = new Date(action.payload.timestamp).getTime();
      const cgmReadings = state.glucoseReadings.filter(r => r.source !== 'manual');
      const lastTs = cgmReadings.length
        ? Math.max(...cgmReadings.map(r => new Date(r.timestamp).getTime()))
        : 0;

      if (newTs - lastTs >= 4 * 60_000) {
        state.glucoseReadings.push({
          id:        `cgm_${newTs}`,
          value:     action.payload.value,
          timestamp: action.payload.timestamp,
          source:    action.payload.source,
        });
        // Mantener solo los últimos 90 días
        const cutoff = Date.now() - 90 * 24 * 3_600_000;
        state.glucoseReadings = state.glucoseReadings.filter(
          r => new Date(r.timestamp).getTime() >= cutoff
        );
      }
    },
    setCgmSyncing: (state, action: PayloadAction<boolean>) => {
      state.isCgmSyncing = action.payload;
    },
    /**
     * Almacena el FlokyJson procesado por flokyGateway.
     * Todos los componentes de UI deben leer de aquí — nunca del liveCgmReading directo.
     */
    setFlokySnapshot: (state, action: PayloadAction<FlokyJson | null>) => {
      state.flokySnapshot = action.payload;
      // Sincroniza también liveCgmReading para compatibilidad con código legado
      if (action.payload?.bg != null) {
        state.liveCgmReading = {
          value:     action.payload.bg,
          trend:     action.payload.trend,
          source:    'Nightscout',
          timestamp: action.payload.t,
        };
        state.lastCgmSync = new Date().toISOString();
      }
    },
    clearManualGlucoseReadings: (state) => {
      state.glucoseReadings = [];
      state.lastUpdated = null;
    },
    // Reemplaza todas las lecturas CGM de una fuente con un batch completo.
    // Las lecturas manuales ('manual' / 'Fingerstick') nunca se tocan.
    bulkSetCgmReadings: (state, action: PayloadAction<{ source: string; readings: Omit<GlucoseReading, 'id'>[] }>) => {
      const { source, readings } = action.payload;
      const manual = state.glucoseReadings.filter(
        r => r.source === 'manual' || r.source === 'Fingerstick'
      );
      const otherCgm = state.glucoseReadings.filter(
        r => r.source !== 'manual' && r.source !== 'Fingerstick' && r.source !== source
      );
      const newBatch: GlucoseReading[] = readings.map(r => ({
        id: `cgm_${source}_${new Date(r.timestamp).getTime()}`,
        ...r,
      }));
      const cutoff = Date.now() - 90 * 24 * 3_600_000;
      state.glucoseReadings = [...manual, ...otherCgm, ...newBatch]
        .filter(r => new Date(r.timestamp).getTime() >= cutoff);
      state.lastUpdated = new Date().toISOString();
    },
  },
});

export const {
  addGlucoseReading,
  setAutonomyLevel,
  toggleProtocolPhase,
  addInsulinPattern,
  updateInsulinPattern,
  deleteInsulinPattern,
  togglePatternActive,
  setLiveCgmReading,
  setCgmSyncing,
  setFlokySnapshot,
  clearManualGlucoseReadings,
  bulkSetCgmReadings,
} = healthSlice.actions;
export default healthSlice.reducer;
