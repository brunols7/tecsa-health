import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { updatePatientStatus } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

type ChangePatientStatusInput = {
  id: string;
  status: Patient['status'];
};

export function useChangePatientStatusMutation(): UseMutationResult<
  Patient,
  Error,
  ChangePatientStatusInput
> {
  const queryClient = useQueryClient();
  const brand = useTheme();

  return useMutation({
    mutationFn: (input: ChangePatientStatusInput) => updatePatientStatus(input.id, input.status),
    onSuccess: (data: Patient, input: ChangePatientStatusInput) => {
      queryClient.setQueryData(['patient', input.id], data);
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
