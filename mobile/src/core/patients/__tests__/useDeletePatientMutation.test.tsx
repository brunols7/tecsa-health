import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { deletePatient } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useDeletePatientMutation } from '@/core/patients/useDeletePatientMutation';

jest.mock('@/core/api/patients');

const mockedDeletePatient = deletePatient as jest.MockedFunction<typeof deletePatient>;

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

const fakePatient: Patient = {
  id: 'patient-1',
  name: 'Maria Silva',
  birthDate: '1990-01-01',
  goal: 'lose_weight',
  status: 'active',
  needsFollowUp: false,
  statusChangedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderMutation(queryClient: ReturnType<typeof createTestQueryClient>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={fakeBrand}>{children}</BrandProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useDeletePatientMutation(), { wrapper });
}

describe('useDeletePatientMutation', () => {
  afterEach(() => {
    mockedDeletePatient.mockReset();
  });

  it('remove o paciente do cache de detalhe e invalida a lista quando a exclusão tem sucesso', async () => {
    mockedDeletePatient.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient);

    result.current.mutate('patient-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients', 'brand-a'] });
  });

  it('propaga o erro para o chamador mostrar a mensagem de tentar excluir de novo, mantendo o paciente no cache', async () => {
    mockedDeletePatient.mockRejectedValue(new Error('delete failed'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    result.current.mutate('patient-1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('delete failed'));
    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])).toEqual(fakePatient);
  });
});
