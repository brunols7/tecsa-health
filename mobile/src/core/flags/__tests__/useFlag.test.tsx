import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchFeatureFlags } from '@/core/api/feature-flags';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useFlag } from '@/core/flags/useFlag';

jest.mock('@/core/api/feature-flags');

const mockedFetchFeatureFlags = fetchFeatureFlags as jest.MockedFunction<typeof fetchFeatureFlags>;

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
  copy: { patientsTitle: 'Patients', emptyPatients: 'No patients', aiDisclaimer: 'Disclaimer' },
  defaults: { aiActionsEnabled: false, offlineBanner: true },
};

function renderUseFlag(key: keyof typeof fakeBrand.defaults) {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useFlag(key), { wrapper });
}

describe('useFlag', () => {
  afterEach(() => {
    mockedFetchFeatureFlags.mockReset();
  });

  it('retorna o default da marca enquanto a resposta de rede não chegou', async () => {
    mockedFetchFeatureFlags.mockReturnValue(new Promise(() => {}));

    const { result } = await renderUseFlag('aiActionsEnabled');

    expect(result.current).toBe(fakeBrand.defaults.aiActionsEnabled);
  });

  it('retorna o valor de rede quando a resposta chega, mesmo diferente do default', async () => {
    mockedFetchFeatureFlags.mockResolvedValue({ aiActionsEnabled: true, offlineBanner: false });

    const { result } = await renderUseFlag('aiActionsEnabled');

    await waitFor(() => expect(result.current).toBe(true));

    expect(fakeBrand.defaults.aiActionsEnabled).toBe(false);
  });

  it('retorna o default da marca quando a key não está presente no payload de rede', async () => {
    mockedFetchFeatureFlags.mockResolvedValue({ offlineBanner: false });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result: offlineBannerResult } = await renderHook(() => useFlag('offlineBanner'), {
      wrapper,
    });

    await waitFor(() => expect(offlineBannerResult.current).toBe(false));

    const { result: aiActionsResult } = await renderHook(() => useFlag('aiActionsEnabled'), {
      wrapper,
    });

    expect(aiActionsResult.current).toBe(fakeBrand.defaults.aiActionsEnabled);
  });
});
