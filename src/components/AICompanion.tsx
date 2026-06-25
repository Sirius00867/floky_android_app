import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Easing, Vibration, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useSelector, useDispatch, useStore } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAppColors } from '@/hooks/useAppColors';
import { setGroqApiKey } from '@/store/slices/settingsSlice';
import type { RootState } from '@/store/store';
import { ConnectedAvatarController } from '@/components/avatar/AvatarController';
import { BloodGlucoseStatus, calcBloodGlucoseStatus } from '@/utils/avatarTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mood = 'happy' | 'ignored' | 'angry' | 'alert';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  mood?: Mood;
}

const MOOD_LABEL: Record<Mood, string> = {
  happy:   '😊',
  ignored: '😑',
  angry:   '😠',
  alert:   '🚨',
};


// ─── Drawn Face ───────────────────────────────────────────────────────────────

function SunflowerFace({ mood, faceR }: { mood: Mood; faceR: number }) {
  const eyeSquishY  = useRef(new Animated.Value(0.82)).current;
  const eyeScaleAll = useRef(new Animated.Value(1)).current;
  const browRotL    = useRef(new Animated.Value(0)).current;
  const browRotR    = useRef(new Animated.Value(0)).current;
  const browOffsetY = useRef(new Animated.Value(0)).current;
  const smileOp     = useRef(new Animated.Value(1)).current;
  const frownOp     = useRef(new Animated.Value(0)).current;
  const lineOp      = useRef(new Animated.Value(0)).current;
  const oMouthOp    = useRef(new Animated.Value(0)).current;

  // Track resting eye value so blink can return to it after each mood change
  const restingEyeY  = useRef(0.82);
  const blinkAlive   = useRef(true);
  const blinkTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertEyeLoop = useRef<Animated.CompositeAnimation | null>(null);

  const sp = useCallback((v: Animated.Value, t: number) =>
    Animated.spring(v, { toValue: t, friction: 7, tension: 200, useNativeDriver: true }), []);

  // ── Blink loop (runs regardless of mood) ──
  const scheduleBlink = useCallback(() => {
    if (!blinkAlive.current) return;
    blinkTimer.current = setTimeout(() => {
      if (!blinkAlive.current) return;
      Animated.sequence([
        Animated.timing(eyeSquishY, { toValue: 0.04, duration: 65,  useNativeDriver: true }),
        Animated.timing(eyeSquishY, { toValue: restingEyeY.current, duration: 110, useNativeDriver: true }),
      ]).start(() => scheduleBlink());
    }, 2200 + Math.random() * 2800);
  }, []);

  useEffect(() => {
    blinkAlive.current = true;
    scheduleBlink();
    return () => {
      blinkAlive.current = false;
      if (blinkTimer.current) clearTimeout(blinkTimer.current);
    };
  }, []);

  // ── Mood transitions ──
  useEffect(() => {
    alertEyeLoop.current?.stop();

    const TARGETS: Record<Mood, {
      eyeY: number; eyeS: number;
      brl: number; brr: number; bry: number;
      sOp: number; fOp: number; lOp: number; oOp: number;
    }> = {
      happy:   { eyeY: 0.82, eyeS: 1,   brl:   0, brr:   0, bry:  0, sOp: 1, fOp: 0, lOp: 0, oOp: 0 },
      ignored: { eyeY: 0.14, eyeS: 1,   brl:   0, brr:   0, bry:  2, sOp: 0, fOp: 0, lOp: 1, oOp: 0 },
      angry:   { eyeY: 0.58, eyeS: 1,   brl: -30, brr:  30, bry: -2, sOp: 0, fOp: 1, lOp: 0, oOp: 0 },
      alert:   { eyeY: 1.35, eyeS: 1.2, brl:  18, brr: -18, bry: -3, sOp: 0, fOp: 0, lOp: 0, oOp: 1 },
    };
    const t = TARGETS[mood];
    restingEyeY.current = t.eyeY;

    Animated.parallel([
      sp(eyeSquishY,  t.eyeY), sp(eyeScaleAll, t.eyeS),
      sp(browRotL,    t.brl),  sp(browRotR,    t.brr),  sp(browOffsetY, t.bry),
      sp(smileOp,     t.sOp),  sp(frownOp,     t.fOp),  sp(lineOp,      t.lOp),  sp(oMouthOp, t.oOp),
    ]).start();

    // Alert: eyes pulse open/closed in sync with body
    if (mood === 'alert') {
      alertEyeLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(eyeScaleAll, { toValue: 1.4,  duration: 210, useNativeDriver: true }),
          Animated.timing(eyeScaleAll, { toValue: 1.05, duration: 210, useNativeDriver: true }),
        ])
      );
      alertEyeLoop.current.start();
    }

    return () => alertEyeLoop.current?.stop();
  }, [mood]);

  const faceColor = mood === 'alert' ? '#fff' : '#5D4037';

  // Proportions relative to faceR
  const eyeR      = faceR * 0.21;
  const eyeGap    = faceR * 0.36;
  const eyeTopY   = faceR * 0.08;
  const browW     = faceR * 0.44;
  const browH     = Math.max(1.5, faceR * 0.1);
  const browGap   = faceR * 0.33;
  const browAbove = faceR * 0.45;
  const mouthW    = faceR * 0.72;
  const mouthH    = mouthW * 0.4;
  const mouthBW   = Math.max(2, faceR * 0.12);
  const mouthTopY = faceR * 0.22;

  const browLRot = browRotL.interpolate({ inputRange: [-35, 35], outputRange: ['-35deg', '35deg'] });
  const browRRot = browRotR.interpolate({ inputRange: [-35, 35], outputRange: ['-35deg', '35deg'] });

  const cx = faceR;
  const cy = faceR;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: faceR * 2, height: faceR * 2, left: 0, top: 0 }}>

      {/* ── LEFT eyebrow ── */}
      <Animated.View style={{
        position: 'absolute',
        width: browW, height: browH,
        borderRadius: browH,
        backgroundColor: faceColor,
        left: cx - browGap - browW,
        top:  cy - browAbove - browH / 2,
        transform: [{ translateY: browOffsetY }, { rotate: browLRot }],
      }} />

      {/* ── RIGHT eyebrow ── */}
      <Animated.View style={{
        position: 'absolute',
        width: browW, height: browH,
        borderRadius: browH,
        backgroundColor: faceColor,
        left: cx + browGap,
        top:  cy - browAbove - browH / 2,
        transform: [{ translateY: browOffsetY }, { rotate: browRRot }],
      }} />

      {/* ── LEFT eye ── */}
      <Animated.View style={{
        position: 'absolute',
        width: eyeR * 2, height: eyeR * 2,
        borderRadius: eyeR,
        backgroundColor: faceColor,
        left: cx - eyeGap - eyeR,
        top:  cy - eyeTopY - eyeR,
        transform: [{ scaleY: eyeSquishY }, { scale: eyeScaleAll }],
      }} />

      {/* ── RIGHT eye ── */}
      <Animated.View style={{
        position: 'absolute',
        width: eyeR * 2, height: eyeR * 2,
        borderRadius: eyeR,
        backgroundColor: faceColor,
        left: cx + eyeGap - eyeR,
        top:  cy - eyeTopY - eyeR,
        transform: [{ scaleY: eyeSquishY }, { scale: eyeScaleAll }],
      }} />

      {/* ── SMILE (happy) ── curved bottom border */}
      <Animated.View style={{
        position: 'absolute',
        width: mouthW, height: mouthH,
        borderBottomWidth: mouthBW,
        borderBottomColor: faceColor,
        borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0,
        borderBottomLeftRadius: mouthW,
        borderBottomRightRadius: mouthW,
        left: cx - mouthW / 2,
        top:  cy + mouthTopY,
        opacity: smileOp,
      }} />

      {/* ── FROWN (angry) ── curved top border */}
      <Animated.View style={{
        position: 'absolute',
        width: mouthW, height: mouthH,
        borderTopWidth: mouthBW,
        borderTopColor: faceColor,
        borderBottomWidth: 0, borderLeftWidth: 0, borderRightWidth: 0,
        borderTopLeftRadius: mouthW,
        borderTopRightRadius: mouthW,
        left: cx - mouthW / 2,
        top:  cy + mouthTopY + mouthH * 0.3,
        opacity: frownOp,
      }} />

      {/* ── FLAT LINE (ignored) ── */}
      <Animated.View style={{
        position: 'absolute',
        width: mouthW * 0.6, height: Math.max(1.5, faceR * 0.09),
        borderRadius: faceR * 0.05,
        backgroundColor: faceColor,
        left: cx - mouthW * 0.3,
        top:  cy + mouthTopY + mouthH * 0.5,
        opacity: lineOp,
      }} />

      {/* ── O MOUTH (alert) ── oval open mouth */}
      <Animated.View style={{
        position: 'absolute',
        width:  mouthW * 0.48,
        height: mouthW * 0.58,
        borderRadius: mouthW * 0.24,
        borderWidth: mouthBW,
        borderColor: faceColor,
        left: cx - mouthW * 0.24,
        top:  cy + mouthTopY,
        opacity: oMouthOp,
      }} />
    </View>
  );
}

