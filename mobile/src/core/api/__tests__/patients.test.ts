import { ApiError } from '@/core/api/http';
import {
  createPatient,
  deletePatient,
  fetchPatientBiomarkers,
  fetchPatientDetail,
  fetchPatients,
  patchPatientFollowUp,
  updatePatient,
  updatePatientStatus,
} from '@/core/api/patients';

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

  it('propaga o filtro de status como query param único separado por vírgula', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [validPatient], nextCursor: null }),
    }) as unknown as typeof fetch;

    await fetchPatients('brand-a', undefined, undefined, ['inactive', 'completed']);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('status=inactive%2Ccompleted'),
    );
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

describe('createPatient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('envia o POST com os dados do paciente e valida a resposta com patientSchema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => validPatient,
    }) as unknown as typeof fetch;

    const input = {
      name: 'Maria Souza',
      birthDate: '1990-05-12',
      goal: 'lose_weight' as const,
      brand: 'brand-a',
    };
    const result = await createPatient(input);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    );
    expect(result).toEqual(validPatient);
  });

  it('propaga ApiError quando o POST falha (422)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: { code: 'VALIDATION_ERROR', message: 'Corpo inválido' } }),
    }) as unknown as typeof fetch;

    await expect(
      createPatient({
        name: '',
        birthDate: '1990-05-12',
        goal: 'lose_weight',
        brand: 'brand-a',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('updatePatient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('envia o PATCH só com os campos alterados e valida a resposta com patientSchema', async () => {
    const updatedPatient = { ...validPatient, name: 'Maria Nova' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedPatient,
    }) as unknown as typeof fetch;

    const result = await updatePatient('patient-1', { name: 'Maria Nova' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Maria Nova' }) }),
    );
    expect(result).toEqual(updatedPatient);
  });

  it('propaga ApiError quando o PATCH falha (404 - paciente excluído por outra sessão)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'PATIENT_NOT_FOUND', message: 'Paciente não encontrado' } }),
    }) as unknown as typeof fetch;

    await expect(updatePatient('patient-1', { name: 'Maria Nova' })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe('updatePatientStatus', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('envia o PATCH de status para /patients/:id/status e valida a resposta com patientSchema', async () => {
    const updatedPatient = { ...validPatient, status: 'inactive' as const };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => updatedPatient,
    }) as unknown as typeof fetch;

    const result = await updatePatientStatus('patient-1', 'inactive');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/patients/patient-1/status'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'inactive' }) }),
    );
    expect(result).toEqual(updatedPatient);
  });

  it('propaga ApiError quando a transição de status é inválida (409)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Transição inválida' } }),
    }) as unknown as typeof fetch;

    await expect(updatePatientStatus('patient-1', 'active')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('deletePatient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('envia o DELETE para /patients/:id', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => undefined,
    }) as unknown as typeof fetch;

    await deletePatient('patient-1');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/patients/patient-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('propaga ApiError quando o DELETE falha', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 'SERVER_ERROR', message: 'Falha ao excluir' } }),
    }) as unknown as typeof fetch;

    await expect(deletePatient('patient-1')).rejects.toBeInstanceOf(ApiError);
  });
});
