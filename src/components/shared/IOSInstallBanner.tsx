import React, { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISMISS_KEY    = 'ios_pwa_prompt_dismissed_until';
const DISMISS_DAYS   = 7;
const DISMISS_MS     = DISMISS_DAYS * 24 * 60 * 60 * 1000;

function shouldShow(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  if (!isIOS) return false;

  // Ya instalada como PWA standalone
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;
  if (isStandalone) return false;

  // Comprueba si el usuario lo descartó recientemente
  try {
    const until = localStorage.getItem(DISMISS_KEY);
    if (until && Date.now() < parseInt(until, 10)) return false;
  } catch { /* localStorage bloqueado — mostrar igualmente */ }

  return true;
}

export function IOSInstallBanner() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(120)).current;

  useEffect(() => {
    if (!shouldShow()) return;
    // Pequeño delay para no interrumpir el render inicial
    const timer = setTimeout(() => {
      setVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 120,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
      } catch { /* sin acceso a localStorage */ }
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { bottom: insets.bottom + 8, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Flecha apuntando al botón Compartir de Safari */}
      <View style={styles.arrowWrap}>
        <View style={styles.arrow} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconRow}>
          <Text style={styles.appIcon}>🦆</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>¡Instala Floky en tu iPhone!</Text>
            <Text style={styles.subtitle}>Accede como app nativa, sin el navegador.</Text>
          </View>
          <TouchableOpacity onPress={dismiss} style={styles.closeBtn} accessibilityLabel="Cerrar">
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.steps}>
          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>
              Pulsa el botón{' '}
              <Text style={styles.stepBold}>Compartir</Text>
              {'  '}
              <Text style={styles.shareIcon}>⬆</Text>
              {'  '}(barra inferior de Safari)
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>
              Selecciona{' '}
              <Text style={styles.stepBold}>"Añadir a pantalla de inicio"</Text>
              {'  '}➕
            </Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>
              Pulsa <Text style={styles.stepBold}>"Añadir"</Text> — ¡listo! 🎉
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={dismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Ya lo haré más tarde</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position:        'absolute',
    left:            12,
    right:           12,
    zIndex:          9999,
    // Sombra
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -2 },
    shadowOpacity:   0.18,
    shadowRadius:    12,
    elevation:       16,
  },
  arrowWrap: {
    alignItems:     'center',
    marginBottom:   -1,
  },
  arrow: {
    width:           0,
    height:          0,
    borderLeftWidth:  10,
    borderRightWidth: 10,
    borderTopWidth:   0,
    borderBottomWidth:10,
    borderLeftColor:  'transparent',
    borderRightColor: 'transparent',
    borderBottomColor:'#1E293B',
  },
  body: {
    backgroundColor: '#1E293B',
    borderRadius:    16,
    padding:         16,
    gap:             12,
  },
  iconRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
  },
  appIcon: {
    fontSize: 32,
  },
  title: {
    color:       '#F8FAFC',
    fontSize:    15,
    fontWeight:  '700',
    lineHeight:  20,
  },
  subtitle: {
    color:       '#94A3B8',
    fontSize:    12,
    marginTop:   2,
  },
  closeBtn: {
    padding:         6,
    borderRadius:    20,
    backgroundColor: '#334155',
    alignItems:      'center',
    justifyContent:  'center',
    width:           28,
    height:          28,
  },
  closeIcon: {
    color:      '#94A3B8',
    fontSize:   13,
    fontWeight: '700',
  },
  steps: {
    gap: 8,
  },
  step: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    gap:            10,
  },
  stepNum: {
    color:           '#208AEF',
    fontWeight:      '800',
    fontSize:        14,
    width:           18,
    textAlign:       'center',
    lineHeight:      20,
  },
  stepText: {
    color:      '#CBD5E1',
    fontSize:   13,
    lineHeight: 20,
    flex:       1,
  },
  stepBold: {
    color:      '#F1F5F9',
    fontWeight: '700',
  },
  shareIcon: {
    fontSize: 13,
  },
  dismissBtn: {
    alignItems:      'center',
    paddingVertical: 6,
  },
  dismissText: {
    color:      '#64748B',
    fontSize:   12,
    textDecorationLine: 'underline' as const,
  },
});
