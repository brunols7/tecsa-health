import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

const NO_BIOMETRIC_ENROLLED_WARNING =
  'Este dispositivo não tem biometria cadastrada. Vamos confirmar com a credencial do aparelho.';
const NO_CREDENTIAL_AVAILABLE_WARNING =
  'Este dispositivo não tem nenhum bloqueio de tela configurado (PIN, padrão, senha ou ' +
  'biometria). Isso não impede o uso do app, mas recomendamos ativar um bloqueio nas ' +
  'configurações do aparelho.';

type BiometricGateState =
  | { status: 'checking' }
  | { status: 'locked'; retryable: true }
  | { status: 'unlocked'; reason: 'biometric' | 'device_credential' | 'no_credential_available' };

export type BiometricGateResult =
  | { status: 'checking'; warning?: string; retry: () => void }
  | { status: 'locked'; retryable: true; warning?: string; retry: () => void }
  | {
      status: 'unlocked';
      reason: 'biometric' | 'device_credential' | 'no_credential_available';
      warning?: string;
      retry: () => void;
    };

export function useBiometricGate(): BiometricGateResult {
  const [state, setState] = useState<BiometricGateState>({ status: 'checking' });
  const [warning, setWarning] = useState<string | undefined>(undefined);

  const executeGate = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = hasHardware && (await LocalAuthentication.isEnrolledAsync());

      if (enrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          disableDeviceFallback: true,
        });

        if (result.success) {
          setState({ status: 'unlocked', reason: 'biometric' });
        } else {
          setState({ status: 'locked', retryable: true });
        }
        return;
      }

      setWarning(NO_BIOMETRIC_ENROLLED_WARNING);
      const deviceResult = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });

      if (deviceResult.success) {
        // A credencial do aparelho é uma verificação real (PIN/padrão/senha), não um caso
        // degradado — limpa o aviso de biometria ausente em vez de exigir reconhecimento dele.
        setWarning(undefined);
        setState({ status: 'unlocked', reason: 'device_credential' });
        return;
      }

      // 'passcode_not_set' is iOS's code for "no device credential"; Android's
      // KeyguardManager#isDeviceSecure() check reports the same condition as 'not_enrolled'.
      if (deviceResult.error === 'passcode_not_set' || deviceResult.error === 'not_enrolled') {
        setWarning(NO_CREDENTIAL_AVAILABLE_WARNING);
        setState({ status: 'unlocked', reason: 'no_credential_available' });
        return;
      }

      setState({ status: 'locked', retryable: true });
    } catch {
      setState({ status: 'locked', retryable: true });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gate result only exists after an async round-trip with the OS
    void executeGate();
  }, [executeGate]);

  const retry = useCallback(() => {
    setState({ status: 'checking' });
    setWarning(undefined);
    void executeGate();
  }, [executeGate]);

  return { ...state, warning, retry };
}
