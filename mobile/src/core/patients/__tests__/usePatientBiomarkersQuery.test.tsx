import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchPatientBiomarkers } from '@/core/api/patients';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { usePatientBiomarkersQuery } from '@/core/patients/usePatientBiomarkersQuery';

jest.mock('@/core/api/patients');

const mockedFetchPatientBiomarkers = fetchPatientBiomarkers as jest.MockedFunction<
  typeof fetchPatientBiomarkers
>;

const fakeBiomarkers: Biomarker[] = [
  {
    id: 'bio-1',
    code: 'hba1c',
    label: 'Hemoglobina glicada',
    value: 7.2,
    unit: '%',
    refMin: 4,
    refMax: 6.5,
    measuredAt: '2026-01-01T00:00:00.000Z',
    status: 'high',
  },
];

describe('usePatientBiomarkersQuery', () => {
  afterEach(() => {
    mockedFetchPatientBiomarkers.mockReset();
  });

  it('busca os biomarcadores por id e expõe status/data sem transformação', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue(fakeBiomarkers);
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => usePatientBiomarkersQuery('patient-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.data).toEqual(fakeBiomarkers);
    expect(mockedFetchPatientBiomarkers).toHaveBeenCalledWith('patient-1');
    expect(queryClient.getQueryState(['patient', 'patient-1', 'biomarkers'])?.data).toEqual(
      fakeBiomarkers,
    );
    expect(typeof result.current.refetch).toBe('function');
  });
});
