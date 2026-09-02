import { ApiError } from '@/core/api/http';
import {
  fetchPatientBiomarkers,
  fetchPatientDetail,
  fetchPatients,
  patchPatientFollowUp,
} from '@/core/api/patients';

const validPatient = {
  id: 'patient-1',
  name: 'Maria Souza',
  birthDate: '1990-05-12',
  goal: 'Perda de peso',
  status: 'active',
  needsFollowUp: false,
  updatedAt: '2026-01-01T10:00:00Z',
};

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

describe('fetchPatients', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('busca a página de pacientes e valida a resposta com patientPageSchema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [validPatient], nextCursor: 'cursor-2' }),
    }) as unknown as typeof fetch;

    const result = await fetchPatients('brand-a', undefined, undefined);

    expect(result).toEqual({ data: [validPatient], nextCursor: 'cursor-2' });
  });

  it('lança erro quando a resposta não bate com patientPageSchema (campo faltando)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'patient-1' }], nextCursor: null }),
    }) as unknown as typeof fetch;

    await expect(fetchPatients('brand-a', undefined, undefined)).rejects.toThrow();
  });
});

describe('fetchPatientDetail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('busca o detalhe do paciente e valida a resposta com patientSchema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => validPatient,
    }) as unknown as typeof fetch;

    const result = await fetchPatientDetail('patient-1');

    expect(result).toEqual(validPatient);
  });

  it('propaga ApiError quando a API responde com erro (404)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'PATIENT_NOT_FOUND', message: 'Paciente não encontrado' } }),
    }) as unknown as typeof fetch;

    await expect(fetchPatientDetail('missing')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('fetchPatientBiomarkers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('busca os biomarcadores do paciente e valida cada item com biomarkerSchema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [validBiomarker],
    }) as unknown as typeof fetch;

    const result = await fetchPatientBiomarkers('patient-1');

    expect(result).toEqual([validBiomarker]);
  });

  it('lança erro quando um item da resposta não bate com biomarkerSchema (status fora do enum)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ ...validBiomarker, status: 'critical' }],
    }) as unknown as typeof fetch;

    await expect(fetchPatientBiomarkers('patient-1')).rejects.toThrow();
  });
});

describe('patchPatientFollowUp', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('envia o PATCH com needsFollowUp e valida a resposta com patientSchema', async () => {
    const updatedPatient = { ...validPatient, needsFollowUp: true };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedPatient,
    }) as unknown as typeof fetch;

    const result = await patchPatientFollowUp('patient-1', true);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ needsFollowUp: true }) }),
    );
    expect(result).toEqual(updatedPatient);
  });

  it('propaga ApiError quando o PATCH falha (422)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } }),
    }) as unknown as typeof fetch;

    await expect(patchPatientFollowUp('patient-1', true)).rejects.toBeInstanceOf(ApiError);
  });
});
