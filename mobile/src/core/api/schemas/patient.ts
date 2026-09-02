import { z } from 'zod';

export const patientSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthDate: z.string(),
  goal: z.string(),
  status: z.string(),
  needsFollowUp: z.boolean(),
  updatedAt: z.string(),
});

export type Patient = z.infer<typeof patientSchema>;

export const patientPageSchema = z.object({
  data: z.array(patientSchema),
  nextCursor: z.string().nullable(),
});

export type PatientPage = z.infer<typeof patientPageSchema>;
