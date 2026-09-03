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

export const createBiomarkerInputSchema = z
  .object({
    label: z.string().min(2).max(120),
    value: z.number().gt(0),
    unit: z.string().min(1).max(20),
    refMin: z.number().gte(0),
    refMax: z.number(),
    measuredAt: z.string(),
  })
  .refine((data) => data.refMax > data.refMin, {
    message: 'A faixa máxima deve ser maior que a mínima.',
    path: ['refMax'],
  });

export type CreateBiomarkerInput = z.infer<typeof createBiomarkerInputSchema>;
