import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { generateAiActions } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';

export type GenerateAiActionsInput = { patientId: string; refresh?: boolean };

export function useGenerateAiActionsMutation(): UseMutationResult<
  AiAction[],
  ApiError,
  GenerateAiActionsInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ patientId, refresh }: GenerateAiActionsInput) =>
      generateAiActions(patientId, refresh),
    onSuccess: (data: AiAction[], { patientId }: GenerateAiActionsInput) => {
      queryClient.setQueryData(['ai-actions', patientId], data);
    },
  });
}
