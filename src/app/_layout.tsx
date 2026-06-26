import '@/web-compat'; // filtro upstream warnings React 19 + RN Web — debe ser el primer import
import { DarkTheme, DefaultTheme, ThemeProvider, useRouter } from 'expo-router';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View } from 'react-native';
import { useEffect } from 'react';

import { store, persistor } from '@/store/store';
import type { RootState } from '@/store/store';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AICompanion } from '@/components/AICompanion';
import { setupAllNotifications } from '@/services/notificationService';
import OnboardingFlow from '@/screens/onboarding/OnboardingFlow';
import ModeIntroScreen from '@/screens/onboarding/ModeIntroScreen';
import { useGlucoseSync } from '@/hooks/useGlucoseSync';
import { IOSInstallBanner } from '@/components/shared/IOSInstallBanner';
import { loadSettingsBackup } from '@/services/settingsBackup';
import { restoreSettingsFromBackup } from '@/store/slices/settingsSlice';
import { markModeIntroSeen } from '@/store/slices/userModeSlice';
import type { UserMode } from '@/store/slices/userModeSlice';

function ThemedApp() {
  const dispatch            = useDispatch();
  const router              = useRouter();
  const scheme              = useSelector((s: RootState) => s.settings?.colorScheme ?? 'light');
  const isFirst             = useSelector((s: RootState) => s.settings?.isFirstLaunch ?? true);
  const notifGlucose        = useSelector((s: RootState) => s.settings?.notifGlucose ?? true);
  const notifStudy          = useSelector((s: RootState) => s.settings?.notifStudy   ?? true);
  const notifRoutine        = useSelector((s: RootState) => s.settings?.notifRoutine  ?? true);
  const onboardingComplete  = useSelector((s: RootState) => s.userMode?.onboardingComplete ?? false);
  const pendingModeIntro    = useSelector((s: RootState) => s.userMode?.pendingModeIntro ?? null);

  // Sincronización global CGM cada 5 minutos
  useGlucoseSync();

  // Si es primera vez, intentar restaurar backup cifrado automáticamente
  useEffect(() => {
    if (!isFirst) return;
    loadSettingsBackup().then(backup => {
      if (backup) dispatch(restoreSettingsFromBackup(backup as any));
    });
  }, []);

  useEffect(() => {
    if (isFirst) return;
    setupAllNotifications({ glucose: notifGlucose, study: notifStudy, routine: notifRoutine });
  }, [isFirst, notifGlucose, notifStudy, notifRoutine]);

  if (!onboardingComplete) {
    return <OnboardingFlow />;
  }

  // Intro de modo pendiente (cambio de modo sin replantear onboarding completo)
  if (pendingModeIntro) {
    return (
      <ModeIntroScreen
        mode={pendingModeIntro as UserMode}
        onDone={() => {
          dispatch(markModeIntroSeen(pendingModeIntro as UserMode));
          router.replace('/');
        }}
      />
    );
  }

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <AICompanion />
        <IOSInstallBanner />
      </View>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemedApp />
      </PersistGate>
    </Provider>
  );
}
