import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updatePatient } from '@/core/api/patients';
import type { UpdatePatientInput } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

type UpdatePatientMutationInput = {
  id: string;
  fields: UpdatePatientInput;
};

export function useUpdatePatientMutation(): UseMutationResult<
  Patient,
  Error,
  UpdatePatientMutationInput
> {
  const queryClient = useQueryClient();
  const brand = useTheme();

  return useMutation({
    mutationFn: (input: UpdatePatientMutationInput) => updatePatient(input.id, input.fields),
    onSuccess: (data: Patient, input: UpdatePatientMutationInput) => {
      queryClient.setQueryData(['patient', input.id], data);
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
