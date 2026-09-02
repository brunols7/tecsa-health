import { useInfiniteQuery } from '@tanstack/react-query';
import type { UseInfiniteQueryResult, InfiniteData } from '@tanstack/react-query';

import { fetchPatients } from '@/core/api/patients';
import type { PatientPage } from '@/core/api/schemas/patient';
import { useTheme } from '@/core/theme/useTheme';

export function usePatientsQuery(search: string): UseInfiniteQueryResult<InfiniteData<PatientPage>> {
  const brand = useTheme();

  return useInfiniteQuery({
    queryKey: ['patients', brand.id, search],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchPatients(brand.id, search || undefined, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: PatientPage) => lastPage.nextCursor ?? undefined,
  });
}
