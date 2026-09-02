import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { generateAiActions } from '@/core/api/ai-actions';
import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useGenerateAiActionsMutation } from '@/core/patients/useGenerateAiActionsMutation';

jest.mock('@/core/api/ai-actions');

const mockedGenerateAiActions = generateAiActions as jest.MockedFunction<typeof generateAiActions>;

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

async function renderMutation(queryClient: ReturnType<typeof createTestQueryClient>) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useGenerateAiActionsMutation(), { wrapper });
}

describe('useGenerateAiActionsMutation', () => {
  afterEach(() => {
    mockedGenerateAiActions.mockReset();
  });

  it('no sucesso, popula a query ["ai-actions", patientId] com o resultado do POST', async () => {
    mockedGenerateAiActions.mockResolvedValue([fakeAiAction]);
    const queryClient = createTestQueryClient();

    const { result } = await renderMutation(queryClient);

    result.current.mutate('patient-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([fakeAiAction]);
  });

  it('não altera o cache antes da mutation resolver (nenhuma mudança otimista)', async () => {
    let resolveGenerate: (value: AiAction[]) => void = () => {};
    mockedGenerateAiActions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );
    const queryClient = createTestQueryClient();

    const { result } = await renderMutation(queryClient);

    result.current.mutate('patient-1');

    await waitFor(() => expect(result.current.isPending).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toBeUndefined();

    resolveGenerate([fakeAiAction]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([fakeAiAction]);
  });

  it('não altera o cache existente quando a mutation falha', async () => {
    mockedGenerateAiActions.mockRejectedValue(new ApiError('IA indisponível', 502, 'AI_UNAVAILABLE'));
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(['ai-actions', 'patient-1'], []);

    const { result } = await renderMutation(queryClient);

    result.current.mutate('patient-1');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([]);
  });
});
