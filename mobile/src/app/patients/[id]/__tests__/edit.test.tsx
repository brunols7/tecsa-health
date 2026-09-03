import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { ApiError } from '@/core/api/http';
import { fetchPatientDetail, updatePatient } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';

import EditPatientScreen from '../edit';

jest.mock('@/core/api/patients');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

const mockedFetchPatientDetail = fetchPatientDetail as jest.MockedFunction<typeof fetchPatientDetail>;
const mockedUpdatePatient = updatePatient as jest.MockedFunction<typeof updatePatient>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<typeof useLocalSearchParams>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

const fakePatient: Patient = {
  id: 'patient-1',
  name: 'Maria Silva',
  birthDate: '1990-05-05',
  goal: 'lose_weight',
  status: 'active',
  needsFollowUp: false,
  statusChangedAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderScreen() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={resolveBrand('nutri-care')}>
        <EditPatientScreen />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('EditPatientScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseRouter.mockReturnValue({
      back: mockRouterBack,
      replace: mockRouterReplace,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
    mockedUpdatePatient.mockReset();
    mockedUseLocalSearchParams.mockReset();
    mockedUseRouter.mockReset();
    mockRouterBack.mockReset();
    mockRouterReplace.mockReset();
  });

  it('abre o formulário pré-preenchido com os dados atuais do paciente', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-form-name-input')).toBeTruthy());
    expect(getByTestId('patient-form-name-input').props.value).toBe('Maria Silva');
    expect(getByTestId('patient-form-birthdate-input').props.value).toBe('05/05/1990');
  });

  it('envia só os campos alterados e, com sucesso, volta para o detalhe atualizado', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedUpdatePatient.mockResolvedValue({ ...fakePatient, name: 'Maria Souza' });
    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-form-name-input')).toBeTruthy());
    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Souza');
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() =>
      expect(mockedUpdatePatient).toHaveBeenCalledWith('patient-1', { name: 'Maria Souza' }),
    );
    await waitFor(() => expect(mockRouterBack).toHaveBeenCalled());
  });

  it('erro 422 mapeia o erro de campo devolvido pela API de volta para o campo do formulário', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedUpdatePatient.mockRejectedValue(
      new ApiError('Corpo inválido', 422, 'VALIDATION_ERROR', {
        birthDate: ['Data de nascimento inválida'],
      }),
    );
    const { getByTestId, getByText } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-form-name-input')).toBeTruthy());
    await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '06051990');
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-form-birthdate-error')).toBeTruthy());
    expect(getByText('Data de nascimento inválida')).toBeTruthy();
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('trata 404 (paciente excluído por outra sessão) como erro e navega para a lista', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedUpdatePatient.mockRejectedValue(new ApiError('Paciente não encontrado', 404, 'PATIENT_NOT_FOUND'));
    const { getByTestId } = await renderScreen();

    await waitFor(() => expect(getByTestId('patient-form-name-input')).toBeTruthy());
    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Souza');
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-edit-form-error')).toBeTruthy());
    await waitFor(() => expect(mockRouterReplace).toHaveBeenCalledWith('/'));
    expect(mockRouterBack).not.toHaveBeenCalled();
  });
});
