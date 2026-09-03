import { z } from 'zod';

export const patientGoalSchema = z.enum([
  'lose_weight',
  'gain_muscle',
  'maintain',
  'manage_condition',
]);

export const patientStatusSchema = z.enum(['active', 'inactive', 'completed']);

export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthDate: z.string(),
  goal: patientGoalSchema,
  status: patientStatusSchema,
  needsFollowUp: z.boolean(),
  statusChangedAt: z.string(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

export const patientPageSchema = z.object({
  data: z.array(patientSchema),
  nextCursor: z.string().nullable(),
});

export type PatientPage = z.infer<typeof patientPageSchema>;