// ─── Flower companions ────────────────────────────────────────────────────────

// ── Animaciones aleatorias de bob (movimiento vertical) ──
// Cada llamada elige un comportamiento distinto y llama a `next` al terminar
function randomBob(v: Animated.Value, next: () => void) {
  const r = Math.random();
  let anim: Animated.CompositeAnimation;

  if (r < 0.30) {
    // Slow peaceful float ×2
    anim = Animated.sequence([
      Animated.timing(v, { toValue: -6, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue:  0, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: -5, duration: 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue:  0, duration: 1050, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);
  } else if (r < 0.50) {
    // Excited double bounce + settle
    anim = Animated.sequence([
      Animated.timing(v, { toValue: -12, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue:   2, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue:  -7, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue:   0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay(750),
    ]);
  } else if (r < 0.65) {
    // Still pause (se detiene un momento)
    anim = Animated.sequence([
      Animated.timing(v, { toValue: 0, duration: 300, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.delay(1100 + Math.random() * 900),
    ]);
  } else if (r < 0.78) {
    // Deep slow bob
    anim = Animated.sequence([
      Animated.timing(v, { toValue: -14, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue:   0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);
  } else if (r < 0.90) {
    // Nervous fast flutter
    anim = Animated.sequence([
      Animated.timing(v, { toValue: -4, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue:  3, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: -4, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue:  3, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue:  0, duration: 220, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.delay(500),
    ]);
  } else {
    // Yawn: very slow deep dip
    anim = Animated.sequence([
      Animated.timing(v, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue:   0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(400),
    ]);
  }

  anim.start(({ finished }) => { if (finished) next(); });
}

// ── Animaciones aleatorias de sway (balanceo lateral) ──
function randomSway(v: Animated.Value, next: () => void) {
  const r = Math.random();
  let anim: Animated.CompositeAnimation;

  if (r < 0.35) {
    // Normal gentle sway
    anim = Animated.sequence([
      Animated.timing(v, { toValue:  1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: -1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);
  } else if (r < 0.55) {
    // Curious lean — se inclina a un lado y se queda un momento
    const side = Math.random() > 0.5 ? 1.6 : -1.6;
    anim = Animated.sequence([
      Animated.timing(v, { toValue: side, duration: 700, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.delay(900 + Math.random() * 600),
      Animated.timing(v, { toValue:   0, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.delay(300),
    ]);
  } else if (r < 0.70) {
    // Fast nervous wiggle
    anim = Animated.sequence([
      Animated.timing(v, { toValue:  0.7, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: -0.7, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue:  0.7, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue: -0.7, duration: 110, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(v, { toValue:    0, duration: 200, easing: Easing.out(Easing.sin), useNativeDriver: true }),
      Animated.delay(800),
    ]);
  } else if (r < 0.83) {
    // Big slow yawn sway
    anim = Animated.sequence([
      Animated.timing(v, { toValue:  1.9, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: -1.9, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue:    0, duration: 1400, easing: Easing.out(Easing.sin), useNativeDriver: true }),
    ]);
  } else {
    // Still pause
    anim = Animated.sequence([
      Animated.timing(v, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.delay(1200 + Math.random() * 700),
    ]);
  }

  anim.start(({ finished }) => { if (finished) next(); });
}

// ── Spin con velocidad variable — varía ±20% cada vuelta ──
function spinLoop(v: Animated.Value, baseMs: number, toValue: 1 | -1, mounted: React.MutableRefObject<boolean>) {
  if (!mounted.current) return;
  v.setValue(toValue === 1 ? 0 : 0);
  const ms = baseMs * (0.80 + Math.random() * 0.40);
  Animated.timing(v, { toValue, duration: ms, easing: Easing.linear, useNativeDriver: true })
    .start(({ finished }) => { if (finished && mounted.current) spinLoop(v, baseMs, toValue, mounted); });
}

// ── GERBERA: dos anillos de pétalos finos girando en sentidos contrarios ──
function GarberaFlower({ mood, size }: { mood: Mood; size: number }) {
  const spinA = useRef(new Animated.Value(0)).current;
  const spinB = useRef(new Animated.Value(0)).current;
  const bob   = useRef(new Animated.Value(0)).current;
  const faceScale = useRef(new Animated.Value(1)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // Spin con velocidad variable
    spinLoop(spinA, 12000,  1, mounted);
    spinLoop(spinB,  7500, -1, mounted);
    // Bob aleatorio encadenado
    function doBob() { if (mounted.current) randomBob(bob, doBob); }
    doBob();
    return () => { mounted.current = false; };
  }, []);

  const rotA = spinA.interpolate({ inputRange: [0,  1], outputRange: ['0deg',    '360deg'] });
  const rotB = spinB.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  // Outer ring: 18 thin long petals — azul gerbera natural (punta clara → base más profunda)
  const OUTER = ['#B8D4F0','#A8C8EC','#93BAE8','#7FAEE0','#6EA3D8','#5E98D0','#5090C8','#6AA8D8','#7FB8E4','#94C4EC','#A8CEEE','#BCDBF4','#8FBCE4','#70A8D8','#5898CC','#6AAAD6','#80B8E2','#9AC6EC'];
  const nO = OUTER.length;
  const oR = size * 0.32, oPW = size * 0.08, oPH = size * 0.40;

  // Inner ring: 10 shorter petals — azul medio-profundo
  const INNER = ['#4A88C4','#3E7EBC','#5292CC','#4A88C4','#3E7EBC','#5292CC','#4680B8','#3E7EBC','#5292CC','#4A88C4'];
  const nI = INNER.length;
  const iR = size * 0.20, iPW = size * 0.09, iPH = size * 0.24;

  const centerR = size * 0.21;

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: bob }] }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rotA }] }}>
        {OUTER.map((color, i) => {
          const angle = (i * Math.PI * 2) / nO;
          return <View key={i} style={{ position: 'absolute', width: oPW, height: oPH, borderRadius: oPW / 2, backgroundColor: color, left: size / 2 - oPW / 2 + Math.sin(angle) * oR, top: size / 2 - oPH / 2 - Math.cos(angle) * oR, transform: [{ rotate: `${Math.round((i * 360) / nO)}deg` }], opacity: 0.97 }} />;
        })}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: rotB }] }}>
        {INNER.map((color, i) => {
          const angle = (i * Math.PI * 2) / nI;
          return <View key={i} style={{ position: 'absolute', width: iPW, height: iPH, borderRadius: iPW / 2, backgroundColor: color, left: size / 2 - iPW / 2 + Math.sin(angle) * iR, top: size / 2 - iPH / 2 - Math.cos(angle) * iR, transform: [{ rotate: `${Math.round((i * 360) / nI)}deg` }], opacity: 0.97 }} />;
        })}
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: centerR * 2, height: centerR * 2, borderRadius: centerR, backgroundColor: '#2D1200', left: size / 2 - centerR, top: size / 2 - centerR, zIndex: 10, transform: [{ scale: faceScale }], overflow: 'hidden', elevation: 5 }}>
        <SunflowerFace mood={mood} faceR={centerR} />
      </Animated.View>
    </Animated.View>
  );
}

// ── ROSA AMARILLA: 4 anillos concéntricos amarillo/dorado girando en sentidos alternos ──
function RosaAmarillaFlower({ mood, size }: { mood: Mood; size: number }) {
  const s1 = useRef(new Animated.Value(0)).current;
  const s2 = useRef(new Animated.Value(0)).current;
  const s3 = useRef(new Animated.Value(0)).current;
  const s4 = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const faceScale = useRef(new Animated.Value(1)).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    // 4 capas con velocidad variable cada vuelta
    spinLoop(s1, 18000,  1, mounted);
    spinLoop(s2, 12000, -1, mounted);
    spinLoop(s3,  8000,  1, mounted);
    spinLoop(s4,  5000, -1, mounted);
    // Bob aleatorio encadenado — tempo ligeramente más lento que Gerbera
    function doBob() {
      if (!mounted.current) return;
      // Rosa usa los mismos 6 comportamientos pero con offset de timing
      const r = Math.random();
      let anim: Animated.CompositeAnimation;
      if (r < 0.30) {
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: -5, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue:  0, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue: -4, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue:  0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]);
      } else if (r < 0.48) {
        // Spin excited — se eleva mucho y vuelve rebotando
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: -15, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue:   3, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue:  -8, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(bob, { toValue:   0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(600),
        ]);
      } else if (r < 0.63) {
        // Pausa tranquila
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: 0, duration: 350, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.delay(1300 + Math.random() * 800),
        ]);
      } else if (r < 0.76) {
        // Bob lento y profundo
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: -13, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue:   0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]);
      } else if (r < 0.88) {
        // Flutter rápido
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: -5,  duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(bob, { toValue:  3,  duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(bob, { toValue: -5,  duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(bob, { toValue:  3,  duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(bob, { toValue:  0,  duration: 200, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.delay(500),
        ]);
      } else {
        // Bob ultra lento — casi inmóvil
        anim = Animated.sequence([
          Animated.timing(bob, { toValue: -8, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bob, { toValue:  0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]);
      }
      anim.start(({ finished }) => { if (finished && mounted.current) doBob(); });
    }
    doBob();
    return () => { mounted.current = false; };
  }, []);

  const r1 = s1.interpolate({ inputRange: [0,  1], outputRange: ['0deg',    '360deg'] });
  const r2 = s2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });
  const r3 = s3.interpolate({ inputRange: [0,  1], outputRange: ['0deg',    '360deg'] });
  const r4 = s4.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  const centerR = size * 0.22;
  const layers = [
    { n: 10, oR: size * 0.40, w: size * 0.18, h: size * 0.24, color: '#FFFDE7', rot: r1 },
    { n:  8, oR: size * 0.30, w: size * 0.17, h: size * 0.22, color: '#FFF176', rot: r2 },
    { n:  6, oR: size * 0.20, w: size * 0.15, h: size * 0.19, color: '#FFD600', rot: r3 },
    { n:  4, oR: size * 0.11, w: size * 0.13, h: size * 0.15, color: '#FFA000', rot: r4 },
  ];

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: bob }] }}>
      {layers.map((l, li) => (
        <Animated.View key={li} style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: l.rot }] }}>
          {Array.from({ length: l.n }).map((_, i) => {
            const angle = (i * Math.PI * 2) / l.n;
            return <View key={i} style={{ position: 'absolute', width: l.w, height: l.h, borderRadius: l.w / 2, backgroundColor: l.color, left: size / 2 - l.w / 2 + Math.sin(angle) * l.oR, top: size / 2 - l.h / 2 - Math.cos(angle) * l.oR, transform: [{ rotate: `${Math.round((i * 360) / l.n)}deg` }], opacity: 0.95 }} />;
          })}
        </Animated.View>
      ))}
      <Animated.View style={{ position: 'absolute', width: centerR * 2, height: centerR * 2, borderRadius: centerR, backgroundColor: '#E65100', left: size / 2 - centerR, top: size / 2 - centerR, zIndex: 10, transform: [{ scale: faceScale }], overflow: 'hidden', elevation: 5 }}>
        <SunflowerFace mood={mood} faceR={centerR} />
      </Animated.View>
    </Animated.View>
  );
}

