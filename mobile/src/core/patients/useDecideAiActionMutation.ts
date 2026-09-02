import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { decideAiAction } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction, AiActionStatus } from '@/core/api/schemas/ai-action';

type DecideAiActionInput = {
  actionId: string;
  status: Extract<AiActionStatus, 'accepted' | 'dismissed'>;
};

export function useDecideAiActionMutation(
  patientId: string,
): UseMutationResult<AiAction, ApiError, DecideAiActionInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DecideAiActionInput) => decideAiAction(input.actionId, input.status),
    onSuccess: (data: AiAction) => {
      queryClient.setQueryData<AiAction[]>(['ai-actions', patientId], (previous) =>
        previous?.map((action) => (action.id === data.id ? data : action)),
      );
    },
  });
}
