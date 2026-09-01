import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.config.ts é avaliado pelo Expo CLI diretamente via `require` do Node,
// fora do bundler Metro: extensionless imports e o alias "@/" de
// tsconfig.json não resolvem nesse contexto (o Node exige extensão
// explícita para ESM/.ts, e não conhece paths de tsconfig). Por isso este
// arquivo não importa `resolveBrand` de `src/brands` — mantém, em vez
// disso, um descritor mínimo e auto-contido, com os mesmos `id` usados no
// registry de `src/brands/index.ts` (fonte de verdade em runtime do app).
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
    splashBackgroundColor: '#FBF6EE',
  },
  'vita-plus': {
    displayName: 'VitaPlus',
    bundleId: 'health.tecsa.vitaplus',
    icon: './src/brands/vita-plus/assets/logo.png',
    splashImage: './src/brands/vita-plus/assets/splash-icon.png',
    splashBackgroundColor: '#0B1210',
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

// URL base da API consumida por core/api (Fase 2). Em device físico,
// "localhost" não alcança a máquina host — aponte para o IP da máquina na
// rede local, ex: http://192.168.0.10:9000 (ver mobile/.env.example).
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

// A tela de splash nativa não é uma chave de topo neste SDK — é opção do
// plugin "expo-splash-screen" (ver app.json). Substitui a entrada existente
// do plugin pela variante por marca, preservando os demais plugins.
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