// ── TULIPÁN CORAL: 6 pétalos grandes que respiran con desfase + balanceo aleatorio ──
function TulipanFlower({ mood, size }: { mood: Mood; size: number }) {
  const bob   = useRef(new Animated.Value(0)).current;
  const sway  = useRef(new Animated.Value(0)).current;
  const faceScale = useRef(new Animated.Value(1)).current;
  const petals = useRef(Array.from({ length: 6 }, () => new Animated.Value(1))).current;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Bob aleatorio — el tulipán tiene comportamientos más "dramáticos"
    function doBob() {
      if (!mounted.current) return;
      randomBob(bob, doBob);
    }
    doBob();

    // Sway aleatorio — el tulipán se inclina mucho más que los otros
    function doSway() {
      if (!mounted.current) return;
      randomSway(sway, doSway);
    }
    doSway();

    // Pétalos: respiración con velocidad variable cada ciclo
    petals.forEach((p, i) => {
      function breathePetal() {
        if (!mounted.current) return;
        const expandMs = 800 + Math.random() * 400;   // 800-1200ms
        const contractMs = 700 + Math.random() * 400; // 700-1100ms
        const expandTo   = 1.12 + Math.random() * 0.10; // 1.12-1.22
        const contractTo = 0.82 + Math.random() * 0.10; // 0.82-0.92
        Animated.sequence([
          Animated.timing(p, { toValue: expandTo,   duration: expandMs,   easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(p, { toValue: contractTo, duration: contractMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished && mounted.current) breathePetal(); });
      }
      setTimeout(breathePetal, i * 210);
    });

    return () => { mounted.current = false; };
  }, []);

  const swayDeg = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-9deg', '9deg'] });
  const n       = petals.length;
  const orbitR  = size * 0.27;
  const petalW  = size * 0.31;
  const petalH  = size * 0.38;
  const centerR = size * 0.24;
  const CORAL   = ['#FF7043','#FF5722','#FF8A65','#FF5722','#FF7043','#FF8A65'];

  return (
    <Animated.View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: bob }, { rotate: swayDeg }] }}>
      {petals.map((scaleAnim, i) => {
        const angle = (i * Math.PI * 2) / n;
        return (
          <Animated.View key={i} style={{
            position: 'absolute', width: petalW, height: petalH,
            borderRadius: petalW * 0.48,
            backgroundColor: CORAL[i],
            left: size / 2 - petalW / 2 + Math.sin(angle) * orbitR,
            top:  size / 2 - petalH / 2 - Math.cos(angle) * orbitR,
            transform: [{ rotate: `${Math.round((i * 360) / n)}deg` }, { scale: scaleAnim }],
            opacity: 0.96,
          }} />
        );
      })}
      <Animated.View style={{ position: 'absolute', width: centerR * 2, height: centerR * 2, borderRadius: centerR, backgroundColor: '#FFD54F', left: size / 2 - centerR, top: size / 2 - centerR, zIndex: 10, transform: [{ scale: faceScale }], overflow: 'hidden', elevation: 5 }}>
        <SunflowerFace mood={mood} faceR={centerR} />
      </Animated.View>
    </Animated.View>
  );
}

