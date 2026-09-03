import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createBiomarker } from '@/core/api/patients';
import { ApiError } from '@/core/api/http';
import type { Biomarker, CreateBiomarkerInput } from '@/core/api/schemas/biomarker';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useCreateBiomarkerMutation } from '@/core/patients/useCreateBiomarkerMutation';

jest.mock('@/core/api/patients');

const mockedCreateBiomarker = createBiomarker as jest.MockedFunction<typeof createBiomarker>;

const existingBiomarker: Biomarker = {
  id: 'bio-1',
  code: 'hba1c',
  label: 'Hemoglobina glicada',
  value: 7.2,
  unit: '%',
  refMin: 4,
  refMax: 6,
  measuredAt: '2026-01-01T00:00:00.000Z',
  status: 'high',
};

const validInput: CreateBiomarkerInput = {
  label: 'Ferritina',
  value: 40,
  unit: 'ng/mL',
  refMin: 20,
  refMax: 200,
  measuredAt: '2026-01-01',
};

const createdBiomarker: Biomarker = {
  id: 'bio-2',
  code: 'ferritina',
  label: 'Ferritina',
  value: 40,
  unit: 'ng/mL',
  refMin: 20,
  refMax: 200,
  measuredAt: '2026-01-01',
  status: 'normal',
};

function renderMutation(queryClient: ReturnType<typeof createTestQueryClient>, patientId: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useCreateBiomarkerMutation(patientId), { wrapper });
}

describe('useCreateBiomarkerMutation', () => {
  afterEach(() => {
    mockedCreateBiomarker.mockReset();
  });

  it('insere o biomarcador otimista no cache antes da promise de createBiomarker resolver', async () => {
    let resolveCreate: (value: Biomarker) => void = () => {};
    mockedCreateBiomarker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1', 'biomarkers'], [existingBiomarker]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate(validInput);

    await waitFor(() =>
      expect(
        queryClient.getQueryData<Biomarker[]>(['patient', 'patient-1', 'biomarkers']),
      ).toHaveLength(2),
    );
    const cached = queryClient.getQueryData<Biomarker[]>(['patient', 'patient-1', 'biomarkers']);
    expect(cached?.[0]).toMatchObject({
      label: 'Ferritina',
      value: 40,
      unit: 'ng/mL',
      refMin: 20,
      refMax: 200,
      measuredAt: '2026-01-01',
      status: 'normal',
    });

    resolveCreate(createdBiomarker);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('reverte para o snapshot anterior quando a mutation falha (onError)', async () => {
    mockedCreateBiomarker.mockRejectedValue(new ApiError('falha', 500));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1', 'biomarkers'], [existingBiomarker]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate(validInput);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(
      queryClient.getQueryData<Biomarker[]>(['patient', 'patient-1', 'biomarkers']),
    ).toEqual([existingBiomarker]);
  });

  it('invalida a query de biomarcadores do paciente com a queryKey certa após o sucesso', async () => {
    mockedCreateBiomarker.mockResolvedValue(createdBiomarker);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1', 'biomarkers'], [existingBiomarker]);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate(validInput);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['patient', 'patient-1', 'biomarkers'],
    });
  });

  it('invalida a query de biomarcadores do paciente mesmo quando a mutation falha', async () => {
    mockedCreateBiomarker.mockRejectedValue(new ApiError('falha', 500));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1', 'biomarkers'], [existingBiomarker]);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate(validInput);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['patient', 'patient-1', 'biomarkers'],
    });
  });
});
