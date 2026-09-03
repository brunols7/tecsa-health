import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { ApiError } from '@/core/api/http';
import { createPatient } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';

import NewPatientScreen from '../new';

jest.mock('@/core/api/patients');
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

const mockedCreatePatient = createPatient as jest.MockedFunction<typeof createPatient>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockRouterPush = jest.fn();

const fakeCreatedPatient: Patient = {
  id: 'patient-new-1',
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
        <NewPatientScreen />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

async function fillValidForm(getByTestId: Awaited<ReturnType<typeof renderScreen>>['getByTestId']) {
  await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Silva');
  await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '1990-05-05');
  await fireEvent.press(getByTestId('patient-form-goal-lose_weight'));
}

describe('NewPatientScreen', () => {
  beforeEach(() => {
    mockedUseRouter.mockReturnValue({ push: mockRouterPush } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    mockedCreatePatient.mockReset();
    mockedUseRouter.mockReset();
    mockRouterPush.mockReset();
  });

  it('envio com sucesso chama POST /patients e navega para o detalhe do paciente novo', async () => {
    mockedCreatePatient.mockResolvedValue(fakeCreatedPatient);
    const { getByTestId } = await renderScreen();

    await fillValidForm(getByTestId);
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(mockedCreatePatient).toHaveBeenCalledWith({
      name: 'Maria Silva',
      birthDate: '1990-05-05',
      goal: 'lose_weight',
      brand: 'nutri-care',
    }));
    await waitFor(() => expect(mockRouterPush).toHaveBeenCalledWith('/patients/patient-new-1'));
  });

  it('erro 422 mapeia o erro de campo devolvido pela API de volta para o campo do formulário', async () => {
    mockedCreatePatient.mockRejectedValue(
      new ApiError('Corpo inválido', 422, 'VALIDATION_ERROR', {
        name: ['Já existe um paciente com este nome'],
      }),
    );
    const { getByTestId, getByText } = await renderScreen();

    await fillValidForm(getByTestId);
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-form-name-error')).toBeTruthy());
    expect(getByText('Já existe um paciente com este nome')).toBeTruthy();
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('erro de rede mostra opção de tentar de novo e preserva os dados já digitados', async () => {
    mockedCreatePatient.mockRejectedValue(new Error('Network request failed'));
    const { getByTestId } = await renderScreen();

    await fillValidForm(getByTestId);
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-new-error')).toBeTruthy());
    expect(getByTestId('patient-form-name-input').props.value).toBe('Maria Silva');
    expect(getByTestId('patient-form-birthdate-input').props.value).toBe('1990-05-05');
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});