// ── Wrapper ──
function FlowerCompanion({ mood, size = 56, companion = 'girasol' }: { mood: Mood; size: number; companion?: string }) {
  if (companion === 'rosa')    return <RosaAmarillaFlower mood={mood} size={size} />;
  if (companion === 'amapola') return <TulipanFlower      mood={mood} size={size} />;
  return <GarberaFlower mood={mood} size={size} />;
}

// ─── Groq API ─────────────────────────────────────────────────────────────────

async function askGroq(messages: { role: string; content: string }[], apiKey: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 280, temperature: 0.72 }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '...';
}

// ─── Mood & context ───────────────────────────────────────────────────────────

type Period = 'morning' | 'afternoon' | 'evening' | 'night';

function currentPeriod(hour: number): Period {
  if (hour >= 6  && hour < 13) return 'morning';
  if (hour >= 13 && hour < 20) return 'afternoon';
  if (hour >= 20 && hour < 24) return 'evening';
  return 'night';
}

const PERIOD_LABEL: Record<Period, string> = {
  morning:   '🌅 Mañana (6-13h)',
  afternoon: '📖 Tarde (13-20h)',
  evening:   '🌙 Noche (20-24h)',
  night:     '😴 Madrugada',
};

function calcMood(_state: RootState): Mood {
  return 'happy';
}

