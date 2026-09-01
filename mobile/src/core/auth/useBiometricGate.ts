import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

const NO_BIOMETRIC_ENROLLED_WARNING =
  'Este dispositivo não tem biometria cadastrada. Confirme com a credencial do aparelho.';
const NO_CREDENTIAL_AVAILABLE_WARNING =
  'Acesso liberado sem verificação. Nenhuma credencial está configurada neste dispositivo.';

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
        setState({ status: 'unlocked', reason: 'device_credential' });
        return;
      }

      if (deviceResult.error === 'passcode_not_set') {
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
