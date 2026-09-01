import { apiGet, ApiError } from '@/core/api/http';

describe('apiGet', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('devolve o JSON cru quando a resposta é bem-sucedida', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ aiActionsEnabled: true }),
    }) as unknown as typeof fetch;

    const result = await apiGet('/api/v1/feature-flags', { brand: 'demo-brand' });

    expect(result).toEqual({ aiActionsEnabled: true });
  });

  it('lança ApiError com status e code quando a resposta não é 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { code: 'PATIENT_NOT_FOUND', message: 'Paciente não encontrado' } }),
    }) as unknown as typeof fetch;

    await expect(apiGet('/api/v1/patients/1')).rejects.toMatchObject({
      status: 404,
      code: 'PATIENT_NOT_FOUND',
    });
    await expect(apiGet('/api/v1/patients/1')).rejects.toBeInstanceOf(ApiError);
  });

  it('propaga o erro quando a chamada de fetch rejeita (falha de rede)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;

    await expect(apiGet('/api/v1/feature-flags')).rejects.toThrow('Network request failed');
  });
});
