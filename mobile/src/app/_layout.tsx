import { QueryClientProvider } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { resolveBrand } from '@/brands';
import { useBiometricGate } from '@/core/auth/useBiometricGate';
import { setupNetworkStatusListener } from '@/core/offline/network';
import { queryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import { BiometricGateScreen } from '@/core/ui/BiometricGateScreen';

SplashScreen.preventAutoHideAsync();

const brandId = (Constants.expoConfig?.extra?.brandId as string | undefined) ?? 'nutri-care';
const brand = resolveBrand(brandId);

function GatedContent() {
  const gate = useBiometricGate();
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);

  const awaitingWarningAcknowledgement =
    gate.status === 'unlocked' && gate.warning !== undefined && !warningAcknowledged;

  if (gate.status !== 'unlocked' || awaitingWarningAcknowledgement) {
    return (
      <BiometricGateScreen
        status={gate.status}
        reason={gate.status === 'unlocked' ? gate.reason : undefined}
        warning={gate.warning}
        onRetry={gate.retry}
        onContinue={() => setWarningAcknowledged(true)}
      />
    );
  }

  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => setupNetworkStatusListener(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={brand}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <GatedContent />
        </ThemeProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
