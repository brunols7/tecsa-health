import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { createPatient } from '@/core/api/patients';
import type { CreatePatientInput } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

export function useCreatePatientMutation(): UseMutationResult<
  Patient,
  Error,
  CreatePatientInput
> {
  const queryClient = useQueryClient();
  const brand = useTheme();

  return useMutation({
    mutationFn: (input: CreatePatientInput) => createPatient(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
