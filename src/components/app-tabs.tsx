import React, { useState, useRef, memo } from 'react';
import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { useRouter, usePathname } from 'expo-router';
import {
  Pressable, View, StyleSheet, Text, Animated, TouchableOpacity, TouchableWithoutFeedback,
  Modal,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';
import { TAB_CONFIG, MODE_LABELS, MODE_EMOJIS, MODE_DESCRIPTIONS } from '@/constants/modeNavigationConfig';
import { setUserMode, setPendingModeIntro } from '@/store/slices/userModeSlice';
import type { UserMode } from '@/store/slices/userModeSlice';

const DRAWER_W = 260;

const MODES: { key: UserMode; emoji: string; color: string }[] = [
  { key: 'adolescent', emoji: '🌱', color: '#10B981' },
  { key: 'adult',      emoji: '⚡', color: '#3B82F6' },
  { key: 'parent',     emoji: '🐥', color: '#8B5CF6' },
];

function AppTabs() {
  const C        = useAppColors();
  const router   = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();

  const gamificationEnabled = useSelector((s: RootState) => s.settings?.gamificationEnabled ?? true);
  const currentMode         = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  const seenModeIntros      = useSelector((s: RootState) => s.userMode?.seenModeIntros ?? []);
  const TABS = TAB_CONFIG[currentMode];
  const [open, setOpen]           = useState(false);
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setOpen(true);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  };

  const closeDrawer = () => {
    Animated.spring(anim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start(() => setOpen(false));
  };

  const navigate = (href: string) => {
    closeDrawer();
    router.push(href as any);
  };

  const handleModeChange = (mode: UserMode) => {
    setModePickerOpen(false);
    if (mode === currentMode) return;
    dispatch(setUserMode(mode));
    // Solo muestra intro si aún no se ha visto para ese modo
    if (!seenModeIntros.includes(mode)) {
      dispatch(setPendingModeIntro(mode));
    }
  };

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_W, 0],
  });

  const overlayOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const isDark      = C.scheme === 'dark';
  const drawerBg    = isDark ? '#191919' : '#F7F7F5';
  const borderColor = isDark ? '#2F2F2F' : '#E9E9E7';
  const textMuted   = isDark ? '#787774' : '#9B9B99';
  const textActive  = isDark ? '#FFFFFF' : '#191919';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Tabs>
      {/* TabList oculto — registra rutas */}
      <TabList asChild>
        <View style={styles.hidden}>
          {TABS.map(tab => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
              <View />
            </TabTrigger>
          ))}
          {currentMode === 'adolescent' && (
            <TabTrigger name="settings" href="/settings" asChild>
              <View />
            </TabTrigger>
          )}
        </View>
      </TabList>

      {/* Contenido a pantalla completa */}
      <TabSlot style={{ flex: 1 }} />

      {/* Botón flotante "floky" — top left, respeta safe area */}
      <TouchableOpacity
        style={[styles.menuBtn, { top: insets.top + 8 }]}
        onPress={openDrawer}
        activeOpacity={0.8}
        accessibilityLabel="Abrir menú de navegación"
        accessibilityRole="button"
      >
        <Text style={styles.menuBtnText} numberOfLines={1}>floky</Text>
        <Text style={styles.menuBtnIcon}>☰</Text>
      </TouchableOpacity>

      {/* Overlay oscuro */}
      {open && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>
      )}

      {/* Drawer deslizante */}
      {open && (
        <Animated.View
          style={[
            styles.drawer,
            { backgroundColor: drawerBg, borderRightColor: borderColor, transform: [{ translateX }] },
          ]}
        >
          {/* Header del drawer */}
          <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
            <Text style={[styles.drawerTitle, { color: textActive }]}>floky</Text>
            <Text style={[styles.drawerSub, { color: textMuted }]}>
              {MODE_EMOJIS[currentMode]} {MODE_LABELS[currentMode]}
            </Text>
            <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={[styles.closeIcon, { color: textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Nav items */}
          <View style={styles.navList}>
            {TABS.map(tab => {
              const focused = isActive(tab.href);
              return (
                <Pressable
                  key={tab.name}
                  onPress={() => navigate(tab.href)}
                  style={[
                    styles.navItem,
                    focused && { backgroundColor: tab.color + '18' },
                  ]}
                >
                  {focused && <View style={[styles.activeBar, { backgroundColor: tab.color }]} />}
                  <View style={[styles.emojiWrap, focused && { backgroundColor: tab.color + '22' }]}>
                    <Text style={styles.navEmoji}>{tab.emoji}</Text>
                  </View>
                  <Text style={[styles.navLabel, { color: focused ? tab.color : textMuted, fontWeight: focused ? '700' : '400' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={[styles.drawerFooter, { borderTopColor: borderColor, paddingBottom: insets.bottom + SPACING.md }]}>
            {gamificationEnabled && (
              <Text style={[styles.gamifHint, { color: textMuted }]}>🎮 Gamificación activa</Text>
            )}

            {/* Cambiar modo — acceso directo */}
            <Pressable
              onPress={() => { closeDrawer(); setTimeout(() => setModePickerOpen(true), 300); }}
              style={styles.navItem}
            >
              <View style={styles.emojiWrap}>
                <Text style={styles.navEmoji}>🔄</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navLabel, { color: textMuted }]}>Cambiar modo</Text>
                <Text style={{ fontSize: 11, color: textMuted, opacity: 0.7, marginTop: -2 }}>
                  {MODE_EMOJIS[currentMode]} {MODE_LABELS[currentMode]}
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                closeDrawer();
                router.push('/settings' as any);
              }}
              style={[styles.navItem, isActive('/settings') && { backgroundColor: textMuted + '18' }]}
            >
              {isActive('/settings') && <View style={[styles.activeBar, { backgroundColor: textMuted }]} />}
              <View style={[styles.emojiWrap, isActive('/settings') && { backgroundColor: textMuted + '22' }]}>
                <Text style={styles.navEmoji}>⚙️</Text>
              </View>
              <Text style={[styles.navLabel, { color: textMuted }]}>Ajustes</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Modal selector de modo */}
      <Modal
        visible={modePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModePickerOpen(false)}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={() => setModePickerOpen(false)}>
          <View style={styles.modePickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modePickerSheet, {
                backgroundColor: isDark ? '#191919' : '#FFFFFF',
                borderColor: borderColor,
                paddingBottom: insets.bottom + SPACING.md,
              }]}>
                <Text style={[styles.modePickerTitle, { color: textActive }]}>Selecciona un modo</Text>
                <Text style={[styles.modePickerSub, { color: textMuted }]}>
                  Puedes cambiar de modo en cualquier momento desde el menú.
                </Text>
                {MODES.map(m => {
                  const isSelected = currentMode === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => handleModeChange(m.key)}
                      style={[
                        styles.modeOption,
                        { borderColor: isSelected ? m.color : borderColor },
                        isSelected && { backgroundColor: m.color + '12' },
                      ]}
                    >
                      <View style={[styles.modeOptionIcon, { backgroundColor: m.color + '18' }]}>
                        <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modeOptionLabel, {
                          color: isSelected ? m.color : textActive,
                          fontWeight: isSelected ? '700' : '500',
                        }]}>
                          {MODE_LABELS[m.key]}
                        </Text>
                        {MODE_DESCRIPTIONS[m.key] ? (
                          <Text style={[styles.modeOptionDesc, { color: textMuted }]} numberOfLines={2}>
                            {MODE_DESCRIPTIONS[m.key]}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Text style={{ color: m.color, fontSize: 18, fontWeight: '700' }}>✓</Text>
                      )}
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => setModePickerOpen(false)}
                  style={[styles.modeCancelBtn, { borderColor: borderColor }]}
                >
                  <Text style={[styles.modeCancelText, { color: textMuted }]}>Cancelar</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </Tabs>
  );
}

export default memo(AppTabs);

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0,
  },
  menuBtn: {
    position: 'absolute',
    // top se inyecta dinámicamente como [styles.menuBtn, { top: insets.top + 8 }]
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 200,
    maxWidth: 110,
  },
  menuBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#191919',
    letterSpacing: -0.3,
  },
  menuBtnIcon: {
    fontSize: 16,
    color: '#9B9B99',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000',
    zIndex: 300,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_W,
    zIndex: 400,
    borderRightWidth: 1,
    flexDirection: 'column',
  },
  drawerHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    gap: 2,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  drawerSub: {
    fontSize: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: SPACING.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
  },
  navList: {
    flex: 1,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    gap: 2,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: SPACING.sm,
    minHeight: 44,
    overflow: 'hidden',
    position: 'relative',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navEmoji: { fontSize: 18 },
  navLabel: {
    fontSize: 15,
    flex: 1,
  },
  drawerFooter: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    gap: 4,
  },
  gamifHint: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },

  // ── Modal selector de modo ──
  modePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modePickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  modePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  modePickerSub: {
    fontSize: 13,
    marginBottom: SPACING.sm,
    lineHeight: 18,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.sm,
    minHeight: 64,
  },
  modeOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modeOptionLabel: {
    fontSize: 16,
  },
  modeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  modeCancelBtn: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  modeCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
