import { Pressable, Text, View } from 'react-native';

import { formatDateBR } from '@/core/patients/date';
import { lifecycleActionLabel } from '@/core/patients/labels';
import type { Patient } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

type LifecycleButtonProps = {
  testID: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function LifecycleButton({ testID, label, disabled, onPress }: LifecycleButtonProps) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: disabled ? colors.surfaceMuted : colors.accent,
        borderRadius: radii.md,
        paddingVertical: spacing(3),
        paddingHorizontal: spacing(4),
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.accentContrast,
          fontFamily: typography.fontFamily.medium,
          fontSize: typography.scale.sm,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SinceLabel({ text }: { text: string }) {
  const { colors, typography, spacing } = useTheme();

  return (
    <Text
      testID="lifecycle-status-since"
      style={{
        color: colors.textSecondary,
        fontFamily: typography.fontFamily.regular,
        fontSize: typography.scale.sm,
        marginTop: spacing(1),
      }}
    >
      {text}
    </Text>
  );
}

export function PatientLifecycleActions({
  status,
  statusChangedAt,
  pending,
  onChangeStatus,
}: {
  status: Patient['status'];
  statusChangedAt: string;
  pending: boolean;
  onChangeStatus: (target: Patient['status']) => void;
}) {
  const { spacing } = useTheme();

  if (status === 'active') {
    return (
      <View style={{ gap: spacing(2) }}>
        <LifecycleButton
          testID="lifecycle-action-inactivate"
          label="Marcar como inativo"
          disabled={pending}
          onPress={() => onChangeStatus('inactive')}
        />
        <LifecycleButton
          testID="lifecycle-action-complete"
          label="Concluir acompanhamento"
          disabled={pending}
          onPress={() => onChangeStatus('completed')}
        />
      </View>
    );
  }

  const action = lifecycleActionLabel(status);

  if (!action) {
    return null;
  }

  const testID = status === 'inactive' ? 'lifecycle-action-reactivate' : 'lifecycle-action-reopen';
  const sinceText =
    status === 'inactive'
      ? `Inativo desde ${formatDateBR(statusChangedAt)}`
      : `Concluído em ${formatDateBR(statusChangedAt)}`;

  return (
    <View style={{ gap: spacing(2) }}>
      <LifecycleButton
        testID={testID}
        label={action.label}
        disabled={pending}
        onPress={() => onChangeStatus(action.target)}
      />
      <SinceLabel text={sinceText} />
    </View>
  );
}
