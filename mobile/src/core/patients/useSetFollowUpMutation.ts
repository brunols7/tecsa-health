import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData, QueryKey, UseMutationResult } from '@tanstack/react-query';

import { patchPatientFollowUp } from '@/core/api/patients';
import type { Patient, PatientPage } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

type SetFollowUpInput = {
  id: string;
  needsFollowUp: boolean;
};

type SetFollowUpContext = {
  previous: Patient | undefined;
  previousLists: [QueryKey, InfiniteData<PatientPage> | undefined][];
};

function patchPatientInPage(page: PatientPage, id: string, needsFollowUp: boolean): PatientPage {
  if (!page.data.some((patient) => patient.id === id)) {
    return page;
  }
  return {
    ...page,
    data: page.data.map((patient) => (patient.id === id ? { ...patient, needsFollowUp } : patient)),
  };
}

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
      await queryClient.cancelQueries({ queryKey: ['patients', brand.id] });

      const previous = queryClient.getQueryData<Patient>(['patient', input.id]);
      if (previous) {
        queryClient.setQueryData(['patient', input.id], {
          ...previous,
          needsFollowUp: input.needsFollowUp,
        });
      }

      const previousLists = queryClient.getQueriesData<InfiniteData<PatientPage>>({
        queryKey: ['patients', brand.id],
      });
      queryClient.setQueriesData<InfiniteData<PatientPage>>(
        { queryKey: ['patients', brand.id] },
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => patchPatientInPage(page, input.id, input.needsFollowUp)),
          },
      );

      return { previous, previousLists };
    },
    onError: (_err: Error, input: SetFollowUpInput, context: SetFollowUpContext | undefined) => {
      if (context?.previous) {
        queryClient.setQueryData(['patient', input.id], context.previous);
      }
      context?.previousLists.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: (_data: Patient | undefined, _err: Error | null, input: SetFollowUpInput) => {
      queryClient.invalidateQueries({ queryKey: ['patient', input.id] });
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
