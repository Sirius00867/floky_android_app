import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 1800;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0:   { opacity: 0, transform: [{ scale: 0.8 }] },
    20:  { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.back(1.5)) },
    70:  { opacity: 1 },
    100: { opacity: 0 },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.backgroundSolidColor}
    >
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.splashIcon}
        contentFit="contain"
      />
      <Text style={styles.splashTitle}>floky</Text>
    </Animated.View>
  );
}

export function AnimatedIcon() {
  const bgKeyframe = new Keyframe({
    0:   { transform: [{ scale: 1.2 }], opacity: 0 },
    100: { transform: [{ scale: 1 }], opacity: 1, easing: Easing.elastic(0.7) },
  });

  const logoKeyframe = new Keyframe({
    0:   { transform: [{ scale: 1.3 }], opacity: 0 },
    40:  { transform: [{ scale: 1.3 }], opacity: 0, easing: Easing.elastic(0.7) },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.elastic(0.7) },
  });

  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={bgKeyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/icon.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: 'linear-gradient(180deg, #3C9FFE, #0274DF)',
    width: 128,
    height: 128,
    position: 'absolute',
  },
  backgroundSolidColor: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#208AEF',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  splashIcon: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },
  splashTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
