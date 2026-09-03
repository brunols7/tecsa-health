import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';

import { deletePatient } from '@/core/api/patients';
import { useTheme } from '@/core/theme/useTheme';

export function useDeletePatientMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  const brand = useTheme();

  return useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: (_data: void, id: string) => {
      queryClient.removeQueries({ queryKey: ['patient', id] });
      queryClient.invalidateQueries({ queryKey: ['patients', brand.id] });
    },
  });
}
