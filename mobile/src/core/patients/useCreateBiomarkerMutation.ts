import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { createBiomarker } from '@/core/api/patients';
import { ApiError } from '@/core/api/http';
import type { Biomarker, CreateBiomarkerInput } from '@/core/api/schemas/biomarker';
import { computeBiomarkerStatus } from '@/core/patients/biomarkerStatus';

type CreateBiomarkerContext = {
  previous: Biomarker[] | undefined;
};

export function useCreateBiomarkerMutation(
  patientId: string,
): UseMutationResult<Biomarker, ApiError, CreateBiomarkerInput, CreateBiomarkerContext> {
  const queryClient = useQueryClient();
  const queryKey = ['patient', patientId, 'biomarkers'];

  return useMutation({
    mutationFn: (input: CreateBiomarkerInput) => createBiomarker(patientId, input),
    onMutate: async (input: CreateBiomarkerInput) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Biomarker[]>(queryKey);

      const optimisticBiomarker: Biomarker = {
        id: `optimistic-${crypto.randomUUID?.() ?? Date.now()}`,
        code: '',
        label: input.label,
        value: input.value,
        unit: input.unit,
        refMin: input.refMin,
        refMax: input.refMax,
        measuredAt: input.measuredAt,
        status: computeBiomarkerStatus(input.value, input.refMin, input.refMax),
      };

      queryClient.setQueryData<Biomarker[]>(queryKey, (data) => [
        optimisticBiomarker,
        ...(data ?? []),
      ]);

      return { previous };
    },
    onError: (_err: ApiError, _input: CreateBiomarkerInput, context: CreateBiomarkerContext | undefined) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
