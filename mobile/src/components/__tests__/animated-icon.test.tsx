import { render } from '@testing-library/react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';

jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    Easing: { elastic: () => undefined },
    Keyframe: class {
      duration() {
        return this;
      }
      withCallback() {
        return this;
      }
    },
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));

function buildFakeBrand(splashIcon: string, background: string): Brand {
  return {
    id: 'brand-a',
    displayName: 'Brand A',
    colors: {
      background,
      surface: '#f0f0f0',
      surfaceMuted: '#e0e0e0',
      textPrimary: '#000000',
      textSecondary: '#333333',
      accent: '#0000ff',
      accentContrast: '#ffffff',
      success: '#00ff00',
      warning: '#ffaa00',
      danger: '#ff0000',
      border: '#cccccc',
    },
    typography: {
      fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
      scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, display: 28 },
    },
    radii: { sm: 4, md: 8, lg: 12, pill: 999 },
    spacing: (n: number) => n * 4,
    assets: { logo: { uri: 'logo' }, splashIcon: { uri: splashIcon } },
    copy: {
      patientsTitle: 'Patients',
      emptyPatients: 'No patients',
      aiDisclaimer: 'Disclaimer',
      emptyBiomarkers: 'No biomarkers',
      emptyFilteredPatients: 'No filtered patients',
    },
    defaults: { aiActionsEnabled: false, offlineBanner: true },
  };
}

describe('AnimatedSplashOverlay', () => {
  it('usa o splashIcon e a cor de fundo da marca em vez do logo do Expo', async () => {
    const brand = buildFakeBrand('nutri-care-splash', '#F2F5F7');

    const { getByTestId } = await render(
      <BrandProvider brand={brand}>
        <AnimatedSplashOverlay />
      </BrandProvider>,
    );

    const image = getByTestId('splash-overlay-image');
    expect(image.props.source).toEqual([{ uri: 'nutri-care-splash' }]);
  });

  it('troca de logo/cor quando a marca muda', async () => {
    const brand = buildFakeBrand('vita-plus-splash', '#FBF3E9');

    const { getByTestId } = await render(
      <BrandProvider brand={brand}>
        <AnimatedSplashOverlay />
      </BrandProvider>,
    );

    const image = getByTestId('splash-overlay-image');
    expect(image.props.source).toEqual([{ uri: 'vita-plus-splash' }]);
  });
});
