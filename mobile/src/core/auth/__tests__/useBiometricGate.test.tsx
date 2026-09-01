import { renderHook, waitFor } from '@testing-library/react-native';
import * as LocalAuthentication from 'expo-local-authentication';

import { useBiometricGate, type BiometricGateResult } from '@/core/auth/useBiometricGate';

jest.mock('expo-local-authentication');

const mockedHasHardwareAsync = LocalAuthentication.hasHardwareAsync as jest.MockedFunction<
  typeof LocalAuthentication.hasHardwareAsync
>;
const mockedIsEnrolledAsync = LocalAuthentication.isEnrolledAsync as jest.MockedFunction<
  typeof LocalAuthentication.isEnrolledAsync
>;
const mockedAuthenticateAsync = LocalAuthentication.authenticateAsync as jest.MockedFunction<
  typeof LocalAuthentication.authenticateAsync
>;

function assertUnlocked(
  gate: BiometricGateResult,
): asserts gate is Extract<BiometricGateResult, { status: 'unlocked' }> {
  if (gate.status !== 'unlocked') {
    throw new Error(`esperava status 'unlocked', recebeu '${gate.status}'`);
  }
}

function assertLocked(
  gate: BiometricGateResult,
): asserts gate is Extract<BiometricGateResult, { status: 'locked' }> {
  if (gate.status !== 'locked') {
    throw new Error(`esperava status 'locked', recebeu '${gate.status}'`);
  }
}

describe('useBiometricGate', () => {
  afterEach(() => {
    mockedHasHardwareAsync.mockReset();
    mockedIsEnrolledAsync.mockReset();
    mockedAuthenticateAsync.mockReset();
  });

  it('biometria cadastrada e autenticação bem-sucedida libera com reason biometric', async () => {
    mockedHasHardwareAsync.mockResolvedValue(true);
    mockedIsEnrolledAsync.mockResolvedValue(true);
    mockedAuthenticateAsync.mockResolvedValue({ success: true });

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('unlocked'));

    assertUnlocked(result.current);
    expect(result.current.reason).toBe('biometric');
    expect(result.current.warning).toBeUndefined();
    expect(mockedAuthenticateAsync).toHaveBeenCalledWith({ disableDeviceFallback: true });
  });

  it('biometria cadastrada mas autenticação falha mantém locked com retry, e retry recupera', async () => {
    mockedHasHardwareAsync.mockResolvedValue(true);
    mockedIsEnrolledAsync.mockResolvedValue(true);
    mockedAuthenticateAsync.mockResolvedValueOnce({
      success: false,
      error: 'authentication_failed',
    });

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('locked'));

    const afterFailure = result.current;
    assertLocked(afterFailure);
    expect(afterFailure.retryable).toBe(true);

    mockedAuthenticateAsync.mockResolvedValueOnce({ success: true });
    result.current.retry();

    await waitFor(() => expect(result.current.status).toBe('unlocked'));

    const afterRetry = result.current;
    assertUnlocked(afterRetry);
    expect(afterRetry.reason).toBe('biometric');
  });

  it('sem biometria cadastrada mas credencial de device bem-sucedida libera com aviso', async () => {
    mockedHasHardwareAsync.mockResolvedValue(true);
    mockedIsEnrolledAsync.mockResolvedValue(false);
    mockedAuthenticateAsync.mockResolvedValue({ success: true });

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('unlocked'));

    assertUnlocked(result.current);
    expect(result.current.reason).toBe('device_credential');
    expect(result.current.warning).toBe(
      'Este dispositivo não tem biometria cadastrada. Confirme com a credencial do aparelho.',
    );
    expect(mockedAuthenticateAsync).toHaveBeenCalledWith({ disableDeviceFallback: false });
  });

  it('sem nenhuma credencial configurada (passcode_not_set) libera com aviso de segurança', async () => {
    mockedHasHardwareAsync.mockResolvedValue(false);
    mockedIsEnrolledAsync.mockResolvedValue(false);
    mockedAuthenticateAsync.mockResolvedValue({ success: false, error: 'passcode_not_set' });

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('unlocked'));

    assertUnlocked(result.current);
    expect(result.current.reason).toBe('no_credential_available');
    expect(result.current.warning).toBe(
      'Acesso liberado sem verificação. Nenhuma credencial está configurada neste dispositivo.',
    );
  });

  it('cancelamento do prompt biométrico é tratado como falha, não como sucesso nem sem-credencial', async () => {
    mockedHasHardwareAsync.mockResolvedValue(true);
    mockedIsEnrolledAsync.mockResolvedValue(true);
    mockedAuthenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('locked'));

    assertLocked(result.current);
    expect(result.current.retryable).toBe(true);
  });

  it('erro inesperado do módulo nativo nunca escapa como exceção não tratada', async () => {
    mockedHasHardwareAsync.mockRejectedValue(new Error('sensor indisponível'));

    const { result } = await renderHook(() => useBiometricGate());

    await waitFor(() => expect(result.current.status).toBe('locked'));

    assertLocked(result.current);
    expect(result.current.retryable).toBe(true);
  });
});
