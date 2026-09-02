import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchPatientBiomarkers } from '@/core/api/patients';
import type { Biomarker } from '@/core/api/schemas/biomarker';

export function usePatientBiomarkersQuery(id: string): UseQueryResult<Biomarker[]> {
  return useQuery({
    queryKey: ['patient', id, 'biomarkers'],
    queryFn: () => fetchPatientBiomarkers(id),
  });
}