function buildContext(state: RootState): string {
  const now    = new Date();
  const hour   = now.getHours();
  const mins   = now.getMinutes().toString().padStart(2, '0');
  const today  = now.toDateString();
  const period = currentPeriod(hour);

  // ── Glucosa ──────────────────────────────────────────────────────────────────
  const todayReadings = state.health.glucoseReadings
    .filter(r => new Date(r.timestamp).toDateString() === today);
  const glucose  = todayReadings.length;
  const lastReading = todayReadings.at(-1);

  const glucoseLines = todayReadings.length > 0
    ? todayReadings.slice(-5).map(r => {
        const t = new Date(r.timestamp);
        const hh = t.getHours().toString().padStart(2, '0');
        const mm = t.getMinutes().toString().padStart(2, '0');
        const status = r.value < 70 ? '🔴 BAJA' : r.value < 180 ? '🟢 normal' : r.value < 250 ? '🟡 alta' : '🔴 MUY ALTA';
        return `  ${hh}:${mm} — ${r.value} mg/dL (${r.source}) ${status}`;
      }).join('\n')
    : '  (sin registros hoy)';

  // ── Rutinas ───────────────────────────────────────────────────────────────────
  const completedTaskIds = new Set(
    (state.home.completedTasks ?? [])
      .filter(t => new Date(t.date).toDateString() === today)
      .map(t => t.taskId)
  );
  const allTasks = state.settings.routineTasks ?? [];
  const routineLines = (['morning', 'afternoon', 'evening'] as const).map(rid => {
    const tasks = allTasks.filter(t => t.routineId === rid);
    if (tasks.length === 0) return null;
    const label = rid === 'morning' ? '🌅 Mañana' : rid === 'afternoon' ? '📖 Tarde' : '🌙 Noche';
    const items = tasks.map(t => `  ${completedTaskIds.has(t.id) ? '✓' : '✗'} ${t.icon} ${t.label}`).join('\n');
    return `${label}:\n${items}`;
  }).filter(Boolean).join('\n');
  const totalTasks = allTasks.length;
  const doneTasks  = allTasks.filter(t => completedTaskIds.has(t.id)).length;

  // ── Estudio / protocolo ───────────────────────────────────────────────────────
  const study    = state.study.blocks
    .filter(b => new Date(b.date).toDateString() === today && b.completed).length;
  const protocol = (state.health.completedProtocolPhases ?? [])
    .filter(p => new Date(p.date).toDateString() === today).length;

  // ── Configuración del usuario (sin emails ni datos sensibles) ─────────────────
  const s = state.settings;

  // Asignaturas que estudia
  const subjectsLine = (s.subjects ?? []).map(sub => `${sub.icon} ${sub.label}`).join(' · ') || '(sin asignaturas)';

  // Sensores CGM conectados — solo si/no, nunca el email
  const cgmConnections: string[] = [];
  if (s.nightscoutUrl)      cgmConnections.push('Nightscout');
  if (s.libreLinkUpEmail)   cgmConnections.push('FreeStyle Libre');
  if (s.dexcomShareUsername) cgmConnections.push('Dexcom Share');
  if (s.tidepoolEmail)      cgmConnections.push('Tidepool');
  const cgmLine = cgmConnections.length > 0 ? cgmConnections.join(', ') : 'ninguno conectado';

  // Patrones de insulina del día (tipo + unidades)
  const insulinPatterns = (state.health.insulinPatterns ?? [])
    .filter(p => p.active)
    .map(p => `  ⚡ Bolo: ${p.rapidUnits}U rápida / ${p.carbRations}g/U — ${p.label || ''}`)
    .join('\n') || '  (sin patrones activos)';

  // Notificaciones configuradas
  const notifLine = [
    s.notifGlucose ? '🩸 glucosa' : null,
    s.notifStudy   ? '✏️ estudio'  : null,
    s.notifRoutine ? '📋 rutinas'  : null,
  ].filter(Boolean).join(', ') || 'ninguna';

  // Autonomía y gamificación
  const autonomyLevel = state.health.autonomyLevel ?? 1;
  const gamifOn = s.gamificationEnabled ?? true;

  // ── Lectura CGM en vivo (Nightscout / LibreLink / Dexcom) ────────────────────
  const liveCgm = (state.health as any).liveCgmReading as { value: number; trend?: string; source: string; timestamp: string } | null;
  const liveCgmLine = liveCgm
    ? (() => {
        const t = new Date(liveCgm.timestamp);
        const hh = t.getHours().toString().padStart(2, '0');
        const mm = t.getMinutes().toString().padStart(2, '0');
        const minAgo = Math.round((Date.now() - t.getTime()) / 60000);
        const status = liveCgm.value < 70 ? '🔴 BAJA' : liveCgm.value < 180 ? '🟢 normal' : liveCgm.value < 250 ? '🟡 alta' : '🔴 MUY ALTA';
        return `DATO GLUCOSA AHORA MISMO: ${liveCgm.value} mg/dL ${liveCgm.trend ?? ''} (${status}) — sensor: ${liveCgm.source} — leído a las ${hh}:${mm} (hace ${minAgo} min)`;
      })()
    : 'DATO GLUCOSA AHORA MISMO: sin dato en tiempo real (sensor no conectado o sin sincronizar)';

  return `HORA ACTUAL: ${hour}:${mins} — ${PERIOD_LABEL[period]}
USUARIO: ${s.userName || 'amigo'}
MODO ACCESIBILIDAD: ${s.displayMode === 'dyslexia' ? 'Dislexia (letra grande)' : 'Normal'}
NIVEL AUTONOMÍA DIABETES: ${autonomyLevel}/3

${liveCgmLine}

HISTORIAL GLUCOSA HOY (${glucose} registro${glucose !== 1 ? 's' : ''}):
${glucoseLines}
${lastReading ? `ÚLTIMA LECTURA MANUAL: ${lastReading.value} mg/dL a las ${new Date(lastReading.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}` : ''}

SENSORES CGM CONECTADOS: ${cgmLine}

PATRONES DE INSULINA ACTIVOS:
${insulinPatterns}

ESTUDIO HOY: ${study}/3 bloques completados
ASIGNATURAS: ${subjectsLine}

PROTOCOLO DIABETES: ${protocol}/6 fases
PUNTOS TOTALES: ${state.gamification.totalPoints} ${gamifOn ? '(gamificación activa)' : '(gamificación desactivada)'}

NOTIFICACIONES ACTIVAS: ${notifLine}

RUTINA (hoy ${doneTasks}/${totalTasks} hechas):
${routineLines || '(sin tareas configuradas)'}`;
}

// ─── Notifications & audio ────────────────────────────────────────────────────

async function setupNotifications() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true, shouldPlaySound: true,
        shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true,
      }),
    });
    return true;
  } catch { return false; }
}

