import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import { resolveBrand } from '@/brands';
import { fetchAiActions } from '@/core/api/ai-actions';
import { useFlag } from '@/core/flags/useFlag';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';

import PatientFollowUpScreen from '../follow-up';

jest.mock('@/core/api/ai-actions');
jest.mock('@/core/flags/useFlag');
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
}));

const mockedFetchAiActions = fetchAiActions as jest.MockedFunction<typeof fetchAiActions>;
const mockedUseFlag = useFlag as jest.MockedFunction<typeof useFlag>;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.MockedFunction<
  typeof useLocalSearchParams
>;

function renderScreen() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={resolveBrand('nutri-care')}>
        <PatientFollowUpScreen />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('PatientFollowUpScreen', () => {
  beforeEach(() => {
    mockedUseLocalSearchParams.mockReturnValue({ id: 'patient-1' } as unknown as ReturnType<
      typeof useLocalSearchParams
    >);
    mockedUseFlag.mockReturnValue(true);
    mockedFetchAiActions.mockResolvedValue([]);
  });

  afterEach(() => {
    mockedUseLocalSearchParams.mockReset();
    mockedUseFlag.mockReset();
    mockedFetchAiActions.mockReset();
  });

  it('renderiza a seção de ações de IA para o paciente da rota', async () => {
    mockedFetchAiActions.mockResolvedValue([
      {
        id: 'ai-action-1',
        patientId: 'patient-1',
        title: 'Reduzir consumo de açúcar',
        rationale: 'HbA1c acima da faixa de referência',
        priority: 'high',
        biomarkers: ['hba1c'],
        status: 'pending',
        createdAt: '2026-01-01T10:00:00Z',
      },
    ]);

    const { findByText } = await renderScreen();

    await findByText('Reduzir consumo de açúcar');
    expect(mockedFetchAiActions).toHaveBeenCalledWith('patient-1');
  });

  it('não renderiza nada quando o kill switch de IA está desligado', async () => {
    mockedUseFlag.mockReturnValue(false);

    const { queryByTestId } = await renderScreen();

    expect(queryByTestId('ai-actions-section')).toBeNull();
  });
});
