import { render } from '@testing-library/react-native';

import { useIsOffline } from '@/core/offline/network';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { OfflineBanner } from '@/core/ui/OfflineBanner';

jest.mock('@/core/offline/network');

const mockedUseIsOffline = useIsOffline as jest.MockedFunction<typeof useIsOffline>;

const fakeBrand: Brand = {
  id: 'brand-a',
  displayName: 'Brand A',
  colors: {
    background: '#ffffff',
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
  assets: { logo: { uri: 'logo' }, splashIcon: { uri: 'splash' } },
  copy: {
    patientsTitle: 'Patients',
    emptyPatients: 'No patients',
    aiDisclaimer: 'Disclaimer',
    emptyBiomarkers: 'No biomarkers',
    emptyFilteredPatients: 'No filtered patients',
  },
  defaults: { aiActionsEnabled: false, offlineBanner: true },
};

describe('OfflineBanner', () => {
  afterEach(() => {
    mockedUseIsOffline.mockReset();
  });

  it('fica visível quando useIsOffline() é true', async () => {
    mockedUseIsOffline.mockReturnValue(true);

    const { getByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <OfflineBanner />
      </BrandProvider>,
    );

    expect(getByText('Você está offline. Mostrando os dados salvos no dispositivo.')).toBeTruthy();
  });

  it('fica ausente quando useIsOffline() é false', async () => {
    mockedUseIsOffline.mockReturnValue(false);

    const { queryByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <OfflineBanner />
      </BrandProvider>,
    );

    expect(
      queryByText('Você está offline. Mostrando os dados salvos no dispositivo.'),
    ).toBeNull();
  });
});
