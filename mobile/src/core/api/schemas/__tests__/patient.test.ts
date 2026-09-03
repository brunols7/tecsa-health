import {
  patientGoalSchema,
  patientPageSchema,
  patientSchema,
  patientStatusSchema,
} from '@/core/api/schemas/patient';

const validPatient = {
  id: 'patient-1',
  name: 'Maria Souza',
  birthDate: '1990-05-12',
  goal: 'lose_weight',
  status: 'active',
  needsFollowUp: false,
  statusChangedAt: '2026-01-01T10:00:00Z',
  updatedAt: '2026-01-01T10:00:00Z',
};

describe('patientGoalSchema', () => {
  it.each(['lose_weight', 'gain_muscle', 'maintain', 'manage_condition'])(
    'aceita o valor válido "%s"',
    (goal) => {
      expect(patientGoalSchema.safeParse(goal).success).toBe(true);
    },
  );

  it('rejeita um valor desconhecido', () => {
    const result = patientGoalSchema.safeParse('valor-desconhecido');

    expect(result.success).toBe(false);
  });
});

describe('patientStatusSchema', () => {
  it.each(['active', 'inactive', 'completed'])('aceita o valor válido "%s"', (status) => {
    expect(patientStatusSchema.safeParse(status).success).toBe(true);
  });

  it('rejeita um valor desconhecido', () => {
    const result = patientStatusSchema.safeParse('valor-desconhecido');

    expect(result.success).toBe(false);
  });
});

describe('patientSchema', () => {
  it('aceita um payload válido e infere o tipo Patient', () => {
    const result = patientSchema.safeParse(validPatient);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validPatient);
  });

  it('rejeita um payload com campo faltando (needsFollowUp ausente)', () => {
    const { needsFollowUp: _needsFollowUp, ...withoutNeedsFollowUp } = validPatient;

    const result = patientSchema.safeParse(withoutNeedsFollowUp);

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com tipo errado (needsFollowUp como string)', () => {
    const result = patientSchema.safeParse({ ...validPatient, needsFollowUp: 'false' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com goal fora do enum conhecido', () => {
    const result = patientSchema.safeParse({ ...validPatient, goal: 'valor-desconhecido' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com status fora do enum conhecido', () => {
    const result = patientSchema.safeParse({ ...validPatient, status: 'valor-desconhecido' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload sem statusChangedAt', () => {
    const { statusChangedAt: _statusChangedAt, ...withoutStatusChangedAt } = validPatient;

    const result = patientSchema.safeParse(withoutStatusChangedAt);

    expect(result.success).toBe(false);
  });
});

describe('patientPageSchema', () => {
  it('aceita uma página válida com nextCursor nulo', () => {
    const result = patientPageSchema.safeParse({ data: [validPatient], nextCursor: null });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ data: [validPatient], nextCursor: null });
  });

  it('aceita uma página válida com nextCursor preenchido', () => {
    const result = patientPageSchema.safeParse({ data: [validPatient], nextCursor: 'cursor-abc' });

    expect(result.success).toBe(true);
    expect(result.data?.nextCursor).toBe('cursor-abc');
  });

  it('rejeita uma página com item inválido dentro de data', () => {
    const result = patientPageSchema.safeParse({
      data: [{ ...validPatient, needsFollowUp: 'not-a-boolean' }],
      nextCursor: null,
    });

    expect(result.success).toBe(false);
  });
});
