import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { generateAiActions } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';

export function useGenerateAiActionsMutation(): UseMutationResult<AiAction[], ApiError, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patientId: string) => generateAiActions(patientId),
    onSuccess: (data: AiAction[], patientId: string) => {
      queryClient.setQueryData(['ai-actions', patientId], data);
    },
  });
}
