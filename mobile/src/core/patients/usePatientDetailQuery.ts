import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchPatientDetail } from '@/core/api/patients';
import type { Patient } from '@/core/api/schemas/patient';

export function usePatientDetailQuery(id: string): UseQueryResult<Patient> {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => fetchPatientDetail(id),
  });
}
