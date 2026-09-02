import { z } from 'zod';

export const aiActionStatusSchema = z.enum(['pending', 'accepted', 'dismissed']);

export const aiActionPrioritySchema = z.enum(['low', 'medium', 'high']);

export const aiActionSchema = z.object({
  id: z.string(),
  patientId: z.string(),
  title: z.string(),
  rationale: z.string(),
  priority: aiActionPrioritySchema,
  biomarkers: z.array(z.string()),
  status: aiActionStatusSchema,
  createdAt: z.string(),
});

export type AiAction = z.infer<typeof aiActionSchema>;
export type AiActionStatus = z.infer<typeof aiActionStatusSchema>;
export type AiActionPriority = z.infer<typeof aiActionPrioritySchema>;
