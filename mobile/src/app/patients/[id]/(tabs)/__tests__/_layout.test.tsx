import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resolveBrand } from '@/brands';
import { deletePatient, fetchPatientDetail } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useIsOffline } from '@/core/offline/network';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientTabsLayout from '../_layout';

type TabsScreenOptions = {
  headerTitle?: string;
  headerLeft?: () => ReactNode;
  headerRight?: () => ReactNode;
};

jest.mock('@/core/api/patients');
jest.mock('@/core/offline/network');
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories can only reference identifiers required inside them
  const { Text, View } = require('react-native');

  function TabsMock({
    children,
    screenOptions,
  }: {
    children?: ReactNode;
    screenOptions?: TabsScreenOptions;
  }) {
    return (
      <View testID="patient-tabs">
        <Text testID="patient-detail-header-title">{screenOptions?.headerTitle}</Text>
        {screenOptions?.headerLeft?.()}
        {screenOptions?.headerRight?.()}
        {children}
      </View>
    );
  }
  function TabsScreenMock() {
    return null;
  }
  TabsMock.Screen = TabsScreenMock;

  return {
    useLocalSearchParams: jest.fn(),
    useRouter: jest.fn(),
    Tabs: TabsMock,
  };
});

const mockedFetchPatientDetail = fetchPatientDetail as jest.MockedFunction<typeof fetchPatientDetail>;
const mockedDeletePatient = deletePatient as jest.MockedFunction<typeof deletePatient>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockedUseIsOffline = useIsOffline as jest.MockedFunction<typeof useIsOffline>;

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();

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

function renderLayout() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={resolveBrand('nutri-care')}>
        <PatientTabsLayout />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('PatientTabsLayout', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseIsOffline.mockReturnValue(false);
    mockedUseRouter.mockReturnValue({
      back: mockRouterBack,
      push: mockRouterPush,
    } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    mockedFetchPatientDetail.mockReset();
    mockedDeletePatient.mockReset();
    mockedUseLocalSearchParams.mockReset();
    mockedUseRouter.mockReset();
    mockedUseIsOffline.mockReset();
    mockRouterBack.mockReset();
    mockRouterPush.mockReset();
  });

  it('exibe o skeleton enquanto o paciente está pendente, sem renderizar as abas', async () => {
    mockedFetchPatientDetail.mockReturnValue(new Promise(() => {}));

    const { getByTestId, queryByTestId } = await renderLayout();

    expect(getByTestId('patient-detail-skeleton')).toBeTruthy();
    expect(queryByTestId('patient-tabs')).toBeNull();
  });

  it('exibe erro com retry quando a busca do paciente falha', async () => {
    mockedFetchPatientDetail.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(fakePatient);

    const { getByText, getByTestId, findByTestId } = await renderLayout();

    await waitFor(() => expect(getByText('Não foi possível carregar o paciente.')).toBeTruthy());

    await fireEvent.press(getByTestId('patient-detail-retry'));

    await findByTestId('patient-tabs');
  });

  it('exibe erro específico de offline quando não há cache e a rede está pausada', async () => {
    mockedUseIsOffline.mockReturnValue(true);
    mockedFetchPatientDetail.mockReturnValue(new Promise(() => {}));

    const { getByText, queryByTestId } = await renderLayout();

    await waitFor(() =>
      expect(
        getByText(
          'Sem conexão. Abra este paciente pelo menos uma vez online para poder consultá-lo offline.',
        ),
      ).toBeTruthy(),
    );
    expect(queryByTestId('patient-detail-skeleton')).toBeNull();
    expect(queryByTestId('patient-tabs')).toBeNull();
  });

  it('renderiza as abas e o header com o nome do paciente, o botão de voltar e o menu quando carrega com sucesso', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);

    const { findByTestId, getByTestId } = await renderLayout();

    await findByTestId('patient-tabs');
    expect(getByTestId('patient-detail-header-title').props.children).toBe('Maria Silva');
    expect(getByTestId('patient-detail-back-button')).toBeTruthy();
    expect(getByTestId('patient-detail-menu-trigger')).toBeTruthy();
  });

  it('botão de voltar do header chama router.back()', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);

    const { findByTestId } = await renderLayout();

    await fireEvent.press(await findByTestId('patient-detail-back-button'));

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });

  it('menu do header: abrir, editar navega para a rota de edição e fecha o menu', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);

    const { findByTestId, getByTestId, queryByTestId } = await renderLayout();

    await fireEvent.press(await findByTestId('patient-detail-menu-trigger'));

    await waitFor(() => expect(getByTestId('patient-detail-edit-link')).toBeTruthy());

    await fireEvent.press(getByTestId('patient-detail-edit-link'));

    expect(mockRouterPush).toHaveBeenCalledWith('/patients/patient-1/edit');
    await waitFor(() => expect(queryByTestId('patient-detail-edit-link')).toBeNull());
  });

  it('menu do header: excluir confirma via Alert citando o nome do paciente, chama DELETE e volta para a lista', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedDeletePatient.mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Excluir');
      confirmButton?.onPress?.();
    });

    const { findByTestId, getByTestId } = await renderLayout();

    await fireEvent.press(await findByTestId('patient-detail-menu-trigger'));
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

  it('menu do header: cancelar o Alert não chama DELETE nem fecha a tela', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((button) => button.text === 'Cancelar');
      cancelButton?.onPress?.();
    });

    const { findByTestId, getByTestId } = await renderLayout();

    await fireEvent.press(await findByTestId('patient-detail-menu-trigger'));
    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    expect(mockedDeletePatient).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('menu do header: erro na exclusão mantém o menu aberto com a mensagem de erro visível', async () => {
    mockedFetchPatientDetail.mockResolvedValue(fakePatient);
    mockedDeletePatient.mockRejectedValue(new Error('delete failed'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Excluir');
      confirmButton?.onPress?.();
    });

    const { findByTestId, getByTestId } = await renderLayout();

    await fireEvent.press(await findByTestId('patient-detail-menu-trigger'));
    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    await waitFor(() => expect(getByTestId('patient-detail-delete-error')).toBeTruthy());
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(getByTestId('patient-detail-delete-button')).toBeTruthy();

    alertSpy.mockRestore();
  });
});
