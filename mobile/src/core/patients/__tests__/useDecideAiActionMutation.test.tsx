import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { decideAiAction } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useDecideAiActionMutation } from '@/core/patients/useDecideAiActionMutation';

jest.mock('@/core/api/ai-actions');

const mockedDecideAiAction = decideAiAction as jest.MockedFunction<typeof decideAiAction>;

const actionOne: AiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

const actionTwo: AiAction = {
  id: 'ai-action-2',
  patientId: 'patient-1',
  title: 'Aumentar ingestão de fibras',
  rationale: 'Colesterol LDL acima da faixa',
  priority: 'medium',
  biomarkers: ['ldl'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

async function renderMutation(
  queryClient: ReturnType<typeof createTestQueryClient>,
  patientId: string,
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useDecideAiActionMutation(patientId), { wrapper });
}

describe('useDecideAiActionMutation', () => {
  afterEach(() => {
    mockedDecideAiAction.mockReset();
  });

  it('no sucesso com "accepted", substitui só o item decidido no array em cache', async () => {
    const accepted: AiAction = { ...actionOne, status: 'accepted' };
    mockedDecideAiAction.mockResolvedValue(accepted);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate({ actionId: 'ai-action-1', status: 'accepted' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([accepted, actionTwo]);
  });

  it('no sucesso com "dismissed", substitui só o item decidido no array em cache', async () => {
    const dismissed: AiAction = { ...actionTwo, status: 'dismissed' };
    mockedDecideAiAction.mockResolvedValue(dismissed);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate({ actionId: 'ai-action-2', status: 'dismissed' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionOne, dismissed]);
  });

  it('não altera nenhum item do cache antes da mutation resolver (nenhuma mudança otimista)', async () => {
    let resolveDecide: (value: AiAction) => void = () => {};
    mockedDecideAiAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecide = resolve;
        }),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate({ actionId: 'ai-action-1', status: 'accepted' });

    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionOne, actionTwo]);

    resolveDecide({ ...actionOne, status: 'accepted' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('não altera nenhum item do cache quando a mutation falha', async () => {
    mockedDecideAiAction.mockRejectedValue(new ApiError('Já decidida', 409, 'AI_ACTION_ALREADY_DECIDED'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate({ actionId: 'ai-action-1', status: 'accepted' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionOne, actionTwo]);
  });
});
