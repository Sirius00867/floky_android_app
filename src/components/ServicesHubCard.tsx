import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { DyslexiaText } from '@/components/shared/DyslexiaText';
import { useAppColors } from '@/hooks/useAppColors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import type { RootState } from '@/store/store';

interface ServiceRow {
  id:          string;
  name:        string;
  icon:        string;
  description: string;
  connected:   boolean;
  lastValue?:  string;
  lastTime?:   string;
  settingsTab: string; // ancla dentro de /settings
}

interface Props {
  /** Lecturas CGM en vivo agrupadas por fuente — { 'Nightscout': 142, ... } */
  liveValues?: Record<string, { value: number; time: string }>;
  isSyncing?:  boolean;
  lastSynced?: Date | null;
}

export function ServicesHubCard({ liveValues = {}, isSyncing = false, lastSynced }: Props) {
  const C      = useAppColors();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const nightscoutUrl      = useSelector((s: RootState) => s.settings?.nightscoutUrl ?? '');
  const nightscoutSecret   = useSelector((s: RootState) => s.settings?.nightscoutApiSecret ?? '');
  const libreLinkEmail     = useSelector((s: RootState) => s.settings?.libreLinkUpEmail ?? '');
  const tidepoolEmail      = useSelector((s: RootState) => s.settings?.tidepoolEmail ?? '');
  const dexcomShareUser    = useSelector((s: RootState) => s.settings?.dexcomShareUsername ?? '');
  const dexcomLinked       = useSelector((s: RootState) => s.settings?.dexcomLinked ?? false);

  const nightscoutOk = !!(nightscoutUrl && nightscoutSecret);

  const services: ServiceRow[] = [
    {
      id:          'nightscout',
      name:        'Nightscout',
      icon:        '🌐',
      description: 'CGM · Bombas · Histórico completo',
      connected:   nightscoutOk,
      lastValue:   liveValues['Nightscout'] ? `${liveValues['Nightscout'].value} mg/dL` : undefined,
      lastTime:    liveValues['Nightscout']?.time,
      settingsTab: 'nightscout',
    },
    {
      id:          'libre',
      name:        'FreeStyle LibreLink',
      icon:        '💚',
      description: 'Libre 1 / 2 / 3 vía LibreView',
      connected:   !!libreLinkEmail,
      lastValue:   liveValues['FreeStyle Libre'] ? `${liveValues['FreeStyle Libre'].value} mg/dL` : undefined,
      lastTime:    liveValues['FreeStyle Libre']?.time,
      settingsTab: 'libre',
    },
    {
      id:          'dexcom',
      name:        'Dexcom API',
      icon:        '📡',
      description: 'G5 · G6 · G7 · ONE · conexión directa',
      connected:   dexcomLinked,
      lastValue:   liveValues['Dexcom'] ? `${liveValues['Dexcom'].value} mg/dL` : undefined,
      lastTime:    liveValues['Dexcom']?.time,
      settingsTab: 'dexcom',
    },
    {
      id:          'dexcomshare',
      name:        'Dexcom Share',
      icon:        '🔵',
      description: 'G5 · G6 vía Share Web Services',
      connected:   !!dexcomShareUser,
      lastValue:   liveValues['Dexcom Share'] ? `${liveValues['Dexcom Share'].value} mg/dL` : undefined,
      lastTime:    liveValues['Dexcom Share']?.time,
      settingsTab: 'dexcomshare',
    },
    {
      id:          'tidepool',
      name:        'Tidepool',
      icon:        '🌊',
      description: 'Informes clínicos y exportación',
      connected:   !!tidepoolEmail,
      lastValue:   liveValues['Tidepool'] ? `${liveValues['Tidepool'].value} mg/dL` : undefined,
      lastTime:    liveValues['Tidepool']?.time,
      settingsTab: 'tidepool',
    },
  ];

  const connectedCount = services.filter(s => s.connected).length;
  const hasAny = connectedCount > 0;

  const styles = makeStyles(C);

  const syncLabel = isSyncing
    ? '⏳ Sincronizando…'
    : lastSynced
      ? `🔄 Hace ${Math.round((Date.now() - lastSynced.getTime()) / 60000)} min`
      : '';

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconWrap, { backgroundColor: hasAny ? '#10B981' + '18' : C.cardBorder }]}>
            <DyslexiaText variant="body">🔌</DyslexiaText>
          </View>
          <View>
            <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '700' }}>
              Servicios conectados
            </DyslexiaText>
            <DyslexiaText variant="caption" color={hasAny ? '#10B981' : C.darkTertiary}>
              {hasAny ? `${connectedCount} de ${services.length} activos` : 'Ningún servicio conectado'}
            </DyslexiaText>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          {syncLabel ? (
            <DyslexiaText variant="caption" color={C.darkTertiary}>{syncLabel}</DyslexiaText>
          ) : null}
          <DyslexiaText variant="caption" color={C.darkTertiary}>{expanded ? '▲' : '▼'}</DyslexiaText>
        </View>
      </TouchableOpacity>

      {/* Lista de servicios */}
      {expanded && (
        <View style={styles.list}>
          {services.map((svc, idx) => (
            <View
              key={svc.id}
              style={[styles.row, idx < services.length - 1 && styles.rowBorder]}
            >
              {/* Icono + info */}
              <View style={styles.rowLeft}>
                <View style={[
                  styles.svcIcon,
                  { backgroundColor: svc.connected ? '#10B981' + '14' : C.cardBorder + '60' },
                ]}>
                  <DyslexiaText variant="body" style={{ fontSize: 16 }}>{svc.icon}</DyslexiaText>
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <DyslexiaText variant="small" color={C.dark} style={{ fontWeight: '600' }}>
                    {svc.name}
                  </DyslexiaText>
                  <DyslexiaText variant="caption" color={C.darkTertiary} numberOfLines={1}>
                    {svc.description}
                  </DyslexiaText>
                </View>
              </View>

              {/* Estado + acción */}
              <View style={styles.rowRight}>
                {svc.connected ? (
                  <View style={{ alignItems: 'flex-end', gap: 1 }}>
                    {svc.lastValue ? (
                      <DyslexiaText variant="small" color="#10B981" style={{ fontWeight: '700' }}>
                        {svc.lastValue}
                      </DyslexiaText>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: '#10B981' + '18', borderColor: '#10B981' + '40' }]}>
                        <DyslexiaText variant="caption" color="#10B981" style={{ fontWeight: '600' }}>✓ OK</DyslexiaText>
                      </View>
                    )}
                    {svc.lastTime ? (
                      <DyslexiaText variant="caption" color={C.darkTertiary}>{svc.lastTime}</DyslexiaText>
                    ) : null}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.badge, { backgroundColor: C.health + '12', borderColor: C.health + '35' }]}
                    onPress={() => router.push((`/settings?tab=${svc.settingsTab}`) as any)}
                    activeOpacity={0.7}
                  >
                    <DyslexiaText variant="caption" color={C.health} style={{ fontWeight: '600' }}>
                      + Conectar
                    </DyslexiaText>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {/* CTA si no hay nada conectado */}
          {!hasAny && (
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/settings?tab=nightscout' as any)}
              activeOpacity={0.8}
            >
              <DyslexiaText variant="small" color="#fff" style={{ fontWeight: '700', textAlign: 'center' }}>
                🔌 Conectar mi sensor CGM
              </DyslexiaText>
              <DyslexiaText variant="caption" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center' }}>
                Nightscout · FreeStyle Libre · Dexcom · Tidepool
              </DyslexiaText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const makeStyles = (C: ReturnType<typeof useAppColors>) => StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius:    C.cardRadius,
    borderWidth:     1,
    borderColor:     C.cardBorder,
    overflow:        'hidden',
    ...C.cardShadow,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
    flex:          1,
  },
  iconWrap: {
    width:         36,
    height:        36,
    borderRadius:  10,
    alignItems:    'center',
    justifyContent:'center',
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: SPACING.md,
    paddingVertical:   12,
    gap:            SPACING.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  rowLeft: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           SPACING.sm,
  },
  rowRight: {
    alignItems: 'flex-end',
    minWidth:   80,
  },
  svcIcon: {
    width:         34,
    height:        34,
    borderRadius:  8,
    alignItems:    'center',
    justifyContent:'center',
    flexShrink:    0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      BORDER_RADIUS.full,
    borderWidth:       1,
  },
  ctaBtn: {
    margin:           SPACING.md,
    backgroundColor:  C.health,
    borderRadius:     BORDER_RADIUS.lg,
    padding:          SPACING.md,
    gap:              4,
  },
});
