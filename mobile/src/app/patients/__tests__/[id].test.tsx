import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { resolveBrand } from '@/brands';
import { fetchAiActions } from '@/core/api/ai-actions';
import {
  fetchPatientBiomarkers,
  fetchPatientDetail,
  patchPatientFollowUp,
} from '@/core/api/patients';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import type { Patient } from '@/core/api/schemas/patient';
import { useFlag } from '@/core/flags/useFlag';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useIsOffline } from '@/core/offline/network';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientDetailScreen from '../[id]';

jest.mock('@/core/api/patients');
jest.mock('@/core/api/ai-actions');
jest.mock('@/core/flags/useFlag');
jest.mock('@/core/offline/network');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

const mockedFetchPatientDetail = fetchPatientDetail as jest.MockedFunction<typeof fetchPatientDetail>;
const mockedFetchPatientBiomarkers = fetchPatientBiomarkers as jest.MockedFunction<
  typeof fetchPatientBiomarkers
>;
const mockedPatchPatientFollowUp = patchPatientFollowUp as jest.MockedFunction<
  typeof patchPatientFollowUp
>;
const mockedFetchAiActions = fetchAiActions as jest.MockedFunction<typeof fetchAiActions>;
const mockedUseFlag = useFlag as jest.MockedFunction<typeof useFlag>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockedUseIsOffline = useIsOffline as jest.MockedFunction<typeof useIsOffline>;

function flattenText(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return [];
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return [String(node)];
  }
  if (Array.isArray(node)) {
    return node.flatMap(flattenText);
  }
  if (typeof node === 'object' && 'children' in node) {
    return flattenText((node as { children: unknown }).children);
  }
  return [];
}

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

const fakeBiomarker: Biomarker = {
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

function renderScreen() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={resolveBrand('nutri-care')}>
        <PatientDetailScreen />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('PatientDetailScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseIsOffline.mockReturnValue(false);
    mockedUseFlag.mockReturnValue(true);
    mockedFetchAiActions.mockResolvedValue([]);
  });

  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
    mockedFetchPatientBiomarkers.mockReset();
    mockedPatchPatientFollowUp.mockReset();
    mockedFetchAiActions.mockReset();
    mockedUseFlag.mockReset();
    mockedUseLocalSearchParams.mockReset();
    mockedUseIsOffline.mockReset();
  });

  it('exibe o skeleton enquanto qualquer uma das duas buscas está pendente', async () => {
    mockedFetchPatientDetail.mockReturnValue(new Promise(() => {}));
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId } = await renderScreen();

    expect(getByTestId('patient-detail-skeleton')).toBeTruthy();
  });

  it('exibe erro distinto do vazio com retry quando qualquer uma das duas buscas falha', async () => {
    mockedFetchPatientDetail.mockRejectedValue(new Error('boom'));
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByText, getByTestId } = await renderScreen();

    await waitFor(() => expect(getByText('Não foi possível carregar o paciente.')).toBeTruthy());
    expect(() => getByText('Nenhum biomarcador registrado ainda')).toThrow();

    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    await fireEvent.press(getByTestId('patient-detail-retry'));

    await waitFor(() => expect(getByText('Maria Silva')).toBeTruthy());
  });

  it('exibe erro específico de offline em vez de skeleton infinito quando não há cache e a rede está pausada', async () => {
    mockedUseIsOffline.mockReturnValue(true);
    mockedFetchPatientDetail.mockReturnValue(new Promise(() => {}));
    mockedFetchPatientBiomarkers.mockReturnValue(new Promise(() => {}));

    const { getByText, queryByTestId } = await renderScreen();

    await waitFor(() =>
      expect(
        getByText(
          'Sem conexão. Abra este paciente pelo menos uma vez online para poder consultá-lo offline.',
        ),
      ).toBeTruthy(),
    );
    expect(queryByTestId('patient-detail-skeleton')).toBeNull();
  });

  it('exibe o estado vazio de biomarcadores com copy fixa quando a lista vem vazia', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([]);

    const { getByText } = await renderScreen();

    await waitFor(() =>
      expect(getByText('Nenhum biomarcador registrado ainda')).toBeTruthy(),
    );
  });

  it('exibe label, valor, unidade, faixa de referência e status de cada biomarcador sem recalculá-lo', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByText, getByTestId } = await renderScreen();

    await waitFor(() => expect(getByText('Hemoglobina glicada')).toBeTruthy());
    expect(getByText('7.2 % (ref. 4–6)')).toBeTruthy();
    expect(getByTestId('biomarker-status-bio-1')).toBeTruthy();
    expect(getByText('high')).toBeTruthy();
  });

  it('aplica o toggle imediatamente (otimista) e o desabilita enquanto a mutation está em voo', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    let resolvePatch: (value: Patient) => void = () => {};
    mockedPatchPatientFollowUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );

    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('follow-up-toggle')).toBeTruthy());
    expect(getByTestId('follow-up-toggle').props.disabled).toBe(false);

    await fireEvent(getByTestId('follow-up-toggle'), 'onValueChange', true);

    await waitFor(() => expect(getByTestId('follow-up-toggle').props.value).toBe(true));
    expect(getByTestId('follow-up-toggle').props.disabled).toBe(true);

    resolvePatch({ ...fakePatient, needsFollowUp: true });

    await waitFor(() => expect(getByTestId('follow-up-toggle').props.disabled).toBe(false));
  });

  it('reverte o toggle visivelmente para o valor anterior quando a mutation falha', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    let rejectPatch: (reason: Error) => void = () => {};
    mockedPatchPatientFollowUp.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPatch = reject;
        }),
    );

    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('follow-up-toggle')).toBeTruthy());

    await fireEvent(getByTestId('follow-up-toggle'), 'onValueChange', true);

    await waitFor(() => expect(getByTestId('follow-up-toggle').props.value).toBe(true));

    await act(async () => {
      rejectPatch(new Error('patch failed'));
    });

    await waitFor(() => expect(getByTestId('follow-up-toggle').props.value).toBe(false));
  });

  it('exibe a seção de ações de IA depois dos biomarcadores', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedFetchAiActions.mockResolvedValue([
      {
        id: 'ai-action-1',
        patientId: 'patient-1',
        title: 'Reduzir consumo de açúcar',
        rationale: 'HbA1c acima da faixa de referência',
        priority: 'high',
        biomarkers: ['hba1c'],
        status: 'pending',
        createdAt: '2026-01-01T10:00:00Z',
      },
    ]);

    const { getByText, toJSON } = await renderScreen();

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());

    const order = flattenText(toJSON());
    const biomarkerIndex = order.indexOf('Hemoglobina glicada');
    const aiSectionIndex = order.indexOf('Ações de acompanhamento');

    expect(biomarkerIndex).toBeGreaterThanOrEqual(0);
    expect(aiSectionIndex).toBeGreaterThan(biomarkerIndex);
  });

  it('erro só na busca de ações de IA não impede paciente e biomarcadores de aparecerem', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedFetchAiActions.mockRejectedValue(new Error('ai-actions boom'));

    const { getByText } = await renderScreen();

    await waitFor(() => expect(getByText('Maria Silva')).toBeTruthy());
    expect(getByText('Hemoglobina glicada')).toBeTruthy();
    await waitFor(() =>
      expect(getByText('Não foi possível carregar as ações de acompanhamento.')).toBeTruthy(),
    );
  });
});
