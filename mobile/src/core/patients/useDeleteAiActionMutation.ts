import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { deleteAiAction } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';

export function useDeleteAiActionMutation(
  patientId: string,
): UseMutationResult<void, ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actionId: string) => deleteAiAction(actionId),
    onSuccess: (_data: void, actionId: string) => {
      queryClient.setQueryData<AiAction[]>(['ai-actions', patientId], (previous) =>
        previous?.filter((action) => action.id !== actionId),
      );
    },
  });
}
