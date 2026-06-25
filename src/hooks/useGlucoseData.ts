/**
 * useGlucoseData — hook compartido para carga de lecturas CGM.
 *
 * Centraliza toda la lógica de sincronización que antes vivía solo
 * en AdolescentHealthScreen: Nightscout, LibreLink, Dexcom Share,
 * HealthKit, Tidepool y Health Connect.
 *
 * Los 3 modos (adolescente, adulto, padres) llaman este hook y reciben
 * exactamente los mismos datos.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { bulkSetCgmReadings } from '@/store/slices/healthSlice';
import { setDexcomLinked } from '@/store/slices/settingsSlice';
import { fetchTodayGlucoseReadings } from '@/services/healthConnectService';
import { isConnected, loginWithDexcom, fetchTodayEGV, clearDexcomTokens } from '@/services/dexcomService';
import {
  fetchNightscoutEntries,
  fetchNightscoutDeviceStatus,
  type NightscoutDeviceStatus,
} from '@/services/nightscoutService';
import {
  fetchLibreLinkOfficialReadings,
  type LibreLinkReading,
} from '@/services/libreLinkOfficialService';
import { fetchDexcomShareReadings, isDexcomShareConnected } from '@/services/dexcomShareService';
import {
  fetchTodayGlucoseReadings as fetchHealthKitReadings,
  isHealthKitAvailable,
} from '@/services/healthKitService';
import { fetchTidepoolReadings } from '@/services/tidepoolService';
import type { RootState } from '@/store/store';
import type { GlucoseReading } from '@/components/shared/GlucoseChart';

export interface UseGlucoseDataReturn {
  /** Todas las lecturas (manuales + CGM externas) ordenadas por timestamp */
  allReadings: GlucoseReading[];
  /** Solo lecturas CGM externas (para ServicesHubCard y estado de sync) */
  cgmReadings: GlucoseReading[];
  deviceStatus: NightscoutDeviceStatus;
  nsLastTrend: string | undefined;
  isSyncing: boolean;
  lastSynced: Date | null;
  dexcomLinked: boolean;
  refreshAll: () => Promise<void>;
  handleDexcomConnect: () => Promise<boolean>;
  handleDexcomDisconnect: () => Promise<void>;
}

