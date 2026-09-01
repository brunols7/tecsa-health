import type { ConfigContext, ExpoConfig } from 'expo/config';

const KNOWN_BRAND_IDS = ['nutri-care', 'vita-plus'] as const;
type BrandId = (typeof KNOWN_BRAND_IDS)[number];

type BrandBuildConfig = {
  displayName: string;
  bundleId: string;
  icon: string;
  splashImage: string;
  splashBackgroundColor: string;
};

const BRAND_BUILD_CONFIG: Record<BrandId, BrandBuildConfig> = {
  'nutri-care': {
    displayName: 'NutriCare',
    bundleId: 'health.tecsa.nutricare',
    icon: './src/brands/nutri-care/assets/logo.png',
    splashImage: './src/brands/nutri-care/assets/splash-icon.png',
    splashBackgroundColor: '#F2F5F7',
  },
  'vita-plus': {
    displayName: 'VitaPlus',
    bundleId: 'health.tecsa.vitaplus',
    icon: './src/brands/vita-plus/assets/logo.png',
    splashImage: './src/brands/vita-plus/assets/splash-icon.png',
    splashBackgroundColor: '#FBF3E9',
  },
};

function isKnownBrandId(id: string): id is BrandId {
  return (KNOWN_BRAND_IDS as readonly string[]).includes(id);
}

const DEFAULT_BRAND_ID: BrandId = 'nutri-care';
const rawBrandId = process.env.APP_BRAND ?? DEFAULT_BRAND_ID;

if (!isKnownBrandId(rawBrandId)) {
  throw new Error(
    `APP_BRAND="${rawBrandId}" é desconhecida. Marcas válidas: ${KNOWN_BRAND_IDS.join(', ')}.`,
  );
}

const brandId = rawBrandId;
const build = BRAND_BUILD_CONFIG[brandId];

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

function withBrandedSplash(
  plugins: NonNullable<ExpoConfig['plugins']>,
  build: BrandBuildConfig,
): NonNullable<ExpoConfig['plugins']> {
  return plugins.map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      return [
        'expo-splash-screen',
        {
          ...(plugin[1] as Record<string, unknown>),
          backgroundColor: build.splashBackgroundColor,
          image: build.splashImage,
        },
      ];
    }
    return plugin;
  });
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: build.displayName,
  slug: brandId,
  scheme: brandId,
  icon: build.icon,
  ios: {
    ...config.ios,
    icon: build.icon,
    bundleIdentifier: build.bundleId,
  },
  android: {
    ...config.android,
    package: build.bundleId,
    adaptiveIcon: {
      ...config.android?.adaptiveIcon,
      foregroundImage: build.icon,
    },
  },
  plugins: withBrandedSplash(config.plugins ?? [], build),
  extra: {
    ...config.extra,
    brandId,
    apiUrl,
  },
});
