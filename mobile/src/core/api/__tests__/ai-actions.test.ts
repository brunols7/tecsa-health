import { decideAiAction, deleteAiAction, fetchAiActions, generateAiActions } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';

const fakeAiAction: AiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

describe('fetchAiActions', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama GET /api/v1/patients/:id/ai-actions e devolve a lista validada', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [fakeAiAction],
    }) as unknown as typeof fetch;

    const result = await fetchAiActions('patient-1');

    expect(global.fetch).toHaveBeenCalledWith('/api/v1/patients/patient-1/ai-actions');
    expect(result).toEqual([fakeAiAction]);
  });

  it('propaga ApiError quando a resposta não é 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { code: 'AI_DISABLED', message: 'IA desligada' } }),
    }) as unknown as typeof fetch;

    await expect(fetchAiActions('patient-1')).rejects.toBeInstanceOf(ApiError);
    await expect(fetchAiActions('patient-1')).rejects.toMatchObject({
      status: 503,
      code: 'AI_DISABLED',
    });
  });
});

describe('generateAiActions', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama POST /api/v1/patients/:id/ai-actions sem corpo e devolve a lista validada', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [fakeAiAction],
    }) as unknown as typeof fetch;

    const result = await generateAiActions('patient-1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/patients/patient-1/ai-actions',
      expect.objectContaining({ method: 'POST' }),
    );
    const call = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(call.body).toBeUndefined();
    expect(result).toEqual([fakeAiAction]);
  });

  it('propaga ApiError quando a resposta não é 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: { code: 'AI_UNAVAILABLE', message: 'IA indisponível' } }),
    }) as unknown as typeof fetch;

    await expect(generateAiActions('patient-1')).rejects.toBeInstanceOf(ApiError);
    await expect(generateAiActions('patient-1')).rejects.toMatchObject({
      status: 502,
      code: 'AI_UNAVAILABLE',
    });
  });
});

describe('decideAiAction', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama PATCH /api/v1/ai-actions/:id com o status e devolve a ação validada', async () => {
    const accepted = { ...fakeAiAction, status: 'accepted' as const };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => accepted,
    }) as unknown as typeof fetch;

    const result = await decideAiAction('ai-action-1', 'accepted');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/ai-actions/ai-action-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      }),
    );
    expect(result).toEqual(accepted);
  });

  it('propaga ApiError quando a resposta não é 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'AI_ACTION_ALREADY_DECIDED', message: 'Já decidida' } }),
    }) as unknown as typeof fetch;

    await expect(decideAiAction('ai-action-1', 'dismissed')).rejects.toBeInstanceOf(ApiError);
    await expect(decideAiAction('ai-action-1', 'dismissed')).rejects.toMatchObject({
      status: 409,
      code: 'AI_ACTION_ALREADY_DECIDED',
    });
  });
});

describe('deleteAiAction', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('chama DELETE /api/v1/ai-actions/:id', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 }) as unknown as typeof fetch;

    await deleteAiAction('ai-action-1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/ai-actions/ai-action-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('propaga ApiError quando a resposta não é 2xx', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'AI_ACTION_ALREADY_RESOLVED', message: 'Já resolvida' } }),
    }) as unknown as typeof fetch;

    await expect(deleteAiAction('ai-action-1')).rejects.toBeInstanceOf(ApiError);
    await expect(deleteAiAction('ai-action-1')).rejects.toMatchObject({
      status: 409,
      code: 'AI_ACTION_ALREADY_RESOLVED',
    });
  });
});
