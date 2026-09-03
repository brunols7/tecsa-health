import { Modal, Pressable, Text, View } from 'react-native';

import type { PatientStatusFilter } from '@/core/patients/usePatientsQuery';
import { useTheme } from '@/core/theme/useTheme';

const OPTIONS: { value: PatientStatusFilter; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'inactive_completed', label: 'Inativos e concluídos' },
];

export function PatientStatusFilterSheet({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: PatientStatusFilter;
  onSelect: (value: PatientStatusFilter) => void;
  onClose: () => void;
}) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="patient-status-filter-backdrop"
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.lg,
            borderTopRightRadius: radii.lg,
            padding: spacing(4),
            gap: spacing(2),
          }}
        >
          {OPTIONS.map((option) => {
            const selected = option.value === current;
            return (
              <Pressable
                key={option.value}
                testID={`patient-status-filter-option-${option.value}`}
                onPress={() => {
                  onSelect(option.value);
                  onClose();
                }}
                style={{
                  backgroundColor: selected ? colors.surfaceMuted : 'transparent',
                  borderRadius: radii.md,
                  paddingVertical: spacing(3),
                  paddingHorizontal: spacing(4),
                }}
              >
                <Text
                  style={{
                    color: selected ? colors.accent : colors.textPrimary,
                    fontFamily: selected ? typography.fontFamily.bold : typography.fontFamily.regular,
                    fontSize: typography.scale.md,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}
