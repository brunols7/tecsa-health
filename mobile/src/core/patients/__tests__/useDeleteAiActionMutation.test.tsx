import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { deleteAiAction } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useDeleteAiActionMutation } from '@/core/patients/useDeleteAiActionMutation';

jest.mock('@/core/api/ai-actions');

const mockedDeleteAiAction = deleteAiAction as jest.MockedFunction<typeof deleteAiAction>;

const actionOne: AiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'accepted',
  createdAt: '2026-01-01T10:00:00Z',
};

const actionTwo: AiAction = {
  id: 'ai-action-2',
  patientId: 'patient-1',
  title: 'Aumentar ingestão de fibras',
  rationale: 'Colesterol LDL acima da faixa',
  priority: 'medium',
  biomarkers: ['ldl'],
  status: 'dismissed',
  createdAt: '2026-01-01T10:00:00Z',
};

async function renderMutation(
  queryClient: ReturnType<typeof createTestQueryClient>,
  patientId: string,
) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useDeleteAiActionMutation(patientId), { wrapper });
}

describe('useDeleteAiActionMutation', () => {
  afterEach(() => {
    mockedDeleteAiAction.mockReset();
  });

  it('no sucesso, remove só a ação excluída do array em cache', async () => {
    mockedDeleteAiAction.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate('ai-action-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionTwo]);
  });

  it('não altera o cache antes da mutation resolver (nenhuma mudança otimista)', async () => {
    let resolveDelete: (value: void) => void = () => {};
    mockedDeleteAiAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve;
        }),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate('ai-action-1');

    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionOne, actionTwo]);

    resolveDelete(undefined);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('não altera o cache quando a mutation falha', async () => {
    mockedDeleteAiAction.mockRejectedValue(
      new ApiError('Já resolvida', 409, 'AI_ACTION_ALREADY_RESOLVED'),
    );
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], [actionOne, actionTwo]);

    const { result } = await renderMutation(queryClient, 'patient-1');

    result.current.mutate('ai-action-1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([actionOne, actionTwo]);
  });
});
