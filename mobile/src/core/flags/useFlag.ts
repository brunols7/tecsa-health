import { useFeatureFlagsQuery } from '@/core/flags/useFeatureFlagsQuery';
import { useTheme } from '@/core/theme/useTheme';
import type { FeatureFlags } from '@/core/theme/brand.types';

export function useFlag(key: keyof FeatureFlags): boolean {
  const { data } = useFeatureFlagsQuery();
  const { defaults } = useTheme();

  return data?.[key] ?? defaults[key];
}
