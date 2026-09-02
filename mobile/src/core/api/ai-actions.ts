import { z } from 'zod';

import { apiGet, apiPatch, apiPost } from '@/core/api/http';
import { aiActionSchema } from '@/core/api/schemas/ai-action';
import type { AiAction, AiActionStatus } from '@/core/api/schemas/ai-action';

export async function fetchAiActions(patientId: string): Promise<AiAction[]> {
  const raw = await apiGet(`/api/v1/patients/${patientId}/ai-actions`);

  return z.array(aiActionSchema).parse(raw);
}

export async function generateAiActions(patientId: string): Promise<AiAction[]> {
  const raw = await apiPost(`/api/v1/patients/${patientId}/ai-actions`);

  return z.array(aiActionSchema).parse(raw);
}

export async function decideAiAction(
  actionId: string,
  status: Extract<AiActionStatus, 'accepted' | 'dismissed'>,
): Promise<AiAction> {
  const raw = await apiPatch(`/api/v1/ai-actions/${actionId}`, { status });

  return aiActionSchema.parse(raw);
}
