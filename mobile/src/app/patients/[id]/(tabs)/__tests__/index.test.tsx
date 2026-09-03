import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { resolveBrand } from '@/brands';
import { fetchPatientBiomarkers, fetchPatientDetail, patchPatientFollowUp, updatePatientStatus } from '@/core/api/patients';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { calculateAge, formatDateBR } from '@/core/patients/date';
import { GOAL_LABELS } from '@/core/patients/labels';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientInfoScreen from '../index';

jest.mock('@/core/api/patients');
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
const mockedUpdatePatientStatus = updatePatientStatus as jest.MockedFunction<typeof updatePatientStatus>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;

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
        <PatientInfoScreen />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('PatientInfoScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
  });

  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
    mockedFetchPatientBiomarkers.mockReset();
    mockedPatchPatientFollowUp.mockReset();
    mockedUpdatePatientStatus.mockReset();
    mockedUseLocalSearchParams.mockReset();
  });

  it('exibe o skeleton dos biomarcadores enquanto a busca está pendente', async () => {
    mockedFetchPatientBiomarkers.mockReturnValue(new Promise(() => {}));

    const { findByTestId } = await renderScreen();

    expect(await findByTestId('patient-biomarkers-skeleton')).toBeTruthy();
  });

  it('exibe erro dos biomarcadores com retry, distinto do vazio', async () => {
    mockedFetchPatientBiomarkers.mockRejectedValue(new Error('boom'));

    const { getByText, findByText } = await renderScreen();

    await findByText('Não foi possível carregar os biomarcadores.');
    expect(() => getByText(resolveBrand('nutri-care').copy.emptyBiomarkers)).toThrow();
  });

  it('exibe a copy de biomarcador vazio da marca quando a lista vem vazia', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([]);

    const { findByText } = await renderScreen('nutri-care');

    await findByText(resolveBrand('nutri-care').copy.emptyBiomarkers);
  });

  it('exibe a copy de biomarcador vazio própria da marca vita-plus (distinta de nutri-care)', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([]);

    const { findByText } = await renderScreen('vita-plus');

    await findByText(resolveBrand('vita-plus').copy.emptyBiomarkers);
  });

  it('exibe label, valor, unidade, faixa de referência e status de cada biomarcador sem recalculá-lo', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { getByText, findByTestId } = await renderScreen();

    await findByTestId('biomarker-status-bio-1');
    expect(getByText('Hemoglobina glicada')).toBeTruthy();
    expect(getByText('7.2 % (ref. 4–6)')).toBeTruthy();
    expect(getByText('high')).toBeTruthy();
  });

  it('aplica o toggle imediatamente (otimista) e o desabilita enquanto a mutation está em voo', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    let resolvePatch: (value: Patient) => void = () => {};
    mockedPatchPatientFollowUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePatch = resolve;
        }),
    );

    const { findByTestId } = await renderScreen();

    const toggle = await findByTestId('follow-up-toggle');
    expect(toggle.props.disabled).toBe(false);

    await fireEvent(toggle, 'onValueChange', true);

    await waitFor(() => expect(toggle.props.value).toBe(true));
    expect(toggle.props.disabled).toBe(true);

    resolvePatch({ ...fakePatient, needsFollowUp: true });

    await waitFor(() => expect(toggle.props.disabled).toBe(false));
  });

  it('reverte o toggle visivelmente para o valor anterior quando a mutation falha', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    let rejectPatch: (reason: Error) => void = () => {};
    mockedPatchPatientFollowUp.mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectPatch = reject;
        }),
    );

    const { findByTestId } = await renderScreen();
    const toggle = await findByTestId('follow-up-toggle');

    await fireEvent(toggle, 'onValueChange', true);
    await waitFor(() => expect(toggle.props.value).toBe(true));

    await act(async () => {
      rejectPatch(new Error('patch failed'));
    });

    await waitFor(() => expect(toggle.props.value).toBe(false));
  });

  it('tocar num botão de ciclo de vida com sucesso atualiza o status exibido e o conjunto de botões', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedUpdatePatientStatus.mockResolvedValue({ ...fakePatient, status: 'inactive' });

    const { findByTestId, getByText, queryByText } = await renderScreen();

    const inactivate = await findByTestId('lifecycle-action-inactivate');
    await fireEvent.press(inactivate);

    expect(mockedUpdatePatientStatus).toHaveBeenCalledWith('patient-1', 'inactive');
    await waitFor(() => expect(getByText('Reativar')).toBeTruthy());
    expect(queryByText('Marcar como inativo')).toBeNull();
  });

  it('mudança de status com erro mantém o status e os botões anteriores visíveis, com mensagem de erro', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);
    mockedUpdatePatientStatus.mockRejectedValue(new Error('status change failed'));

    const { findByTestId, getByText } = await renderScreen();

    const inactivate = await findByTestId('lifecycle-action-inactivate');
    await fireEvent.press(inactivate);

    await findByTestId('patient-status-error');
    expect(getByText('Marcar como inativo')).toBeTruthy();
    expect(getByText('Concluir acompanhamento')).toBeTruthy();
  });

  it('renderiza o objetivo como badge traduzido, sem texto cru em inglês na tela', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { findByTestId, getByText, queryByText } = await renderScreen();

    await findByTestId('patient-goal-badge');
    expect(getByText(GOAL_LABELS.lose_weight)).toBeTruthy();
    expect(queryByText('lose_weight')).toBeNull();
  });

  it('calcula e exibe a idade do paciente ao lado do badge de objetivo', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { findByTestId } = await renderScreen();

    const age = await findByTestId('patient-age');
    expect(age.props.children.join('')).toBe(`${calculateAge(fakePatient.birthDate)} anos`);
  });

  it('exibe a data de nascimento formatada em dd/MM/yyyy, nunca no formato ISO cru', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { findByTestId, queryByText } = await renderScreen();

    const birthDate = await findByTestId('patient-birth-date');
    expect(birthDate.props.children.join('')).toBe(`Nascimento: ${formatDateBR(fakePatient.birthDate)}`);
    expect(queryByText(fakePatient.birthDate)).toBeNull();
  });

  it('renderiza o status do biomarcador com a cor neutra única do Badge, não mais a cor por status', async () => {
    mockedFetchPatientBiomarkers.mockResolvedValue([fakeBiomarker]);

    const { findByTestId } = await renderScreen('nutri-care');

    const badge = await findByTestId('biomarker-status-bio-1');
    const style = badge.props.style as { backgroundColor?: string };
    const nutriCareColors = resolveBrand('nutri-care').colors;

    expect(style.backgroundColor).toBe(nutriCareColors.surfaceMuted);
    expect(style.backgroundColor).not.toBe(nutriCareColors.danger);
  });
});
