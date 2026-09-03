import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/core/api/http';
import { updatePatientStatus } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { useChangePatientStatusMutation } from '@/core/patients/useChangePatientStatusMutation';

jest.mock('@/core/api/patients');

const mockedUpdatePatientStatus = updatePatientStatus as jest.MockedFunction<
  typeof updatePatientStatus
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

  return renderHook(() => useChangePatientStatusMutation(), { wrapper });
}

describe('useChangePatientStatusMutation', () => {
  afterEach(() => {
    mockedUpdatePatientStatus.mockReset();
  });

  it('atualiza o status exibido no cache do detalhe quando a mudança tem sucesso', async () => {
    const updatedPatient: Patient = { ...fakePatient, status: 'inactive' };
    mockedUpdatePatientStatus.mockResolvedValue(updatedPatient);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    result.current.mutate({ id: 'patient-1', status: 'inactive' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])?.status).toBe('inactive');
  });

  it('mantém o status anterior visível sem crash quando a mudança falha por erro de rede genérico', async () => {
    mockedUpdatePatientStatus.mockRejectedValue(new Error('network error'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    expect(() => result.current.mutate({ id: 'patient-1', status: 'inactive' })).not.toThrow();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])?.status).toBe('active');
  });

  it('mantém o status anterior visível sem crash quando a API responde 409 (transição inválida)', async () => {
    mockedUpdatePatientStatus.mockRejectedValue(
      new ApiError('Transição inválida', 409, 'INVALID_STATUS_TRANSITION'),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['patient', 'patient-1'], fakePatient);

    const { result } = await renderMutation(queryClient);

    expect(() => result.current.mutate({ id: 'patient-1', status: 'completed' })).not.toThrow();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(409);
    expect(queryClient.getQueryData<Patient>(['patient', 'patient-1'])?.status).toBe('active');
  });
});
