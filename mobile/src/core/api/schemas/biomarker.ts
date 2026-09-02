import { z } from 'zod';

export const biomarkerStatusSchema = z.enum(['low', 'normal', 'high']);

export const biomarkerSchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  refMin: z.number(),
  refMax: z.number(),
  measuredAt: z.string(),
  status: biomarkerStatusSchema,
});

export type Biomarker = z.infer<typeof biomarkerSchema>;
export type BiomarkerStatus = z.infer<typeof biomarkerStatusSchema>;
