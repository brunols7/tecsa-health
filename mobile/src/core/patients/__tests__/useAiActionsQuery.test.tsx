import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { fetchAiActions } from '@/core/api/ai-actions';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { useFlag } from '@/core/flags/useFlag';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { useAiActionsQuery } from '@/core/patients/useAiActionsQuery';

jest.mock('@/core/api/ai-actions');
jest.mock('@/core/flags/useFlag');

const mockedFetchAiActions = fetchAiActions as jest.MockedFunction<typeof fetchAiActions>;
const mockedUseFlag = useFlag as jest.MockedFunction<typeof useFlag>;

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

async function renderQuery(queryClient: ReturnType<typeof createTestQueryClient>, patientId: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(() => useAiActionsQuery(patientId), { wrapper });
}

describe('useAiActionsQuery', () => {
  afterEach(() => {
    mockedFetchAiActions.mockReset();
    mockedUseFlag.mockReset();
  });

  it('usa a queryKey ["ai-actions", patientId] e devolve a lista ao ter sucesso', async () => {
    mockedUseFlag.mockReturnValue(true);
    mockedFetchAiActions.mockResolvedValue([fakeAiAction]);
    const queryClient = createTestQueryClient();

    const { result } = await renderQuery(queryClient, 'patient-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([fakeAiAction]);
    expect(queryClient.getQueryData(['ai-actions', 'patient-1'])).toEqual([fakeAiAction]);
  });

  it('não chama fetchAiActions quando a flag aiActionsEnabled está desligada', async () => {
    mockedUseFlag.mockReturnValue(false);
    const queryClient = createTestQueryClient();

    const { result } = await renderQuery(queryClient, 'patient-1');

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockedFetchAiActions).not.toHaveBeenCalled();
  });

  it('chama fetchAiActions quando a flag aiActionsEnabled está ligada', async () => {
    mockedUseFlag.mockReturnValue(true);
    mockedFetchAiActions.mockResolvedValue([]);
    const queryClient = createTestQueryClient();

    await renderQuery(queryClient, 'patient-1');

    await waitFor(() => expect(mockedFetchAiActions).toHaveBeenCalledWith('patient-1'));
  });
});
