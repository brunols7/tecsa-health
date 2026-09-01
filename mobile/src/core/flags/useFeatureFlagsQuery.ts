import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchFeatureFlags } from '@/core/api/feature-flags';
import type { FeatureFlagsResponse } from '@/core/api/schemas/feature-flags';
import { useTheme } from '@/core/theme/useTheme';

export function useFeatureFlagsQuery(): UseQueryResult<FeatureFlagsResponse> {
  const brand = useTheme();

  return useQuery({
    queryKey: ['feature-flags', brand.id],
    queryFn: () => fetchFeatureFlags(brand.id),
  });
}
