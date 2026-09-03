import { useInfiniteQuery } from '@tanstack/react-query';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';

import { fetchPatients } from '@/core/api/patients';
import type { PatientPage } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

export type PatientStatusFilter = 'active' | 'inactive_completed';

function statusFilterToParams(statusFilter: PatientStatusFilter): string[] {
  return statusFilter === 'active' ? ['active'] : ['inactive', 'completed'];
}

export function usePatientsQuery(
  search: string,
  statusFilter: PatientStatusFilter,
): UseInfiniteQueryResult<InfiniteData<PatientPage>> {
  const brand = useTheme();

  return useInfiniteQuery({
    queryKey: ['patients', brand.id, search, statusFilter],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchPatients(brand.id, search || undefined, pageParam, statusFilterToParams(statusFilter)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PatientPage) => lastPage.nextCursor ?? undefined,
  });
}
