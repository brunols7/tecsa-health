import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchPatientDetail } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { usePatientDetailQuery } from '@/core/patients/usePatientDetailQuery';

jest.mock('@/core/api/patients');

const mockedFetchPatientDetail = fetchPatientDetail as jest.MockedFunction<
  typeof fetchPatientDetail
>;

const fakePatient: Patient = {
  id: 'patient-1',
  name: 'Maria Silva',
  birthDate: '1990-01-01',
  goal: 'weight-loss',
  status: 'active',
  needsFollowUp: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('usePatientDetailQuery', () => {
  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
  });

  it('busca o paciente por id e expõe status/data sem transformação', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => usePatientDetailQuery('patient-1'), { wrapper });

    await waitFor(() => expect(result.current.status).toBe('success'));

    expect(result.current.data).toEqual(fakePatient);
    expect(mockedFetchPatientDetail).toHaveBeenCalledWith('patient-1');
    expect(queryClient.getQueryState(['patient', 'patient-1'])?.data).toEqual(fakePatient);
    expect(typeof result.current.refetch).toBe('function');
  });
});
