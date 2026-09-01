import { apiGet } from '@/core/api/http';
import { featureFlagsSchema } from '@/core/api/schemas/feature-flags';
import type { FeatureFlagsResponse } from '@/core/api/schemas/feature-flags';

export async function fetchFeatureFlags(brandId: string): Promise<FeatureFlagsResponse> {
  const raw = await apiGet('/api/v1/feature-flags', { brand: brandId });

  return featureFlagsSchema.parse(raw);
}
