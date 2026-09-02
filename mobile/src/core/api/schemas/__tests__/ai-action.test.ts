import {
  aiActionPrioritySchema,
  aiActionSchema,
  aiActionStatusSchema,
} from '@/core/api/schemas/ai-action';

const validAiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

describe('aiActionStatusSchema', () => {
  it('aceita cada valor válido do enum', () => {
    expect(aiActionStatusSchema.safeParse('pending').success).toBe(true);
    expect(aiActionStatusSchema.safeParse('accepted').success).toBe(true);
    expect(aiActionStatusSchema.safeParse('dismissed').success).toBe(true);
  });

  it('rejeita um valor fora do enum', () => {
    const result = aiActionStatusSchema.safeParse('archived');

    expect(result.success).toBe(false);
  });
});

describe('aiActionPrioritySchema', () => {
  it('aceita cada valor válido do enum', () => {
    expect(aiActionPrioritySchema.safeParse('low').success).toBe(true);
    expect(aiActionPrioritySchema.safeParse('medium').success).toBe(true);
    expect(aiActionPrioritySchema.safeParse('high').success).toBe(true);
  });

  it('rejeita um valor fora do enum', () => {
    const result = aiActionPrioritySchema.safeParse('urgent');

    expect(result.success).toBe(false);
  });
});

describe('aiActionSchema', () => {
  it('aceita um payload válido e infere o tipo AiAction', () => {
    const result = aiActionSchema.safeParse(validAiAction);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validAiAction);
  });

  it('rejeita um payload com campo faltando (rationale ausente)', () => {
    const { rationale: _rationale, ...withoutRationale } = validAiAction;

    const result = aiActionSchema.safeParse(withoutRationale);

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com status fora do enum permitido', () => {
    const result = aiActionSchema.safeParse({ ...validAiAction, status: 'archived' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com priority fora do enum permitido', () => {
    const result = aiActionSchema.safeParse({ ...validAiAction, priority: 'urgent' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com biomarkers de tipo errado (string em vez de array)', () => {
    const result = aiActionSchema.safeParse({ ...validAiAction, biomarkers: 'hba1c' });

    expect(result.success).toBe(false);
  });
});
