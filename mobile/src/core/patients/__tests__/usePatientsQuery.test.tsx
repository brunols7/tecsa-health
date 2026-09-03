import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchPatients } from '@/core/api/patients';
import type { PatientPage } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { usePatientsQuery } from '@/core/patients/usePatientsQuery';

jest.mock('@/core/api/patients');

const mockedFetchPatients = fetchPatients as jest.MockedFunction<typeof fetchPatients>;

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

function makePatient(id: string): PatientPage['data'][number] {
  return {
    id,
    name: `Patient ${id}`,
    birthDate: '1990-01-01',
    goal: 'lose_weight',
    status: 'active',
    needsFollowUp: false,
    statusChangedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('usePatientsQuery', () => {
  afterEach(() => {
    mockedFetchPatients.mockReset();
  });

  it('busca a página inicial com a query key incluindo brand.id e o termo de busca', async () => {
    mockedFetchPatients.mockResolvedValue({ data: [makePatient('1')], nextCursor: null });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => usePatientsQuery('joao'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedFetchPatients).toHaveBeenCalledWith('brand-a', 'joao', undefined);
    expect(
      queryClient.getQueryState(['patients', 'brand-a', 'joao'])?.status,
    ).toBe('success');
  });

  it('nextCursor null na última página resulta em hasNextPage false', async () => {
    mockedFetchPatients.mockResolvedValue({ data: [makePatient('1')], nextCursor: null });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => usePatientsQuery(''), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it('nextCursor presente resulta em hasNextPage true e fetchNextPage usa o cursor', async () => {
    mockedFetchPatients
      .mockResolvedValueOnce({ data: [makePatient('1')], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({ data: [makePatient('2')], nextCursor: null });
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result } = await renderHook(() => usePatientsQuery(''), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(mockedFetchPatients).toHaveBeenNthCalledWith(2, 'brand-a', undefined, 'cursor-2');
  });

  it('trocar o termo de busca entre renders usa uma query key diferente e não mistura páginas da busca anterior', async () => {
    mockedFetchPatients.mockImplementation((_brandId, search) =>
      Promise.resolve({
        data: [makePatient(search === 'ana' ? 'ana-1' : 'joao-1')],
        nextCursor: null,
      }),
    );
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
      </QueryClientProvider>
    );

    const { result, rerender } = await renderHook(
      ({ search }: { search: string }) => usePatientsQuery(search),
      {
        wrapper,
        initialProps: { search: 'joao' },
      },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]?.data[0]?.id).toBe('joao-1');

    rerender({ search: 'ana' });

    await waitFor(() =>
      expect(result.current.data?.pages[0]?.data[0]?.id).toBe('ana-1'),
    );

    expect(result.current.data?.pages).toHaveLength(1);
    expect(
      queryClient.getQueryState(['patients', 'brand-a', 'joao'])?.data,
    ).not.toBeUndefined();
    expect(
      (queryClient.getQueryState(['patients', 'brand-a', 'joao'])?.data as { pages: unknown[] })
        .pages,
    ).toHaveLength(1);
  });
});