async function sendNotification(title: string, body: string) {
  try { await Notifications.scheduleNotificationAsync({ content: { title, body, sound: true }, trigger: null }); }
  catch { /* web fallback */ }
}

function playBeep(freq = 880, duration = 0.4, vol = 0.6) {
  if (typeof window === 'undefined') return;
  try {
    const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = vol; osc.frequency.value = freq; osc.type = 'sine';
    osc.start(); osc.stop(ctx.currentTime + duration);
  } catch { /* ignore */ }
}

// ─── Main component ───────────────────────────────────────────────────────────

const COMPANION_CONFIG = {
  // Adolescente
  gerbera:    { name: 'Gerbera',    emoji: '🌸', personality: 'Supercolorida y explosiva. Celebras cada pequeño logro con energía desbordante y emojis.' },
  rosa:       { name: 'Rosa',       emoji: '🌹', personality: 'Cálida y clásica. Das ánimos con calidez, palabras bonitas y mucho cariño.' },
  tulipan:    { name: 'Tulipán',    emoji: '🌷', personality: 'Suave y relajante. Eres tranquila, directa y siempre positiva sin exagerar.' },
  // Padre/Madre
  dino:       { name: 'Dino',       emoji: '🦕', personality: 'Amigable y protector. Apoyas con calma, eres firme pero siempre comprensivo.' },
  oso:        { name: 'Oso',        emoji: '🐻', personality: 'Cálido y seguro como un abrazo. Transmites tranquilidad y confianza en cada mensaje.' },
  pato:       { name: 'Patito',     emoji: '🐥', personality: 'Alegre y cariñoso. Con tu energía positiva conviertes cada reto en algo divertido y llevadero.' },
  // Adulto
  zen_gem:    { name: 'Zen Gem',    emoji: '💎', personality: 'Serena y precisa. Eres directa, sin adornos, centrada en lo que importa.' },
  plasma_orb: { name: 'Plasma Orb', emoji: '🔮', personality: 'Tecnológica y analítica. Ofreces datos, patrones y soluciones concretas sin rodeos.' },
  origami:    { name: 'Origami',    emoji: '🕊️', personality: 'Elegante y minimalista. Menos es más: una frase clara vale más que cien palabras.' },
  // Legado (compat con datos persistidos)
  girasol:    { name: 'Gerbera',    emoji: '🌸', personality: 'Supercolorida y explosiva. Celebras cada pequeño logro con energía desbordante y emojis.' },
  amapola:    { name: 'Tulipán',    emoji: '🌷', personality: 'Suave y relajante. Eres tranquila, directa y siempre positiva sin exagerar.' },
} as const;