export function useGlucoseData(): UseGlucoseDataReturn {
  const dispatch = useDispatch();

  const readings          = useSelector((s: RootState) => s.health.glucoseReadings);
  const nightscoutUrl     = useSelector((s: RootState) => s.settings?.nightscoutUrl ?? '');
  const nightscoutSecret  = useSelector((s: RootState) => s.settings?.nightscoutApiSecret ?? '');
  const libreLinkUpEmail  = useSelector((s: RootState) => s.settings?.libreLinkUpEmail ?? '');
  const dexcomShareUser   = useSelector((s: RootState) => s.settings?.dexcomShareUsername ?? '');
  const tidepoolEmail     = useSelector((s: RootState) => s.settings?.tidepoolEmail ?? '');
  // dexcomLinked persiste en Redux para que no se pierda entre remounts
  const dexcomLinked      = useSelector((s: RootState) => s.settings?.dexcomLinked ?? false);

  const [cgmReadings,  setCgmReadings]  = useState<GlucoseReading[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<NightscoutDeviceStatus>({});
  const [nsLastTrend,  setNsLastTrend]  = useState<string | undefined>();
  const [isSyncing,    setIsSyncing]    = useState(false);
  const [lastSynced,   setLastSynced]   = useState<Date | null>(null);

  const loadNightscoutData = useCallback(async () => {
    if (!nightscoutUrl || !nightscoutSecret) return;
    try {
      const [entries, status] = await Promise.all([
        fetchNightscoutEntries(nightscoutUrl, nightscoutSecret),
        fetchNightscoutDeviceStatus(nightscoutUrl, nightscoutSecret),
      ]);
      if (entries.length > 0) {
        const mapped: GlucoseReading[] = entries.map(e => ({
          value:     e.sgv,
          timestamp: new Date(e.date).toISOString(),
          source:    'Nightscout',
        }));
        setCgmReadings(prev => [...prev.filter(r => r.source !== 'Nightscout'), ...mapped]);
        dispatch(bulkSetCgmReadings({ source: 'Nightscout', readings: mapped }));
        setNsLastTrend(entries[0]?.direction);
      }
      setDeviceStatus(status);
    } catch { /* silencioso */ }
  }, [nightscoutUrl, nightscoutSecret, dispatch]);

  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Health Connect (Android)
      try {
        const hcData = await fetchTodayGlucoseReadings();
        setCgmReadings(hcData.map(r => ({
          value:     r.value,
          timestamp: new Date(r.timestamp).toISOString(),
          source:    `CGM (${r.source})`,
        })));
      } catch { /* no disponible en web */ }

      // Dexcom OAuth
      const linked = await isConnected();
      dispatch(setDexcomLinked(linked));
      if (linked) {
        try {
          const egvs = await fetchTodayEGV();
          const mapped: GlucoseReading[] = egvs.map(r => ({
            value:     r.value,
            timestamp: new Date(r.systemTime).toISOString(),
            source:    'Dexcom',
          }));
          setCgmReadings(prev => [...prev.filter(r => !r.source.startsWith('Dexcom')), ...mapped]);
        } catch { /* silencioso */ }
      }

      // Nightscout
      await loadNightscoutData();

      // LibreLink
      if (libreLinkUpEmail) {
        try {
          const libReadings = await fetchLibreLinkOfficialReadings();
          if (libReadings.length > 0) {
            const mapped: GlucoseReading[] = libReadings.map((r: LibreLinkReading) => ({
              value:     r.sgv,
              timestamp: new Date(r.timestamp).toISOString(),
              source:    'FreeStyle Libre',
            }));
            setCgmReadings(prev => [...prev.filter(r => !r.source.includes('FreeStyle')), ...mapped]);
            dispatch(bulkSetCgmReadings({ source: 'FreeStyle Libre', readings: mapped }));
          }
        } catch { /* silencioso */ }
      }

      // Dexcom Share
      if (dexcomShareUser) {
        try {
          const shareReadings = await fetchDexcomShareReadings();
          if (shareReadings.length > 0) {
            const mapped: GlucoseReading[] = shareReadings.map(r => ({
              value:     r.value,
              timestamp: new Date(r.timestamp).toISOString(),
              source:    'Dexcom Share',
            }));
            setCgmReadings(prev => [...prev.filter(r => r.source !== 'Dexcom Share'), ...mapped]);
            dispatch(bulkSetCgmReadings({ source: 'Dexcom Share', readings: mapped }));
          }
        } catch { /* silencioso */ }
      }

      // HealthKit (iOS)
      try {
        const hkAvailable = await isHealthKitAvailable();
        if (hkAvailable) {
          const hkReadings = await fetchHealthKitReadings();
          if (hkReadings.length > 0) {
            const mapped: GlucoseReading[] = hkReadings.map(r => ({
              value:     r.value,
              timestamp: new Date(r.timestamp).toISOString(),
              source:    `HealthKit (${r.source})`,
            }));
            setCgmReadings(prev => [...prev.filter(r => !r.source.includes('HealthKit')), ...mapped]);
          }
        }
      } catch { /* silencioso */ }

      // Tidepool
      if (tidepoolEmail) {
        try {
          const tpReadings = await fetchTidepoolReadings();
          if (tpReadings.length > 0) {
            const mapped: GlucoseReading[] = tpReadings.map(r => ({
              value:     r.sgv,
              timestamp: new Date(r.timestamp).toISOString(),
              source:    r.source,
            }));
            setCgmReadings(prev => [...prev.filter(r => !r.source.includes('Tidepool')), ...mapped]);
          }
        } catch { /* silencioso */ }
      }

      setLastSynced(new Date());
    } finally {
      setIsSyncing(false);
    }
  }, [nightscoutUrl, nightscoutSecret, libreLinkUpEmail, dexcomShareUser, tidepoolEmail,
      loadNightscoutData, dispatch]);

  // Carga inicial + polling cada 5 min
  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Polling rápido de Nightscout cada 60 s
  useEffect(() => {
    if (!nightscoutUrl || !nightscoutSecret) return;
    const interval = setInterval(loadNightscoutData, 60 * 1000);
    return () => clearInterval(interval);
  }, [nightscoutUrl, nightscoutSecret, loadNightscoutData]);

  const handleDexcomConnect = useCallback(async (): Promise<boolean> => {
    const ok = await loginWithDexcom();
    if (ok) {
      dispatch(setDexcomLinked(true));
      await refreshAll();
    }
    return ok;
  }, [refreshAll, dispatch]);

  const handleDexcomDisconnect = useCallback(async () => {
    await clearDexcomTokens();
    dispatch(setDexcomLinked(false));
    setCgmReadings(prev => prev.filter(r => r.source !== 'Dexcom'));
  }, [dispatch]);

  const allReadings = [...readings, ...cgmReadings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return {
    allReadings,
    cgmReadings,
    deviceStatus,
    nsLastTrend,
    isSyncing,
    lastSynced,
    dexcomLinked,
    refreshAll,
    handleDexcomConnect,
    handleDexcomDisconnect,
  };
}
