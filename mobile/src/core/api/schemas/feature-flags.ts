import { z } from 'zod';

export const featureFlagsSchema = z
  .object({
    aiActionsEnabled: z.boolean(),
    offlineBanner: z.boolean(),
  })
  .partial();

export type FeatureFlagsResponse = z.infer<typeof featureFlagsSchema>;
