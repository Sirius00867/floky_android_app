import { usePathname, useRouter } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';
import { useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet, Text,
  TouchableOpacity,
  TouchableWithoutFeedback, useWindowDimensions,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';

import { TAB_CONFIG } from '@/constants/modeNavigationConfig';
import { BORDER_RADIUS, SPACING } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import type { RootState } from '@/store/store';

const SIDEBAR_W  = 220;
const SIDEBAR_SM = 56;
const DRAWER_W   = 260;
const MOBILE_BP  = 768; // px — por debajo de esto, comportamiento drawer

export default function AppTabs() {
  const C        = useAppColors();
  const router   = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  const isMobile = width < MOBILE_BP;

  const gamificationEnabled = useSelector((s: RootState) => s.settings?.gamificationEnabled ?? true);
  const currentMode = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');

  // Tabs dinámicos según el modo activo — cada modo tiene sus propias secciones
  const TABS = TAB_CONFIG[currentMode] ?? TAB_CONFIG.adolescent;
  // En adult/parent los ajustes van dentro de TABS; en adolescent se pone aparte
  const hasSettingsInTabs = TABS.some(t => t.name === 'settings');
  // Tabs de contenido (sin settings si ya está en TABS como último)
  const mainTabs = hasSettingsInTabs ? TABS.filter(t => t.name !== 'settings') : TABS;
  const settingsTab = hasSettingsInTabs ? TABS.find(t => t.name === 'settings') : null;

  // ── Estado sidebar desktop ──────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(0)).current;

  const toggleSidebar = () => {
    Animated.spring(sidebarAnim, {
      toValue: collapsed ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 14,
    }).start();
    setCollapsed(c => !c);
  };

  const sidebarWidth = sidebarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SIDEBAR_W, SIDEBAR_SM],
  });

  const labelOpacity = sidebarAnim.interpolate({
    inputRange: [0, 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Estado drawer mobile ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.spring(drawerAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  };

  const closeDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start(() => setDrawerOpen(false));
  };

  const navigate = (href: string) => {
    if (isMobile) closeDrawer();
    router.push(href as any);
  };

  const translateX = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_W, 0],
  });

  const overlayOpacity = drawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  // ── Tema ────────────────────────────────────────────────────────────────────
  const isDark      = C.scheme === 'dark';
  const sidebarBg   = isDark ? '#191919' : '#F7F7F5';
  const borderColor = isDark ? '#2F2F2F' : '#E9E9E7';
  const textMuted   = isDark ? '#787774' : '#9B9B99';
  const textActive  = isDark ? '#FFFFFF' : '#191919';

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // ── Render item de navegación (compartido) ──────────────────────────────────
  const NavItem = ({ tab, onPress }: { tab: (typeof TABS)[number]; onPress: () => void }) => {
    const focused = isActive(tab.href);
    return (
      <Pressable
        onPress={onPress}
        style={({ hovered }: any) => [
          styles.navItem,
          focused && { backgroundColor: tab.color + '18' },
          !focused && hovered && { backgroundColor: borderColor + '80' },
        ]}
      >
        {focused && <View style={[styles.activeBar, { backgroundColor: tab.color }]} />}
        <View style={[styles.emojiWrap, focused && { backgroundColor: tab.color + '22' }]}>
          <Text style={styles.navEmoji}>{tab.emoji}</Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.navLabel, { color: focused ? tab.color : textMuted }, focused && { fontWeight: '700' }]}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  const SettingsItem = () => {
    const active = isActive('/settings');
    return (
      <Pressable
        onPress={() => navigate('/settings')}
        style={({ hovered }: any) => [
          styles.navItem,
          active && { backgroundColor: textMuted + '18' },
          !active && hovered && { backgroundColor: borderColor + '80' },
        ]}
      >
        {active && <View style={[styles.activeBar, { backgroundColor: textMuted }]} />}
        <View style={[styles.emojiWrap, active && { backgroundColor: textMuted + '22' }]}>
          <Text style={styles.navEmoji}>⚙️</Text>
        </View>
        <Text numberOfLines={1} style={[styles.navLabel, { color: textMuted }]}>Ajustes</Text>
      </Pressable>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE — drawer flotante, contenido a pantalla completa
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <Tabs>
        <TabList asChild>
          <View style={styles.hiddenList}>
            {TABS.map(tab => (
              <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
                <View />
              </TabTrigger>
            ))}
            {!hasSettingsInTabs && (
              <TabTrigger name="settings" href="/settings" asChild>
                <View />
              </TabTrigger>
            )}
          </View>
        </TabList>

        {/* Contenido a pantalla completa */}
        <TabSlot style={{ flex: 1 }} />

        {/* Botón hamburguesa flotante */}
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: isDark ? 'rgba(25,25,25,0.92)' : 'rgba(255,255,255,0.92)' }]}
          onPress={openDrawer}
          activeOpacity={0.8}
          accessibilityLabel="Abrir menú de navegación"
          accessibilityRole="button"
        >
          <Text style={[styles.menuBtnText, { color: textActive }]}>floky</Text>
          <Text style={[styles.menuBtnIcon, { color: textMuted }]}>☰</Text>
        </TouchableOpacity>

        {/* Overlay */}
        {drawerOpen && (
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
          </TouchableWithoutFeedback>
        )}

        {/* Drawer deslizante */}
        {drawerOpen && (
          <Animated.View
            style={[
              styles.drawer,
              { backgroundColor: sidebarBg, borderRightColor: borderColor, transform: [{ translateX }] },
            ]}
          >
            {/* Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: borderColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.appName, { color: textActive }]}>floky</Text>
                <Text style={[styles.appSub, { color: textMuted }]}>Tu espacio</Text>
              </View>
              <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={[styles.closeIcon, { color: textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Nav — secciones del modo activo */}
            <View style={styles.navList}>
              {mainTabs.map(tab => (
                <NavItem key={tab.name} tab={tab} onPress={() => navigate(tab.href)} />
              ))}
            </View>

            {/* Footer */}
            <View style={[styles.sidebarBottom, { borderTopColor: borderColor }]}>
              {gamificationEnabled && currentMode === 'adolescent' && (
                <Text style={[styles.bottomHint, { color: textMuted }]}>🎮 Gamificación activa</Text>
              )}
              {settingsTab
                ? <NavItem tab={settingsTab} onPress={() => navigate(settingsTab.href)} />
                : <SettingsItem />
              }
            </View>
          </Animated.View>
        )}
      </Tabs>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP — sidebar fijo colapsable (comportamiento original)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Tabs>
      <TabList asChild>
        <View style={styles.hiddenList}>
          {TABS.map(tab => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href as any} asChild>
              <View />
            </TabTrigger>
          ))}
          {!hasSettingsInTabs && (
            <TabTrigger name="settings" href="/settings" asChild>
              <View />
            </TabTrigger>
          )}
        </View>
      </TabList>

      {/* Contenido desplazado según ancho de sidebar */}
      <Animated.View style={{ flex: 1, paddingLeft: sidebarWidth }}>
        <TabSlot style={{ flex: 1 }} />
      </Animated.View>

      {/* Sidebar visual */}
      <Animated.View
        style={[
          styles.sidebar,
          { width: sidebarWidth, backgroundColor: sidebarBg, borderRightColor: borderColor },
        ]}
      >
        {/* Header */}
        <View style={[styles.sidebarHeader, { borderBottomColor: borderColor }]}>
          <Animated.View style={{ opacity: labelOpacity, overflow: 'hidden', flex: 1 }}>
            <Text style={[styles.appName, { color: textActive }]}>floky</Text>
            <Text style={[styles.appSub, { color: textMuted }]}>Tu espacio</Text>
          </Animated.View>
          <TouchableOpacity onPress={toggleSidebar} style={styles.collapseBtn} activeOpacity={0.7}>
            <Text style={[styles.collapseIcon, { color: textMuted }]}>
              {collapsed ? '›' : '‹'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nav items — específicos del modo activo */}
        <View style={styles.navList}>
          {mainTabs.map(tab => {
            const focused = isActive(tab.href);
            return (
              <Pressable
                key={tab.name}
                onPress={() => router.push(tab.href as any)}
                style={({ hovered }: any) => [
                  styles.navItem,
                  focused && { backgroundColor: tab.color + '18' },
                  !focused && hovered && { backgroundColor: borderColor + '80' },
                ]}
              >
                {focused && <View style={[styles.activeBar, { backgroundColor: tab.color }]} />}
                <View style={[styles.emojiWrap, focused && { backgroundColor: tab.color + '22' }]}>
                  <Text style={styles.navEmoji}>{tab.emoji}</Text>
                </View>
                <Animated.Text
                  numberOfLines={1}
                  style={[styles.navLabel, { color: focused ? tab.color : textMuted, opacity: labelOpacity }, focused && { fontWeight: '700' }]}
                >
                  {tab.label}
                </Animated.Text>
              </Pressable>
            );
          })}
        </View>

        {/* Footer */}
        <View style={[styles.sidebarBottom, { borderTopColor: borderColor }]}>
          {gamificationEnabled && currentMode === 'adolescent' && (
            <Animated.Text
              numberOfLines={1}
              style={[styles.bottomHint, { color: textMuted, opacity: labelOpacity }]}
            >
              🎮 Gamificación activa
            </Animated.Text>
          )}
          {settingsTab ? (
            <Pressable
              onPress={() => router.push(settingsTab.href as any)}
              style={({ hovered }: any) => [
                styles.navItem,
                isActive(settingsTab.href) && { backgroundColor: settingsTab.color + '18' },
                !isActive(settingsTab.href) && hovered && { backgroundColor: borderColor + '80' },
              ]}
            >
              {isActive(settingsTab.href) && <View style={[styles.activeBar, { backgroundColor: settingsTab.color }]} />}
              <View style={[styles.emojiWrap, isActive(settingsTab.href) && { backgroundColor: settingsTab.color + '22' }]}>
                <Text style={styles.navEmoji}>{settingsTab.emoji}</Text>
              </View>
              <Animated.Text numberOfLines={1} style={[styles.navLabel, { color: settingsTab.color, opacity: labelOpacity }]}>
                {settingsTab.label}
              </Animated.Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/settings' as any)}
              style={({ hovered }: any) => [
                styles.navItem,
                isActive('/settings') && { backgroundColor: textMuted + '18' },
                !isActive('/settings') && hovered && { backgroundColor: borderColor + '80' },
              ]}
            >
              {isActive('/settings') && <View style={[styles.activeBar, { backgroundColor: textMuted }]} />}
              <View style={[styles.emojiWrap, isActive('/settings') && { backgroundColor: textMuted + '22' }]}>
                <Text style={styles.navEmoji}>⚙️</Text>
              </View>
              <Animated.Text numberOfLines={1} style={[styles.navLabel, { color: textMuted, opacity: labelOpacity }]}>
                Ajustes
              </Animated.Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  hiddenList: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },

  // ── Sidebar desktop ──────────────────────────────────────────────────────
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
    borderRightWidth: 1,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
    minHeight: 72,
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  collapseIcon: {
    fontSize: 22,
    lineHeight: 26,
  },

  // ── Drawer mobile ────────────────────────────────────────────────────────
  menuBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 100,
    maxWidth: 110,
  },
  menuBtnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuBtnIcon: {
    fontSize: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: 56,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    gap: SPACING.sm,
    minHeight: 100,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
  },

  // ── Compartidos ──────────────────────────────────────────────────────────
  appName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  appSub: {
    fontSize: 11,
    marginTop: 1,
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
    fontSize: 14,
    flex: 1,
    overflow: 'hidden',
  },
  sidebarBottom: {
    borderTopWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    gap: 4,
  },
  bottomHint: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
});
