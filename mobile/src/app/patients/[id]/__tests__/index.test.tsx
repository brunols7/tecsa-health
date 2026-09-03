import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { fetchAiActions } from '@/core/api/ai-actions';
import {
  deletePatient,
  fetchPatientBiomarkers,
  fetchPatientDetail,
  patchPatientFollowUp,
  updatePatientStatus,
} from '@/core/api/patients';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import type { Patient } from '@/core/api/schemas/patient';
import { useFlag } from '@/core/flags/useFlag';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useIsOffline } from '@/core/offline/network';
import { calculateAge, formatDateBR } from '@/core/patients/date';
import { GOAL_LABELS } from '@/core/patients/labels';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientDetailScreen from '../index';

jest.mock('@/core/api/patients');
jest.mock('@/core/api/ai-actions');
jest.mock('@/core/flags/useFlag');
jest.mock('@/core/offline/network');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

const mockedFetchPatientDetail = fetchPatientDetail as jest.MockedFunction<typeof fetchPatientDetail>;
const mockedFetchPatientBiomarkers = fetchPatientBiomarkers as jest.MockedFunction<
  typeof fetchPatientBiomarkers
>;
const mockedPatchPatientFollowUp = patchPatientFollowUp as jest.MockedFunction<
  typeof patchPatientFollowUp
>;
const mockedDeletePatient = deletePatient as jest.MockedFunction<typeof deletePatient>;
const mockedUpdatePatientStatus = updatePatientStatus as jest.MockedFunction<
  typeof updatePatientStatus
>;
const mockedFetchAiActions = fetchAiActions as jest.MockedFunction<typeof fetchAiActions>;
const mockedUseFlag = useFlag as jest.MockedFunction<typeof useFlag>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseIsOffline = useIsOffline as jest.MockedFunction<typeof useIsOffline>;
const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

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

