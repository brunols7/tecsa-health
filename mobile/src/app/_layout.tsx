import Constants from 'expo-constants';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { resolveBrand } from '@/brands';
import { BrandProvider } from '@/core/theme/BrandProvider';

SplashScreen.preventAutoHideAsync();

const brandId = (Constants.expoConfig?.extra?.brandId as string | undefined) ?? 'nutri-care';
const brand = resolveBrand(brandId);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <BrandProvider brand={brand}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </BrandProvider>
  );
}
