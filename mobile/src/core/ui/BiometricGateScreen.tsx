import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/core/theme/useTheme';
import type { BiometricGateResult } from '@/core/auth/useBiometricGate';

type BiometricGateScreenProps = {
  status: BiometricGateResult['status'];
  reason?: Extract<BiometricGateResult, { status: 'unlocked' }>['reason'];
  warning?: string;
  onRetry: () => void;
  onContinue?: () => void;
};

export function BiometricGateScreen({
  status,
  reason,
  warning,
  onRetry,
  onContinue,
}: BiometricGateScreenProps) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing(6),
          gap: spacing(4),
        }}
      >
        {status === 'checking' && (
          <>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: typography.fontFamily.bold,
                fontSize: typography.scale.lg,
              }}
            >
              Verificando identidade
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.sm,
                textAlign: 'center',
              }}
            >
              Confirme sua identidade para acessar a carteira de pacientes.
            </Text>
          </>
        )}

        {status === 'locked' && (
          <>
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: typography.fontFamily.bold,
                fontSize: typography.scale.lg,
              }}
            >
              Não foi possível confirmar sua identidade
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.sm,
                textAlign: 'center',
              }}
            >
              Tente novamente para acessar a carteira de pacientes.
            </Text>
            <Pressable
              onPress={onRetry}
              style={{
                backgroundColor: colors.accent,
                borderRadius: radii.md,
                paddingVertical: spacing(3),
                paddingHorizontal: spacing(6),
              }}
            >
              <Text
                style={{
                  color: colors.accentContrast,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.scale.md,
                }}
              >
                Tentar novamente
              </Text>
            </Pressable>
          </>
        )}

        {status === 'unlocked' && (
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: typography.fontFamily.bold,
              fontSize: typography.scale.lg,
            }}
          >
            {reason === 'biometric' ? 'Identidade confirmada' : 'Acesso liberado'}
          </Text>
        )}

        {warning !== undefined && (
          <Text
            style={{
              color: colors.warning,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.sm,
              textAlign: 'center',
            }}
          >
            {warning}
          </Text>
        )}

        {status === 'unlocked' && warning !== undefined && onContinue !== undefined && (
          <Pressable
            onPress={onContinue}
            style={{
              backgroundColor: colors.accent,
              borderRadius: radii.md,
              paddingVertical: spacing(3),
              paddingHorizontal: spacing(6),
            }}
          >
            <Text
              style={{
                color: colors.accentContrast,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.scale.md,
              }}
            >
              Continuar
            </Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
