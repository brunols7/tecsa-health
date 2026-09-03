import { QueryClientProvider } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { deleteAiAction, fetchAiActions, generateAiActions } from '@/core/api/ai-actions';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { useFlag } from '@/core/flags/useFlag';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { AiActionsSection } from '@/core/ui/AiActionsSection';

jest.mock('@/core/api/ai-actions');
jest.mock('@/core/flags/useFlag');

const mockedFetchAiActions = fetchAiActions as jest.MockedFunction<typeof fetchAiActions>;
const mockedGenerateAiActions = generateAiActions as jest.MockedFunction<typeof generateAiActions>;
const mockedDeleteAiAction = deleteAiAction as jest.MockedFunction<typeof deleteAiAction>;
const mockedUseFlag = useFlag as jest.MockedFunction<typeof useFlag>;

const fakeBrand: Brand = {
  id: 'brand-a',
  displayName: 'Brand A',
  colors: {
    background: '#ffffff',
    surface: '#f0f0f0',
    surfaceMuted: '#e0e0e0',
    textPrimary: '#000000',
    textSecondary: '#333333',
    accent: '#0000ff',
    accentContrast: '#ffffff',
    success: '#00ff00',
    warning: '#ffaa00',
    danger: '#ff0000',
    border: '#cccccc',
  },
  typography: {
    fontFamily: { regular: 'System', medium: 'System', bold: 'System' },
    scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, display: 28 },
  },
  radii: { sm: 4, md: 8, lg: 12, pill: 999 },
  spacing: (n: number) => n * 4,
  assets: { logo: { uri: 'logo' }, splashIcon: { uri: 'splash' } },
  copy: {
    patientsTitle: 'Patients',
    emptyPatients: 'No patients',
    aiDisclaimer: 'Revise as sugestões da IA antes de aceitar.',
    emptyBiomarkers: 'No biomarkers',
    emptyFilteredPatients: 'No filtered patients',
  },
  defaults: { aiActionsEnabled: true, offlineBanner: true },
};

const fakeAction: AiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

function renderSection() {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={fakeBrand}>
        <AiActionsSection patientId="patient-1" />
      </BrandProvider>
    </QueryClientProvider>,
  );
}

