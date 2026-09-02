import type { ReactNode } from 'react';
import type { InfiniteData } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { patchPatientFollowUp } from '@/core/api/patients';
import type { Patient, PatientPage } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useSetFollowUpMutation } from '@/core/patients/useSetFollowUpMutation';

jest.mock('@/core/api/patients');

const mockedPatchPatientFollowUp = patchPatientFollowUp as jest.MockedFunction<
  typeof patchPatientFollowUp
>;

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

const fakePatient: Patient = {
  id: 'patient-1',
  name: 'Maria Silva',
  birthDate: '1990-01-01',
  goal: 'weight-loss',
  status: 'active',
  needsFollowUp: false,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderMutation(queryClient: ReturnType<typeof createTestQueryClient>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useSetFollowUpMutation(), { wrapper });
}

describe('useSetFollowUpMutation', () => {
  afterEach(() => {
    mockedPatchPatientFollowUp.mockReset();
  });

  it('aplica o valor otimista imediatamente no cache do detalhe (onMutate)', async () => {
    mockedPatchPatientFollowUp.mockResolvedValue({ ...fakePatient, needsFollowUp: true });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() =>
      expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])?.needsFollowUp).toBe(
        true,
      ),
    );
  });

  it('reverte para o snapshot anterior quando a mutation falha (onError)', async () => {
    mockedPatchPatientFollowUp.mockRejectedValue(new Error('patch failed'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])).toEqual(fakePatient);
  });

  it('invalida as queries de detalhe e de lista em onSettled quando a mutation tem sucesso', async () => {
    mockedPatchPatientFollowUp.mockResolvedValue({ ...fakePatient, needsFollowUp: true });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patient', 'patient-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients', 'brand-a'] });
  });

  it('invalida as queries de detalhe e de lista em onSettled mesmo quando a mutation falha', async () => {
    mockedPatchPatientFollowUp.mockRejectedValue(new Error('patch failed'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patient', 'patient-1'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients', 'brand-a'] });
  });

  it('aplica o valor otimista imediatamente no cache da listagem (onMutate)', async () => {
    mockedPatchPatientFollowUp.mockResolvedValue({ ...fakePatient, needsFollowUp: true });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);
    const listData: InfiniteData<PatientPage> = {
      pages: [{ data: [fakePatient], nextCursor: null }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(['patients', 'brand-a', ''], listData);

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() =>
      expect(
        queryClient.getQueryData<InfiniteData<PatientPage>>(['patients', 'brand-a', ''])?.pages[0]
          .data[0].needsFollowUp,
      ).toBe(true),
    );
  });

  it('reverte o cache da listagem para o snapshot anterior quando a mutation falha (onError)', async () => {
    mockedPatchPatientFollowUp.mockRejectedValue(new Error('patch failed'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);
    const listData: InfiniteData<PatientPage> = {
      pages: [{ data: [fakePatient], nextCursor: null }],
      pageParams: [undefined],
    };
    queryClient.setQueryData(['patients', 'brand-a', ''], listData);

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(
      queryClient.getQueryData<InfiniteData<PatientPage>>(['patients', 'brand-a', ''])?.pages[0]
        .data[0].needsFollowUp,
    ).toBe(false);
  });

  it('mantém isPending true enquanto a mutation está em voo', async () => {
    let resolvePatch: (value: Patient) => void = () => {};
    mockedPatchPatientFollowUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    expect(result.current.isPending).toBe(false);

    result.current.mutate({ id: 'patient-1', needsFollowUp: true });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    resolvePatch({ ...fakePatient, needsFollowUp: true });

    await waitFor(() => expect(result.current.isPending).toBe(false));
  });
});
