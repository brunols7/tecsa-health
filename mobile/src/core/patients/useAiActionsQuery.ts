import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchAiActions } from '@/core/api/ai-actions';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { useFlag } from '@/core/flags/useFlag';

export function useAiActionsQuery(patientId: string): UseQueryResult<AiAction[]> {
  const aiActionsEnabled = useFlag('aiActionsEnabled');

  return useQuery({
    queryKey: ['ai-actions', patientId],
    queryFn: () => fetchAiActions(patientId),
    enabled: aiActionsEnabled,
  });
}