function renderScreen(brandId: 'nutri-care' | 'vita-plus' = 'nutri-care') {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={resolveBrand(brandId)}>
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
    mockedUseRouter.mockReturnValue({
      back: mockRouterBack,
      push: mockRouterPush,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
    mockedFetchPatientBiomarkers.mockReset();
    mockedPatchPatientFollowUp.mockReset();
    mockedDeletePatient.mockReset();
    mockedUpdatePatientStatus.mockReset();
    mockedFetchAiActions.mockReset();
    mockedUseFlag.mockReset();
    mockedUseLocalSearchParams.mockReset();
    mockedUseRouter.mockReset();
    mockedUseIsOffline.mockReset();
    mockRouterBack.mockReset();
    mockRouterPush.mockReset();
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
    expect(() => getByText(resolveBrand('nutri-care').copy.emptyBiomarkers)).toThrow();

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

  it('exibe a copy de biomarcador vazio da marca quando a lista vem vazia', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([]);

    const { getByText } = await renderScreen('nutri-care');

    await waitFor(() =>
      expect(getByText(resolveBrand('nutri-care').copy.emptyBiomarkers)).toBeTruthy(),
    );
  });

  it('exibe a copy de biomarcador vazio própria da marca vita-plus (distinta de nutri-care)', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([]);

    const { getByText } = await renderScreen('vita-plus');

    await waitFor(() =>
      expect(getByText(resolveBrand('vita-plus').copy.emptyBiomarkers)).toBeTruthy(),
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

  it('toque em excluir abre Alert citando o nome do paciente; confirmar chama DELETE e volta para a lista', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedDeletePatient.mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Excluir');
      confirmButton?.onPress?.();
    });

    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-detail-delete-button')).toBeTruthy());
    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Excluir Maria Silva?',
      expect.any(String),
      expect.arrayContaining([expect.objectContaining({ text: 'Excluir', style: 'destructive' })]),
    );
    await waitFor(() => expect(mockedDeletePatient).toHaveBeenCalledWith('patient-1'));
    await waitFor(() => expect(mockRouterBack).toHaveBeenCalled());

    alertSpy.mockRestore();
  });

  it('cancelar o Alert de exclusão não chama DELETE e mantém o paciente na tela', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((button) => button.text === 'Cancelar');
      cancelButton?.onPress?.();
    });

    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-detail-delete-button')).toBeTruthy());
    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    expect(mockedDeletePatient).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(getByText('Maria Silva')).toBeTruthy();

    alertSpy.mockRestore();
  });

  it('exibe erro e mantém o paciente visível quando a exclusão falha', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedDeletePatient.mockRejectedValue(new Error('delete failed'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Excluir');
      confirmButton?.onPress?.();
    });

    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-detail-delete-button')).toBeTruthy());
    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    await waitFor(() => expect(getByTestId('patient-detail-delete-error')).toBeTruthy());
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(getByText('Maria Silva')).toBeTruthy();

    alertSpy.mockRestore();
  });

  it('tocar num botão de ciclo de vida com sucesso atualiza o status exibido e o conjunto de botões', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedUpdatePatientStatus.mockResolvedValue({ ...fakePatient, status: 'inactive' });

    const { getByTestId, getByText, queryByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('lifecycle-action-inactivate')).toBeTruthy());
    await fireEvent.press(getByTestId('lifecycle-action-inactivate'));

    expect(mockedUpdatePatientStatus).toHaveBeenCalledWith('patient-1', 'inactive');
    await waitFor(() => expect(getByText('Reativar')).toBeTruthy());
    expect(queryByText('Marcar como inativo')).toBeNull();
  });

  it('mudança de status com erro mantém o status e os botões anteriores visíveis, com mensagem de erro', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedUpdatePatientStatus.mockRejectedValue(new Error('status change failed'));

    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('lifecycle-action-inactivate')).toBeTruthy());
    await fireEvent.press(getByTestId('lifecycle-action-inactivate'));

    await waitFor(() => expect(getByTestId('patient-status-error')).toBeTruthy());
    expect(getByText('Marcar como inativo')).toBeTruthy();
    expect(getByText('Concluir acompanhamento')).toBeTruthy();
  });

  it('botão "Editar" navega para a rota de edição do paciente', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-detail-edit-link')).toBeTruthy());
    await fireEvent.press(getByTestId('patient-detail-edit-link'));

    expect(mockRouterPush).toHaveBeenCalledWith('/patients/patient-1/edit');
  });

  it('renderiza o objetivo como badge traduzido, sem texto cru em inglês na tela', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId, getByText, queryByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-goal-badge')).toBeTruthy());
    expect(getByText(GOAL_LABELS.lose_weight)).toBeTruthy();
    expect(queryByText('lose_weight')).toBeNull();
  });

  it('calcula e exibe a idade do paciente ao lado do badge de objetivo', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-age')).toBeTruthy());
    expect(getByTestId('patient-age').props.children.join('')).toBe(
      `${calculateAge(fakePatient.birthDate)} anos`,
    );
  });

  it('exibe a data de nascimento formatada em dd/MM/yyyy, nunca no formato ISO cru', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId, queryByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-birth-date')).toBeTruthy());
    expect(getByTestId('patient-birth-date').props.children.join('')).toBe(
      `Nascimento: ${formatDateBR(fakePatient.birthDate)}`,
    );
    expect(queryByText(fakePatient.birthDate)).toBeNull();
  });

  it('renderiza o status do biomarcador com a cor neutra única do Badge, não mais a cor por status', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByTestId } = await renderScreen('nutri-care');

    await waitFor(() => expect(getByTestId('biomarker-status-bio-1')).toBeTruthy());
    const style = getByTestId('biomarker-status-bio-1').props.style as { backgroundColor?: string };
    const nutriCareColors = resolveBrand('nutri-care').colors;

    expect(style.backgroundColor).toBe(nutriCareColors.surfaceMuted);
    expect(style.backgroundColor).not.toBe(nutriCareColors.danger);
  });
});
