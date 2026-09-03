import {
  biomarkerSchema,
  biomarkerStatusSchema,
  createBiomarkerInputSchema,
} from '@/core/api/schemas/biomarker';

const validBiomarker = {
  id: 'biomarker-1',
  code: 'hba1c',
  label: 'Hemoglobina glicada',
  value: 7.2,
  unit: '%',
  refMin: 4,
  refMax: 6,
  measuredAt: '2026-01-01T10:00:00Z',
  status: 'high',
};

describe('biomarkerStatusSchema', () => {
  it('aceita cada valor válido do enum', () => {
    expect(biomarkerStatusSchema.safeParse('low').success).toBe(true);
    expect(biomarkerStatusSchema.safeParse('normal').success).toBe(true);
    expect(biomarkerStatusSchema.safeParse('high').success).toBe(true);
  });

  it('rejeita um valor fora do enum', () => {
    const result = biomarkerStatusSchema.safeParse('critical');

    expect(result.success).toBe(false);
  });
});

describe('biomarkerSchema', () => {
  it('aceita um payload válido e infere o tipo Biomarker', () => {
    const result = biomarkerSchema.safeParse(validBiomarker);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validBiomarker);
  });

  it('rejeita um payload com campo faltando (refMin ausente)', () => {
    const { refMin: _refMin, ...withoutRefMin } = validBiomarker;

    const result = biomarkerSchema.safeParse(withoutRefMin);

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com tipo errado (value como string)', () => {
    const result = biomarkerSchema.safeParse({ ...validBiomarker, value: '7.2' });

    expect(result.success).toBe(false);
  });

  it('rejeita um payload com status fora do enum permitido', () => {
    const result = biomarkerSchema.safeParse({ ...validBiomarker, status: 'critical' });

    expect(result.success).toBe(false);
  });
});

const validCreateInput = {
  label: 'Ferritina',
  value: 40,
  unit: 'ng/mL',
  refMin: 20,
  refMax: 200,
  measuredAt: '2026-01-01',
};

describe('createBiomarkerInputSchema', () => {
  it('aceita um input válido completo', () => {
    const result = createBiomarkerInputSchema.safeParse(validCreateInput);

    expect(result.success).toBe(true);
    expect(result.data).toEqual(validCreateInput);
  });

  it('rejeita label vazio', () => {
    const result = createBiomarkerInputSchema.safeParse({ ...validCreateInput, label: '' });

    expect(result.success).toBe(false);
  });

  it('rejeita value não numérico', () => {
    const result = createBiomarkerInputSchema.safeParse({ ...validCreateInput, value: 'quarenta' });

    expect(result.success).toBe(false);
  });

  it('rejeita value menor ou igual a zero', () => {
    const result = createBiomarkerInputSchema.safeParse({ ...validCreateInput, value: 0 });

    expect(result.success).toBe(false);
  });

  it('rejeita refMin negativo', () => {
    const result = createBiomarkerInputSchema.safeParse({ ...validCreateInput, refMin: -1 });

    expect(result.success).toBe(false);
  });

  it('rejeita refMax menor ou igual a refMin, com o erro apontando para o campo refMax', () => {
    const result = createBiomarkerInputSchema.safeParse({
      ...validCreateInput,
      refMin: 100,
      refMax: 100,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['refMax']);
    }
  });
});
