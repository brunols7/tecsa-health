import { Modal, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/core/theme/useTheme';

const DELETE_ERROR_MESSAGE = 'Não foi possível excluir este paciente. Tente novamente.';

export function PatientDetailMenuSheet({
  visible,
  onClose,
  onEdit,
  onDelete,
  deletePending,
  deleteFailed,
}: {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deletePending: boolean;
  deleteFailed: boolean;
}) {
  const { colors, radii, typography, spacing } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        testID="patient-detail-menu-backdrop"
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
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
          <Pressable
            testID="patient-detail-edit-link"
            onPress={onEdit}
            style={{
              borderRadius: radii.md,
              paddingVertical: spacing(3),
              paddingHorizontal: spacing(4),
            }}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.scale.md,
              }}
            >
              Editar
            </Text>
          </Pressable>
          <Pressable
            testID="patient-detail-delete-button"
            disabled={deletePending}
            onPress={onDelete}
            style={{
              borderRadius: radii.md,
              paddingVertical: spacing(3),
              paddingHorizontal: spacing(4),
            }}
          >
            <Text
              style={{
                color: deletePending ? colors.textSecondary : colors.danger,
                fontFamily: typography.fontFamily.medium,
                fontSize: typography.scale.md,
              }}
            >
              Excluir
            </Text>
          </Pressable>
          {deleteFailed ? (
            <Text
              testID="patient-detail-delete-error"
              style={{
                color: colors.danger,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.xs,
                paddingHorizontal: spacing(4),
              }}
            >
              {DELETE_ERROR_MESSAGE}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}
