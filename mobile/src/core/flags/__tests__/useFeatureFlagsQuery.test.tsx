import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchFeatureFlags } from '@/core/api/feature-flags';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useFeatureFlagsQuery } from '@/core/flags/useFeatureFlagsQuery';

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

describe('useFeatureFlagsQuery', () => {
  afterEach(() => {
    mockedFetchFeatureFlags.mockReset();
  });

  it('popula data quando o fetch resolve com sucesso', async () => {
    mockedFetchFeatureFlags.mockResolvedValue({ aiActionsEnabled: true, offlineBanner: false });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => useFeatureFlagsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: false });
    expect(mockedFetchFeatureFlags).toHaveBeenCalledWith('brand-a');
  });

  it('deixa data undefined quando o fetch falha e não existe cache anterior', async () => {
    mockedFetchFeatureFlags.mockRejectedValue(new Error('network down'));
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => useFeatureFlagsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toBeUndefined();
  });

  it('preserva o cache anterior (MMKV restaurado) quando o fetch novo falha', async () => {
    mockedFetchFeatureFlags.mockRejectedValue(new Error('network down'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['feature-flags', fakeBrand.id], {
      aiActionsEnabled: true,
      offlineBanner: true,
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => useFeatureFlagsQuery(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.data).toEqual({ aiActionsEnabled: true, offlineBanner: true });
  });
});
