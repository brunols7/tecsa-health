import { Trash2 } from 'lucide-react-native';
import { Alert, Pressable, Text, View } from 'react-native';

import type { AiAction, AiActionPriority } from '@/core/api/schemas/ai-action';
import { useDecideAiActionMutation } from '@/core/patients/useDecideAiActionMutation';
import { useDeleteAiActionMutation } from '@/core/patients/useDeleteAiActionMutation';
import { useTheme } from '@/core/theme/useTheme';
import type { Brand } from '@/core/theme/brand.types';

const DECISION_ERROR_MESSAGE = 'Não foi possível registrar sua decisão. Tente novamente.';
const DELETE_ERROR_MESSAGE = 'Não foi possível excluir esta ação. Tente novamente.';
const DELETE_CONFIRM_TITLE = 'Excluir esta ação?';
const DELETE_CONFIRM_MESSAGE = 'Esta ação sai da lista e não pode ser restaurada pelo app.';

const STATUS_LABEL: Record<'accepted' | 'dismissed', string> = {
  accepted: 'Aceita',
  dismissed: 'Descartada',
};

function priorityColor(priority: AiActionPriority, colors: Brand['colors']): string {
  if (priority === 'high') {
    return colors.danger;
  }
  if (priority === 'medium') {
    return colors.warning;
  }
  return colors.success;
}

export function AiActionCard({ action, patientId }: { action: AiAction; patientId: string }) {
  const { colors, radii, typography, spacing } = useTheme();
  const mutation = useDecideAiActionMutation(patientId);
  const deleteMutation = useDeleteAiActionMutation(patientId);

  const isThisActionInFlight = mutation.isPending && mutation.variables?.actionId === action.id;
  const didThisActionFail = mutation.isError && mutation.variables?.actionId === action.id;

  function confirmDelete() {
    Alert.alert(DELETE_CONFIRM_TITLE, DELETE_CONFIRM_MESSAGE, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(action.id) },
    ]);
  }

  return (
    <View
      testID={`ai-action-card-${action.id}`}
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing(3),
        gap: spacing(2),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(2) }}>
        <Text
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontFamily: typography.fontFamily.medium,
            fontSize: typography.scale.md,
          }}
        >
          {action.title}
        </Text>
        <View
          testID={`ai-action-priority-${action.id}`}
          style={{
            flexShrink: 0,
            backgroundColor: priorityColor(action.priority, colors),
            borderRadius: radii.pill,
            paddingVertical: spacing(1),
            paddingHorizontal: spacing(2),
          }}
        >
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.xs,
            }}
          >
            {action.priority}
          </Text>
        </View>
      </View>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.sm,
        }}
      >
        {action.rationale}
      </Text>
      {action.status === 'pending' ? (
        <View style={{ gap: spacing(2) }}>
          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            <Pressable
              testID={`ai-action-accept-${action.id}`}
              disabled={isThisActionInFlight}
              onPress={() => mutation.mutate({ actionId: action.id, status: 'accepted' })}
              style={{
                flex: 1,
                backgroundColor: isThisActionInFlight ? colors.surfaceMuted : colors.accent,
                borderRadius: radii.md,
                paddingVertical: spacing(2),
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
                Aceitar
              </Text>
            </Pressable>
            <Pressable
              testID={`ai-action-dismiss-${action.id}`}
              disabled={isThisActionInFlight}
              onPress={() => mutation.mutate({ actionId: action.id, status: 'dismissed' })}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.md,
                paddingVertical: spacing(2),
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.scale.sm,
                }}
              >
                Descartar
              </Text>
            </Pressable>
          </View>
          {didThisActionFail ? (
            <Text
              testID={`ai-action-error-${action.id}`}
              style={{
                color: colors.danger,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.xs,
              }}
            >
              {DECISION_ERROR_MESSAGE}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ gap: spacing(2) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View
              testID={`ai-action-status-${action.id}`}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.pill,
                paddingVertical: spacing(1),
                paddingHorizontal: spacing(3),
              }}
            >
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: typography.fontFamily.medium,
                  fontSize: typography.scale.xs,
                }}
              >
                {STATUS_LABEL[action.status]}
              </Text>
            </View>
            <Pressable
              testID={`ai-action-delete-${action.id}`}
              disabled={deleteMutation.isPending}
              onPress={confirmDelete}
              hitSlop={spacing(2)}
              style={{
                paddingVertical: spacing(1),
                paddingHorizontal: spacing(2),
              }}
            >
              <Trash2
                accessibilityLabel="Excluir ação"
                size={typography.scale.md}
                color={deleteMutation.isPending ? colors.textSecondary : colors.danger}
              />
            </Pressable>
          </View>
          {deleteMutation.isError ? (
            <Text
              testID={`ai-action-delete-error-${action.id}`}
              style={{
                color: colors.danger,
                fontFamily: typography.fontFamily.regular,
                fontSize: typography.scale.xs,
              }}
            >
              {DELETE_ERROR_MESSAGE}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
