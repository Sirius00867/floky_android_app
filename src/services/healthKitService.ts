import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  'The healthkit module could not be found. Ensure that you have run `pod install` and that you have not deleted the `ios` folder.';

const healthKit = NativeModules.RNHealthKit
  ? NativeModules.RNHealthKit
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      },
    );

export interface HealthKitReading {
  value: number;
  timestamp: number; // epoch ms
  source: string;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export async function requestHealthKitPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const granted = await healthKit.requestPermission();
    return granted === true;
  } catch {
    return false;
  }
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  try {
    const available = await healthKit.isAvailable();
    return available === true;
  } catch {
    return false;
  }
}

// ── Glucose data ───────────────────────────────────────────────────────────────

export async function fetchTodayGlucoseReadings(): Promise<HealthKitReading[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const readings = await healthKit.fetchTodayGlucose();
    return (readings ?? [])
      .map((r: any) => ({
        value: r.value,
        timestamp: r.timestamp,
        source: normalizeSource(r.source ?? ''),
      }))
      .filter((r: HealthKitReading) => r.value > 0);
  } catch {
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSource(source: string): string {
  const MAP: Record<string, string> = {
    dexcom: 'Dexcom',
    'com.dexcom.dexcomapp': 'Dexcom',
    freestyle: 'FreeStyle Libre',
    'com.freestylelibre.app': 'FreeStyle Libre',
    'com.freestylelibre.app.us': 'FreeStyle Libre',
    medtronic: 'Medtronic',
    'com.medtronic.diabetes': 'Medtronic',
  };

  const lower = source.toLowerCase();
  return (
    MAP[lower] ||
    Object.entries(MAP).find(([key]) => lower.includes(key))?.[1] ||
    source ||
    'CGM'
  );
}
