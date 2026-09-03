import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { AiAction } from '@/core/api/schemas/ai-action';
import { useFlag } from '@/core/flags/useFlag';
import { useAiActionsQuery } from '@/core/patients/useAiActionsQuery';
import { useGenerateAiActionsMutation } from '@/core/patients/useGenerateAiActionsMutation';
import { useTheme } from '@/core/theme/useTheme';
import { AiActionCard } from '@/core/ui/AiActionCard';
import { QueryStateView } from '@/core/ui/QueryStateView';

const SECTION_TITLE = 'Ações de acompanhamento';
const GET_ERROR_MESSAGE = 'Não foi possível carregar as ações de acompanhamento.';
const EMPTY_STATE_MESSAGE =
  'Nenhuma ação sugerida ainda. Gere ações personalizadas a partir dos biomarcadores mais recentes.';
const GENERATE_ERROR_MESSAGE = 'Não foi possível gerar ações agora. Tente novamente.';
const REFRESH_ERROR_MESSAGE = 'Não foi possível buscar novas sugestões agora. Tente novamente.';

function AiActionsSkeleton() {
  const { colors, radii, spacing } = useTheme();

  return (
    <View testID="ai-actions-skeleton" style={{ gap: spacing(3) }}>
      {[0, 1].map((key) => (
        <View
          key={key}
          style={{ backgroundColor: colors.surfaceMuted, borderRadius: radii.md, height: spacing(20) }}
        />
      ))}
    </View>
  );
}

function AiActionsEmptyState({ patientId }: { patientId: string }) {
  const { colors, radii, typography, spacing } = useTheme();
  const mutation = useGenerateAiActionsMutation();

  return (
    <View style={{ alignItems: 'center', gap: spacing(3), padding: spacing(4) }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.md,
          textAlign: 'center',
        }}
      >
        {EMPTY_STATE_MESSAGE}
      </Text>
      <Pressable
        testID="ai-actions-generate-button"
        disabled={mutation.isPending}
        onPress={() => mutation.mutate({ patientId })}
        style={{
          backgroundColor: mutation.isPending ? colors.surfaceMuted : colors.accent,
          borderRadius: radii.md,
          paddingVertical: spacing(3),
          paddingHorizontal: spacing(6),
        }}
      >
        {mutation.isPending ? (
          <ActivityIndicator testID="ai-actions-generate-loading" color={colors.accentContrast} />
        ) : (
          <Text
            style={{
              color: colors.accentContrast,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.md,
            }}
          >
            Gerar ações
          </Text>
        )}
      </Pressable>
      {mutation.isError ? (
        <Text
          testID="ai-actions-generate-error"
          style={{
            color: colors.danger,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.sm,
            textAlign: 'center',
          }}
        >
          {GENERATE_ERROR_MESSAGE}
        </Text>
      ) : null}
    </View>
  );
}

function AiActionsRefreshButton({ patientId }: { patientId: string }) {
  const { colors, radii, typography, spacing } = useTheme();
  const mutation = useGenerateAiActionsMutation();

  return (
    <View style={{ gap: spacing(2) }}>
      <Pressable
        testID="ai-actions-refresh-button"
        disabled={mutation.isPending}
        onPress={() => mutation.mutate({ patientId, refresh: true })}
        style={{
          alignSelf: 'flex-start',
          backgroundColor: mutation.isPending ? colors.surfaceMuted : colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingVertical: spacing(2),
          paddingHorizontal: spacing(4),
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
        }}
      >
        {mutation.isPending ? (
          <ActivityIndicator testID="ai-actions-refresh-loading" color={colors.accent} />
        ) : (
          <Text
            style={{
              color: colors.accent,
              fontFamily: typography.fontFamily.medium,
              fontSize: typography.scale.sm,
            }}
          >
            Novas sugestões
          </Text>
        )}
      </Pressable>
      {mutation.isError ? (
        <Text
          testID="ai-actions-refresh-error"
          style={{
            color: colors.danger,
            fontFamily: typography.fontFamily.regular,
            fontSize: typography.scale.sm,
          }}
        >
          {REFRESH_ERROR_MESSAGE}
        </Text>
      ) : null}
    </View>
  );
}

export function AiActionsSection({ patientId }: { patientId: string }) {
  const aiActionsEnabled = useFlag('aiActionsEnabled');
  const query = useAiActionsQuery(patientId);
  const { colors, typography, spacing, copy } = useTheme();

  const hasLoadedActions = (query.data?.length ?? 0) > 0;

  if (!aiActionsEnabled && !hasLoadedActions) {
    return null;
  }

  return (
    <View testID="ai-actions-section" style={{ gap: spacing(3) }}>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: typography.fontFamily.bold,
          fontSize: typography.scale.lg,
        }}
      >
        {SECTION_TITLE}
      </Text>
      <Text
        testID="ai-actions-disclaimer"
        style={{
          color: colors.textSecondary,
          fontFamily: typography.fontFamily.regular,
          fontSize: typography.scale.xs,
        }}
      >
        {copy.aiDisclaimer}
      </Text>
      <QueryStateView<AiAction[]>
        status={query.status}
        isEmpty={(query.data?.length ?? 0) === 0}
        onRetry={() => query.refetch()}
        skeleton={<AiActionsSkeleton />}
        emptyState={aiActionsEnabled ? <AiActionsEmptyState patientId={patientId} /> : null}
        errorMessage={GET_ERROR_MESSAGE}
        data={query.data}
      >
        {(actions) => (
          <View style={{ gap: spacing(3) }}>
            {aiActionsEnabled ? <AiActionsRefreshButton patientId={patientId} /> : null}
            {actions.map((action) => (
              <AiActionCard key={action.id} action={action} patientId={patientId} />
            ))}
          </View>
        )}
      </QueryStateView>
    </View>
  );
}
