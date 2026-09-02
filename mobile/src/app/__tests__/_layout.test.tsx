import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';

import { useBiometricGate } from '@/core/auth/useBiometricGate';
import { setupNetworkStatusListener } from '@/core/offline/network';

import TabLayout from '../_layout';

jest.mock('@/core/auth/useBiometricGate');
jest.mock('@/core/offline/network');

jest.mock('@/components/animated-icon', () => ({
  __esModule: true,
  AnimatedSplashOverlay: () => null,
}));

jest.mock('@/components/app-tabs', () => ({
  __esModule: true,
  default: () => <MockText>AppTabsStub</MockText>,
}));

const mockedUseBiometricGate = useBiometricGate as jest.MockedFunction<typeof useBiometricGate>;
const mockedSetupNetworkStatusListener = setupNetworkStatusListener as jest.MockedFunction<
  typeof setupNetworkStatusListener
>;

describe('TabLayout', () => {
  beforeEach(() => {
    mockedSetupNetworkStatusListener.mockReturnValue(jest.fn());
  });

  afterEach(() => {
    mockedUseBiometricGate.mockReset();
    mockedSetupNetworkStatusListener.mockReset();
  });

  it('liga o listener de status de rede uma única vez ao montar', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'checking',
      warning: undefined,
      retry: jest.fn(),
    });

    await render(<TabLayout />);

    expect(mockedSetupNetworkStatusListener).toHaveBeenCalledTimes(1);
  });

  it('não renderiza AppTabs enquanto o gate biométrico não resolveu', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'checking',
      warning: undefined,
      retry: jest.fn(),
    });

    const { queryByText } = await render(<TabLayout />);

    expect(queryByText('AppTabsStub')).toBeNull();
  });

  it('renderiza AppTabs assim que o gate biométrico resolve para unlocked', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'unlocked',
      reason: 'biometric',
      warning: undefined,
      retry: jest.fn(),
    });

    const { queryByText } = await render(<TabLayout />);

    expect(queryByText('AppTabsStub')).toBeTruthy();
  });

  it('mantém o aviso de segurança visível e só libera AppTabs após o usuário confirmar', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'unlocked',
      reason: 'no_credential_available',
      warning:
        'Este dispositivo não tem nenhum bloqueio de tela configurado (PIN, padrão, senha ou ' +
        'biometria). Isso não impede o uso do app, mas recomendamos ativar um bloqueio nas ' +
        'configurações do aparelho.',
      retry: jest.fn(),
    });

    const { queryByText, getByText } = await render(<TabLayout />);

    expect(queryByText('AppTabsStub')).toBeNull();
    expect(
      getByText(
        'Este dispositivo não tem nenhum bloqueio de tela configurado (PIN, padrão, senha ou ' +
          'biometria). Isso não impede o uso do app, mas recomendamos ativar um bloqueio nas ' +
          'configurações do aparelho.',
      ),
    ).toBeTruthy();

    fireEvent.press(getByText('Entendi, continuar'));

    await waitFor(() => expect(queryByText('AppTabsStub')).toBeTruthy());
  });
});
