import { biomarkerSchema, biomarkerStatusSchema } from '@/core/api/schemas/biomarker';

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
