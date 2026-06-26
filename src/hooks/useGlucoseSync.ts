import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '@/store/store';
import { setLiveCgmReading, setCgmSyncing } from '@/store/slices/healthSlice';
import { fetchNightscoutEntries, loadNightscoutConfig } from '@/services/nightscoutService';
import { fetchLibreLinkUpCurrent } from '@/services/libreLinkUpService';
import { fetchDexcomShareReadings } from '@/services/dexcomShareService';

const SYNC_INTERVAL_MS = 60 * 1000; // 1 minuto — detecta nuevas lecturas CGM en <1 min

// Convierte dirección Nightscout a flecha unicode
function trendArrow(direction?: string): string {
  const map: Record<string, string> = {
    DoubleUp:        '⬆⬆',
    SingleUp:        '⬆',
    FortyFiveUp:     '↗',
    Flat:            '→',
    FortyFiveDown:   '↘',
    SingleDown:      '⬇',
    DoubleDown:      '⬇⬇',
    'NOT COMPUTABLE': '?',
    NONE:            '-',
  };
  return direction ? (map[direction] ?? '→') : '→';
}

export function useGlucoseSync() {
  const dispatch         = useDispatch();
  const nightscoutUrl    = useSelector((s: RootState) => s.settings?.nightscoutUrl ?? '');
  const nightscoutSecret = useSelector((s: RootState) => s.settings?.nightscoutApiSecret ?? '');
  const libreLinkUpEmail = useSelector((s: RootState) => s.settings?.libreLinkUpEmail ?? '');
  const dexcomShareUser  = useSelector((s: RootState) => s.settings?.dexcomShareUsername ?? '');

  // nightscoutApiSecret está blacklisted de Redux Persist — fallback desde AsyncStorage
  const [storedNsSecret, setStoredNsSecret] = useState('');
  useEffect(() => {
    loadNightscoutConfig().then(cfg => {
      if (cfg?.apiSecret) setStoredNsSecret(cfg.apiSecret);
    });
  }, []);
  const effectiveNsSecret = nightscoutSecret || storedNsSecret;

  const hasAnyService = !!(nightscoutUrl || libreLinkUpEmail || dexcomShareUser);

  const sync = useCallback(async () => {
    if (!hasAnyService) return;
    dispatch(setCgmSyncing(true));

    try {
      // Prioridad: Nightscout > LibreLinkUp > Dexcom Share
      if (nightscoutUrl && effectiveNsSecret) {
        try {
          const entries = await fetchNightscoutEntries(nightscoutUrl, effectiveNsSecret, 1);
          if (entries.length > 0) {
            const e = entries[0];
            dispatch(setLiveCgmReading({
              value:     e.sgv,
              trend:     trendArrow(e.direction),
              source:    'Nightscout',
              timestamp: new Date(e.date).toISOString(),
            }));
            return;
          }
        } catch { /* intenta siguiente servicio */ }
      }

      if (libreLinkUpEmail) {
        try {
          const r = await fetchLibreLinkUpCurrent();
          if (r) {
            dispatch(setLiveCgmReading({
              value:     r.sgv,
              source:    'FreeStyle Libre',
              timestamp: new Date(r.timestamp).toISOString(),
            }));
            return;
          }
        } catch { /* intenta siguiente */ }
      }

      if (dexcomShareUser) {
        try {
          const readings = await fetchDexcomShareReadings();
          if (readings.length > 0) {
            const r = readings[readings.length - 1];
            dispatch(setLiveCgmReading({
              value:     r.value,
              source:    'Dexcom Share',
              timestamp: new Date(r.timestamp).toISOString(),
            }));
            return;
          }
        } catch { /* sin datos */ }
      }
    } finally {
      dispatch(setCgmSyncing(false));
    }
  }, [nightscoutUrl, effectiveNsSecret, libreLinkUpEmail, dexcomShareUser, hasAnyService, dispatch]);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sync]);
}
