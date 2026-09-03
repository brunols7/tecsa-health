import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createPatient } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useCreatePatientMutation } from '@/core/patients/useCreatePatientMutation';

jest.mock('@/core/api/patients');

const mockedCreatePatient = createPatient as jest.MockedFunction<typeof createPatient>;

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

  return renderHook(() => useCreatePatientMutation(), { wrapper });
}

describe('useCreatePatientMutation', () => {
  afterEach(() => {
    mockedCreatePatient.mockReset();
  });

  it('invalida a lista de pacientes quando a criação tem sucesso', async () => {
    mockedCreatePatient.mockResolvedValue(fakePatient);
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient);

    result.current.mutate({
      name: 'Maria Silva',
      birthDate: '1990-01-01',
      goal: 'lose_weight',
      brand: 'brand-a',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['patients', 'brand-a'] });
    expect(result.current.data).toEqual(fakePatient);
  });

  it('propaga o erro para o chamador sem estado otimista para reverter', async () => {
    mockedCreatePatient.mockRejectedValue(new Error('create failed'));
    const queryClient = createTestQueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = await renderMutation(queryClient);

    result.current.mutate({
      name: 'Maria Silva',
      birthDate: '1990-01-01',
      goal: 'lose_weight',
      brand: 'brand-a',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('create failed'));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