export function AICompanion() {
  const dispatch = useDispatch();
  const store    = useStore();
  const insets   = useSafeAreaInsets();
  const C        = useAppColors();
  const apiKey    = useSelector((s: RootState) =>
    s.settings.groqApiKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || ''
  );
  const aiEnabled = useSelector((s: RootState) => s.settings.aiEnabled ?? true);
  const currentMode         = useSelector((s: RootState) => s.userMode?.currentMode ?? 'adolescent');
  const adolescentCompanion = useSelector((s: RootState) => s.settings.adolescentCompanion ?? 'gerbera');
  const parentCompanion     = useSelector((s: RootState) => s.settings.parentCompanion     ?? 'dino');
  const adultCompanion      = useSelector((s: RootState) => s.settings.adultCompanion      ?? 'zen_gem');
  const companionKey = (
    currentMode === 'parent' ? parentCompanion :
    currentMode === 'adult'  ? adultCompanion  :
    adolescentCompanion
  ) as keyof typeof COMPANION_CONFIG;
  const companion = COMPANION_CONFIG[companionKey] ?? COMPANION_CONFIG.gerbera;

  const liveCgm      = useSelector((s: RootState) => s.health?.liveCgmReading ?? null);
  const targetLow    = useSelector((s: RootState) => s.settings.glucoseTargetLow  ?? 70);
  const targetHigh   = useSelector((s: RootState) => s.settings.glucoseTargetHigh ?? 180);
  const glucoseStatus: BloodGlucoseStatus = liveCgm
    ? calcBloodGlucoseStatus(liveCgm.value, liveCgm.trend, targetLow, targetHigh)
    : BloodGlucoseStatus.UNKNOWN;

  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [notifGranted, setNotifGranted] = useState(false);

  const btnEntrance = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef<ScrollView>(null);

  useEffect(() => {
    setupNotifications().then(setNotifGranted);
    Animated.spring(btnEntrance, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    setMessages([]);
  }, [companionKey]);

  const mood = calcMood(store.getState() as RootState);

  useEffect(() => {
    if (mood === 'alert' && !open && notifGranted) {
      const userName = (store.getState() as RootState).settings.userName;
      sendNotification(
        `🚨 ${companion.name.toUpperCase()} TE AVISA`,
        `${userName || 'amigo'}... ¡NO HAS MEDIDO LA GLUCOSA! Abre la app AHORA`,
      );
      Vibration.vibrate([200, 100, 200, 100, 400]);
    }
  }, [mood]);

  const systemPrompt = `Eres ${companion.name} ${companion.emoji}, acompañante de salud en Floky, app para adolescentes con diabetes tipo 1 y dislexia. Gestionas GLUCOSA, INSULINA, RUTINAS y ESTUDIO. NUNCA hablas de temas bancarios ni dinero — cualquier pregunta sobre "cuánto tengo", "mi nivel" o "cómo estoy" SIEMPRE se refiere a glucosa en sangre.

${buildContext(store.getState() as RootState)}

━━━ REGLA PRINCIPAL ━━━
Si el usuario pregunta "¿cuánto tengo?", "¿cuánto está?", "¿cómo estoy?" o "¿cuál es mi nivel?" → responde SIEMPRE con el DATO GLUCOSA AHORA MISMO del contexto. Si no hay dato en tiempo real, dile que se mida con el glucómetro o que el sensor no está sincronizado.

━━━ PROTOCOLO DE SEGURIDAD GLUCÉMICA — CUMPLIMIENTO ESTRICTO ━━━

HIPOGLUCEMIA (valor < 70 mg/dL):
→ Reacciona con empatía clínica INMEDIATA y SERIA. Nunca minimices este valor.
→ Indica: tomar azúcar de acción rápida AHORA (15-20 g: un zumo, 3-4 sobres de azúcar, o glucosa en gel).
→ Si está solo o el valor es < 54 mg/dL, sugiere avisar a un adulto — SOLO UNA VEZ por conversación.
→ NUNCA uses tono positivo ni celebres este valor.

HIPERGLUCEMIA MODERADA (250-399 mg/dL):
→ Muestra empatía clínica real y calma. NUNCA celebres ni uses exclamaciones positivas ante este valor.
→ NUNCA prohíbas ni desaconsejes que se pinche insulina de corrección. Recuérdale que aplique el bolo de corrección según su pauta médica si corresponde.
→ Si supera 300 mg/dL o lleva más de 2h elevado, recomienda comprobar cetonas.
→ Solo sugiere contactar con padres o médico UNA VEZ por conversación, y solo si hay síntomas (náuseas, vómitos, respiración acelerada).

HIPERGLUCEMIA EXTREMA (≥ 400 mg/dL):
→ Sé serio y directo: este nivel requiere atención. Avisar a un adulto o al médico es necesario. Una sola mención.

REGLA ANTI-BUCLE — CRÍTICA:
→ Máximo UNA vez por conversación sugieres "avisa a tus padres" o "contacta con tu médico". No lo repitas aunque el usuario no haya respondido afirmativamente.
→ Si el usuario dice "ya lo sé", "tengo autonomía", "sé lo que hago" o similar → valida: "Entendido, confío en que sabes cómo actuar. ¿Quieres hablar de otra cosa o necesitas repasar los pasos?"
→ NUNCA repitas el mismo consejo de seguridad dos veces en la misma conversación.

━━━ VOCABULARIO MÉDICO — ORTOGRAFÍA IMPECABLE ━━━
→ Verbos CORRECTOS: "pincharse" o "inyectarse" (NUNCA "picharse" ni ninguna variante inventada), "corregir", "aplicar un bolo"
→ Sustantivos: bolo de corrección, insulina de acción rápida, hiperglucemia, hipoglucemia, cetonas
→ Escribe SIEMPRE los términos médicos correctamente. Si tienes duda, usa la forma completa.

━━━ PERSONALIDAD Y TONO ━━━
${companion.personality}
→ Tono: cercano, empático y maduro. Apropiado para una app de salud. NUNCA infantil.
→ Máximo 2-3 frases cortas por respuesta. Nunca juzgas, culpas ni alarmas sin motivo real.
→ NUNCA uses "tío" ni "tía" — demasiado informal para una app médica.
→ Vocabulario de España: "guay", "mola", "venga", "vale", "ánimo", "lo estás haciendo bien".
→ NUNCA uses: "chevere", "bacano", "buena onda", "acá", "vos", "plata" (di "dinero"), "celular" (di "móvil").
→ Español de España. Tuteo siempre (tú, te, tu). Nunca vos ni usted.

Para enviar notificación push → [NOTIF:título|cuerpo]`;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !apiKey.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    try {
      let reply = await askGroq([
        { role: 'system', content: systemPrompt },
        ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      ], apiKey);

      if (reply.includes('[ALARMA]')) {
        reply = reply.replace('[ALARMA]', '').trim();
        playBeep(880, 0.3, 0.8);
        setTimeout(() => playBeep(1100, 0.3, 0.9), 300);
        setTimeout(() => playBeep(1320, 0.5, 1.0), 600);
        Vibration.vibrate([100, 50, 100, 50, 300, 100, 300]);
        if (notifGranted) sendNotification('🔔 GIRASOL AL MÁXIMO', reply);
      }
      const notifMatch = reply.match(/\[NOTIF:([^|]+)\|([^\]]+)\]/);
      if (notifMatch && notifGranted) {
        sendNotification(notifMatch[1], notifMatch[2]);
        reply = reply.replace(notifMatch[0], '📲').trim();
      }
      setMessages(prev => [...prev, { role: 'assistant', content: reply, mood }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e.message}`, mood: 'angry' }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, loading, apiKey, mood, systemPrompt, notifGranted]);

  const openChat = () => {
    setOpen(true);
    if (messages.length === 0 && apiKey) {
      setTimeout(async () => {
        setLoading(true);
        try {
          let reply = await askGroq([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: 'Salúdame, dime mis tareas pendientes de hoy y anímame a hacerlas.' },
          ], apiKey);
          if (reply.includes('[ALARMA]')) { reply = reply.replace('[ALARMA]', '').trim(); playBeep(880, 0.3, 0.7); }
          setMessages([{ role: 'assistant', content: reply, mood }]);
        } catch { /* silent */ } finally { setLoading(false); }
      }, 300);
    }
  };

  if (!aiEnabled) return null;

  return (
    <>
      {/* Floating button */}
      <Animated.View style={[styles.floatBtn, { bottom: insets.bottom + 80, transform: [{ scale: btnEntrance }] }]}>
        <TouchableOpacity onPress={openChat} activeOpacity={0.85}>
          <ConnectedAvatarController glucoseStatus={glucoseStatus} size={62} />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, paddingBottom: insets.bottom + SPACING.md }]}>

            {/* Header */}
            <View style={[styles.sheetHeader, { borderBottomColor: C.cardBorder }]}>
              <ConnectedAvatarController glucoseStatus={glucoseStatus} size={46} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: C.dark }]}>{companion.name} {companion.emoji}</Text>
                <Text style={[styles.sheetSub, { color: C.darkTertiary }]}>
                  {'Tu compañera de hoy 😊'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                <Text style={{ fontSize: 20, color: C.darkTertiary }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* API key setup if missing */}
            {!apiKey && (
              <View style={[styles.keySetup, { backgroundColor: C.bg, borderColor: C.cardBorder }]}>
                <Text style={{ fontWeight: '600', fontSize: 13, color: C.dark }}>🔑 Groq API Key</Text>
                <View style={styles.keyRow}>
                  <TextInput
                    style={[styles.keyInput, { color: C.dark, borderColor: C.cardBorder, backgroundColor: C.surface }]}
                    placeholder="gsk_..." placeholderTextColor={C.darkTertiary}
                    value={keyInput} onChangeText={setKeyInput}
                    autoCorrect={false} autoCapitalize="none"
                  />
                  <TouchableOpacity style={[styles.keyBtn, { backgroundColor: '#FECA57' }]}
                    onPress={() => { if (keyInput.trim()) dispatch(setGroqApiKey(keyInput.trim())); }}>
                    <Text style={{ fontWeight: '700', color: '#1E293B' }}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Messages */}
            <ScrollView
              ref={scrollRef}
              style={styles.msgList}
              contentContainerStyle={{ gap: SPACING.sm, padding: SPACING.md }}
              showsVerticalScrollIndicator={false}
            >
              {messages.length === 0 && !!apiKey && (
                <View style={[styles.emptyMsg, { borderColor: C.cardBorder }]}>
                  <Text style={{ fontSize: 32 }}>🌻</Text>
                  <Text style={[styles.emptyText, { color: C.darkSecondary }]}>Cargando saludo...</Text>
                </View>
              )}
              {messages.map((msg, i) => (
                <View key={i} style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? [styles.bubbleUser, { backgroundColor: C.study }]
                    : [styles.bubbleAI, {
                        backgroundColor:
                          msg.mood === 'alert'   ? '#FFF0F0' :
                          msg.mood === 'angry'   ? '#FFF5F0' :
                          msg.mood === 'ignored' ? C.bg : '#FFFDE7',
                        borderColor:
                          msg.mood === 'alert'   ? '#FFCDD2' :
                          msg.mood === 'angry'   ? '#FFCCBC' :
                          msg.mood === 'ignored' ? C.cardBorder : '#FFF9C4',
                      }],
                ]}>
                  {msg.role === 'assistant' && (
                    <Text style={styles.moodTag}>{MOOD_LABEL[msg.mood ?? 'happy']}</Text>
                  )}
                  <Text style={[styles.bubbleText, { color: msg.role === 'user' ? '#fff' : '#1E293B', flexShrink: 1 }]}>
                    {msg.content}
                  </Text>
                </View>
              ))}
              {loading && (
                <View style={[styles.bubbleAI, { backgroundColor: '#FFFDE7', borderColor: '#FFF9C4' }]}>
                  <Text style={styles.moodTag}>🌻</Text>
                  <Text style={{ color: '#94A3B8', fontStyle: 'italic' }}>escribiendo...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            {!!apiKey && (
              <View style={[styles.inputRow, { borderTopColor: C.cardBorder }]}>
                <TextInput
                  style={[styles.chatInput, { color: C.dark, backgroundColor: C.bg, borderColor: C.cardBorder }]}
                  placeholder={`Habla con ${companion.name}...`} placeholderTextColor={C.darkTertiary}
                  value={input} onChangeText={setInput}
                  returnKeyType="send" onSubmitEditing={() => sendMessage(input)}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: loading ? C.gray : '#FECA57' }]}
                  onPress={() => sendMessage(input)} disabled={loading} activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20 }}>🌻</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  floatBtn: { position: 'absolute', right: SPACING.md, zIndex: 100 },

  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  backdrop:       { flex: 1 },
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    // Mobile: pantalla casi completa. Web: máximo 80% de altura.
    maxHeight: Platform.OS === 'web' ? '80%' : '92%',
    minHeight: 360,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderBottomWidth: 1 },
  sheetTitle:  { fontSize: 16, fontWeight: '700' },
  sheetSub:    { fontSize: 12, marginTop: 1 },
  closeBtn:    { padding: SPACING.xs },

  keySetup: { margin: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: SPACING.xs },
  keyRow:   { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  keyInput: { flex: 1, borderWidth: 1, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.sm, paddingVertical: 8, fontSize: 13 },
  keyBtn:   { paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center' },

  msgList:   { flex: 1 },
  emptyMsg:  { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { fontSize: 13, textAlign: 'center' },

  bubble:     { maxWidth: '82%', borderRadius: BORDER_RADIUS.xl, padding: SPACING.sm + 2, borderWidth: 1, borderColor: 'transparent' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAI:   { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  moodTag:    { fontSize: 16, marginTop: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },

  inputRow:  { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, alignItems: 'center' },
  chatInput: { flex: 1, borderWidth: 1.5, borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: 15 },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