describe('AiActionsSection', () => {
  beforeEach(() => {
    mockedUseFlag.mockReturnValue(true);
  });

  afterEach(() => {
    mockedFetchAiActions.mockReset();
    mockedGenerateAiActions.mockReset();
    mockedDeleteAiAction.mockReset();
    mockedUseFlag.mockReset();
  });

  it('não renderiza nada e não chama o GET quando a flag aiActionsEnabled está desligada', async () => {
    mockedUseFlag.mockReturnValue(false);
    mockedFetchAiActions.mockResolvedValue([]);

    const { queryByTestId, queryByText } = await renderSection();

    expect(queryByTestId('ai-actions-section')).toBeNull();
    expect(queryByText('Ações de acompanhamento')).toBeNull();
    expect(mockedFetchAiActions).not.toHaveBeenCalled();
  });

  it('exibe o skeleton enquanto o GET está pendente', async () => {
    mockedFetchAiActions.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = await renderSection();

    expect(getByTestId('ai-actions-skeleton')).toBeTruthy();
  });

  it('exibe o disclaimer, o convite e o botão "Gerar ações" quando a lista vem vazia', async () => {
    mockedFetchAiActions.mockResolvedValue([]);

    const { getByTestId, getByText, queryByTestId } = await renderSection();

    await waitFor(() => expect(getByTestId('ai-actions-generate-button')).toBeTruthy());
    expect(getByText('Revise as sugestões da IA antes de aceitar.')).toBeTruthy();
    expect(getByText('Ações de acompanhamento')).toBeTruthy();
    expect(queryByTestId('ai-actions-refresh-button')).toBeNull();
  });

  it('ao tocar "Gerar ações", desabilita o botão com loading e depois mostra a lista sem o botão', async () => {
    mockedFetchAiActions.mockResolvedValue([]);
    let resolveGenerate: (value: AiAction[]) => void = () => {};
    mockedGenerateAiActions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const { getByTestId, queryByTestId, getByText } = await renderSection();

    await waitFor(() => expect(getByTestId('ai-actions-generate-button')).toBeTruthy());

    await fireEvent.press(getByTestId('ai-actions-generate-button'));

    await waitFor(() => expect(getByTestId('ai-actions-generate-loading')).toBeTruthy());
    expect(getByTestId('ai-actions-generate-button').props.accessibilityState?.disabled).toBe(true);

    resolveGenerate([fakeAction]);

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());
    expect(queryByTestId('ai-actions-generate-button')).toBeNull();
  });

  it('exibe o disclaimer, um card por ação e o botão "Novas sugestões" (sem "Gerar ações"), acima dos cards, quando o GET devolve itens', async () => {
    mockedFetchAiActions.mockResolvedValue([fakeAction]);

    const { getByText, getByTestId, queryByTestId, toJSON } = await renderSection();

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());
    expect(getByText('Revise as sugestões da IA antes de aceitar.')).toBeTruthy();
    expect(queryByTestId('ai-actions-generate-button')).toBeNull();
    expect(getByTestId('ai-actions-refresh-button')).toBeTruthy();

    const tree = JSON.stringify(toJSON());
    const refreshButtonIndex = tree.indexOf('"ai-actions-refresh-button"');
    const firstCardIndex = tree.indexOf(`"ai-action-card-${fakeAction.id}"`);
    expect(refreshButtonIndex).toBeGreaterThan(-1);
    expect(firstCardIndex).toBeGreaterThan(-1);
    expect(refreshButtonIndex).toBeLessThan(firstCardIndex);
  });

  it('ao tocar "Novas sugestões", chama generateAiActions com refresh:true e substitui a lista pelo resultado do servidor sem duplicar', async () => {
    mockedFetchAiActions.mockResolvedValue([fakeAction]);
    const secondAction: AiAction = { ...fakeAction, id: 'ai-action-2', title: 'Aumentar ingestão de fibras' };
    let resolveGenerate: (value: AiAction[]) => void = () => {};
    mockedGenerateAiActions.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGenerate = resolve;
        }),
    );

    const { getByTestId, getByText, queryAllByText } = await renderSection();

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());

    await fireEvent.press(getByTestId('ai-actions-refresh-button'));

    expect(mockedGenerateAiActions).toHaveBeenCalledWith('patient-1', true);
    await waitFor(() => expect(getByTestId('ai-actions-refresh-loading')).toBeTruthy());
    expect(getByTestId('ai-actions-refresh-button').props.accessibilityState?.disabled).toBe(true);

    resolveGenerate([fakeAction, secondAction]);

    await waitFor(() => expect(getByText('Aumentar ingestão de fibras')).toBeTruthy());
    expect(queryAllByText('Reduzir consumo de açúcar')).toHaveLength(1);
  });

  it('erro ao buscar novas sugestões mostra mensagem isolada no botão, sem remover as ações já carregadas', async () => {
    mockedFetchAiActions.mockResolvedValue([fakeAction]);
    mockedGenerateAiActions.mockRejectedValue(new Error('refresh failed'));

    const { getByTestId, getByText } = await renderSection();

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());

    await fireEvent.press(getByTestId('ai-actions-refresh-button'));

    await waitFor(() => expect(getByTestId('ai-actions-refresh-error')).toBeTruthy());
    expect(getByText('Reduzir consumo de açúcar')).toBeTruthy();
    expect(getByTestId('ai-actions-refresh-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('exibe erro específico da seção com retry quando o GET falha, sem afetar o resto da tela', async () => {
    mockedFetchAiActions.mockRejectedValueOnce(new Error('boom'));

    const { getByText } = await renderSection();

    await waitFor(() =>
      expect(getByText('Não foi possível carregar as ações de acompanhamento.')).toBeTruthy(),
    );

    mockedFetchAiActions.mockResolvedValue([fakeAction]);
    await fireEvent.press(getByText('Tentar novamente'));

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());
  });

  it('reabilita o botão "Gerar ações" e mostra mensagem de erro quando o POST falha', async () => {
    mockedFetchAiActions.mockResolvedValue([]);
    mockedGenerateAiActions.mockRejectedValue(new Error('generate failed'));

    const { getByTestId } = await renderSection();

    await waitFor(() => expect(getByTestId('ai-actions-generate-button')).toBeTruthy());

    await fireEvent.press(getByTestId('ai-actions-generate-button'));

    await waitFor(() => expect(getByTestId('ai-actions-generate-error')).toBeTruthy());
    expect(getByTestId('ai-actions-generate-button').props.accessibilityState?.disabled).toBe(false);
  });

  it('excluir a última ação restante faz a tela cair no estado vazio', async () => {
    const acceptedAction: AiAction = { ...fakeAction, status: 'accepted' };
    mockedFetchAiActions.mockResolvedValue([acceptedAction]);
    mockedDeleteAiAction.mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Excluir');
      confirmButton?.onPress?.();
    });

    const { getByTestId, getByText, queryByTestId } = await renderSection();

    await waitFor(() => expect(getByText('Reduzir consumo de açúcar')).toBeTruthy());

    await fireEvent.press(getByTestId('ai-action-delete-ai-action-1'));

    await waitFor(() => expect(getByTestId('ai-actions-generate-button')).toBeTruthy());
    expect(queryByTestId(`ai-action-card-${acceptedAction.id}`)).toBeNull();

    alertSpy.mockRestore();
  });
});
