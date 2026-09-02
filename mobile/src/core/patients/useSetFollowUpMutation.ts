import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { patchPatientFollowUp } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

type SetFollowUpInput = {
  id: string;
  needsFollowUp: boolean;
};

type SetFollowUpContext = {
  previous: Patient | undefined;
};

export function useSetFollowUpMutation(): UseMutationResult<
  Patient,
  Error,
  SetFollowUpInput,
  SetFollowUpContext
> {
  const queryClient = useQueryClient();
  const brand = useTheme();

  return useMutation({
    mutationFn: (input: SetFollowUpInput) => patchPatientFollowUp(input.id, input.needsFollowUp),
    onMutate: async (input: SetFollowUpInput) => {
      await queryClient.cancelQueries({ queryKey: ['patient', input.id] });
      const previous = queryClient.getQueryData<Patient>(['patient', input.id]);
      if (previous) {
        queryClient.setQueryData(['patient', input.id], {
          ...previous,
          needsFollowUp: input.needsFollowUp,
        });
      }
      return { previous };
    },
    onError: (_err: Error, input: SetFollowUpInput, context: SetFollowUpContext | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData(['patient', input.id], context.previous);
      }
    },
    onSettled: (_data: Patient | undefined, _err: Error | null, input: SetFollowUpInput) => {
      queryClient.invalidateQueries({ queryKey: ['patient', input.id] });
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
