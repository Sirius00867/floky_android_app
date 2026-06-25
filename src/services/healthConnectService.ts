import { Platform } from 'react-native';

// react-native-health-connect only works on Android native builds
// On web/iOS we return empty data gracefully
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HC: any = null;

async function getHC(): Promise<any> {
  if (Platform.OS !== 'android') return null;
  if (!HC) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    try { HC = require('react-native-health-connect'); } catch { HC = null; }
  }
  return HC;
}

export interface CGMReading {
  value: number;       // mg/dL
  time: string;        // HH:MM
  timestamp: number;   // epoch ms
  source: string;      // app name (e.g. "Dexcom", "LibreLink")
}

export async function isHealthConnectAvailable(): Promise<boolean> {
  const hc = await getHC();
  if (!hc) return false;
  try {
    const result = await hc.getSdkStatus();
    return result === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
  } catch {
    return false;
  }
}

export async function requestGlucosePermission(): Promise<boolean> {
  const hc = await getHC();
  if (!hc) return false;
  try {
    const granted = await hc.requestPermission([
      { accessType: 'read', recordType: 'BloodGlucose' },
    ]);
    return granted.some((p: any) => p.recordType === 'BloodGlucose' && p.accessType === 'read');
  } catch {
    return false;
  }
}

export async function fetchTodayGlucoseReadings(): Promise<CGMReading[]> {
  const hc = await getHC();
  if (!hc) return [];

  const available = await isHealthConnectAvailable();
  if (!available) return [];

  const hasPermission = await requestGlucosePermission();
  if (!hasPermission) return [];

  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const records = await hc.readRecords('BloodGlucose', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      },
    });

    return records.records.map((r: any) => {
      const date = new Date(r.time);
      const hh = date.getHours().toString().padStart(2, '0');
      const mm = date.getMinutes().toString().padStart(2, '0');
      // Health Connect stores glucose in mmol/L; convert to mg/dL
      const mgdl = Math.round(r.level.inMillimolesPerLiter * 18.0182);
      return {
        value: mgdl,
        time: `${hh}:${mm}`,
        timestamp: date.getTime(),
        source: normalizeSource(r.metadata?.dataOrigin ?? ''),
      };
    });
  } catch {
    return [];
  }
}

function normalizeSource(packageName: string): string {
  if (!packageName) return 'CGM';
  const p = packageName.toLowerCase();
  if (p.includes('androidaps') || p.includes('nightscout')) return 'AAPS';
  if (p.includes('libre') || p.includes('abbott'))          return 'Libre';
  if (p.includes('dexcom'))                                  return 'Dexcom';
  if (p.includes('mysugr') || p.includes('roche'))          return 'mySugr';
  if (p.includes('contour') || p.includes('bayer'))         return 'Contour';
  if (p.includes('accu') || p.includes('insight'))          return 'Accu-Chek';
  // Fallback: use last segment of package name, capitalised
  const parts = packageName.split('.');
  const last = parts[parts.length - 1];
  return last.charAt(0).toUpperCase() + last.slice(1);
}
