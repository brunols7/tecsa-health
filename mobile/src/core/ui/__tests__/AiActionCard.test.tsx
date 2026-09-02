import type { UseMutationResult } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';

import { ApiError } from '@/core/api/http';
import type { AiAction } from '@/core/api/schemas/ai-action';
import { useDecideAiActionMutation } from '@/core/patients/useDecideAiActionMutation';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { AiActionCard } from '@/core/ui/AiActionCard';

jest.mock('@/core/patients/useDecideAiActionMutation');

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
  copy: { patientsTitle: 'Patients', emptyPatients: 'No patients', aiDisclaimer: 'Disclaimer' },
  defaults: { aiActionsEnabled: false, offlineBanner: true },
};

const mockedUseDecideAiActionMutation = useDecideAiActionMutation as jest.MockedFunction<
  typeof useDecideAiActionMutation
>;

type DecideAiActionInput = { actionId: string; status: 'accepted' | 'dismissed' };
type DecideMutation = UseMutationResult<AiAction, ApiError, DecideAiActionInput>;

function idleMutation(mutate: jest.Mock = jest.fn()): DecideMutation {
  return {
    mutate,
    isPending: false,
    isError: false,
    isSuccess: false,
    variables: undefined,
  } as unknown as DecideMutation;
}

function inFlightMutation(mutate: jest.Mock, variables: DecideAiActionInput): DecideMutation {
  return {
    mutate,
    isPending: true,
    isError: false,
    isSuccess: false,
    variables,
  } as unknown as DecideMutation;
}

function erroredMutation(mutate: jest.Mock, variables: DecideAiActionInput): DecideMutation {
  return {
    mutate,
    isPending: false,
    isError: true,
    isSuccess: false,
    variables,
  } as unknown as DecideMutation;
}

const pendingAction: AiAction = {
  id: 'ai-action-1',
  patientId: 'patient-1',
  title: 'Reduzir consumo de açúcar',
  rationale: 'HbA1c acima da faixa de referência',
  priority: 'high',
  biomarkers: ['hba1c'],
  status: 'pending',
  createdAt: '2026-01-01T10:00:00Z',
};

function renderCard(action: AiAction) {
  return render(
    <BrandProvider brand={fakeBrand}>
      <AiActionCard action={action} patientId="patient-1" />
    </BrandProvider>,
  );
}

describe('AiActionCard', () => {
  afterEach(() => {
    mockedUseDecideAiActionMutation.mockReset();
  });

  it('ação pending renderiza os botões Aceitar e Descartar', async () => {
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation());

    const { getByTestId } = await renderCard(pendingAction);

    expect(getByTestId('ai-action-accept-ai-action-1')).toBeTruthy();
    expect(getByTestId('ai-action-dismiss-ai-action-1')).toBeTruthy();
    expect(getByTestId('ai-action-accept-ai-action-1').props.accessibilityState?.disabled).toBe(false);
    expect(getByTestId('ai-action-dismiss-ai-action-1').props.accessibilityState?.disabled).toBe(false);
  });

  it('tocar Aceitar desabilita os dois botões até resolver, depois mostra "Aceita" sem botões', async () => {
    const mutate = jest.fn();
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation(mutate));

    const { getByTestId, rerender, queryByTestId } = await renderCard(pendingAction);

    await fireEvent.press(getByTestId('ai-action-accept-ai-action-1'));

    expect(mutate).toHaveBeenCalledWith({ actionId: 'ai-action-1', status: 'accepted' });

    mockedUseDecideAiActionMutation.mockReturnValue(
      inFlightMutation(mutate, { actionId: 'ai-action-1', status: 'accepted' }),
    );
    await rerender(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={pendingAction} patientId="patient-1" />
      </BrandProvider>,
    );

    expect(getByTestId('ai-action-accept-ai-action-1').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('ai-action-dismiss-ai-action-1').props.accessibilityState?.disabled).toBe(true);

    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation(mutate));
    await rerender(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={{ ...pendingAction, status: 'accepted' }} patientId="patient-1" />
      </BrandProvider>,
    );

    expect(getByTestId('ai-action-status-ai-action-1')).toBeTruthy();
    expect(queryByTestId('ai-action-accept-ai-action-1')).toBeNull();
    expect(queryByTestId('ai-action-dismiss-ai-action-1')).toBeNull();
  });

  it('tocar Descartar desabilita os dois botões até resolver, depois mostra "Descartada" sem botões', async () => {
    const mutate = jest.fn();
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation(mutate));

    const { getByTestId, rerender, queryByTestId, getByText } = await renderCard(pendingAction);

    await fireEvent.press(getByTestId('ai-action-dismiss-ai-action-1'));

    expect(mutate).toHaveBeenCalledWith({ actionId: 'ai-action-1', status: 'dismissed' });

    mockedUseDecideAiActionMutation.mockReturnValue(
      inFlightMutation(mutate, { actionId: 'ai-action-1', status: 'dismissed' }),
    );
    await rerender(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={pendingAction} patientId="patient-1" />
      </BrandProvider>,
    );

    expect(getByTestId('ai-action-accept-ai-action-1').props.accessibilityState?.disabled).toBe(true);
    expect(getByTestId('ai-action-dismiss-ai-action-1').props.accessibilityState?.disabled).toBe(true);

    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation(mutate));
    await rerender(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={{ ...pendingAction, status: 'dismissed' }} patientId="patient-1" />
      </BrandProvider>,
    );

    expect(getByText('Descartada')).toBeTruthy();
    expect(queryByTestId('ai-action-accept-ai-action-1')).toBeNull();
    expect(queryByTestId('ai-action-dismiss-ai-action-1')).toBeNull();
  });

  it('erro da mutation reabilita os dois botões e mostra a mensagem só neste card', async () => {
    const mutate = jest.fn();
    mockedUseDecideAiActionMutation.mockReturnValue(
      erroredMutation(mutate, { actionId: 'ai-action-1', status: 'accepted' }),
    );

    const otherAction: AiAction = { ...pendingAction, id: 'ai-action-2' };

    const { getByTestId, queryByTestId } = await render(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={pendingAction} patientId="patient-1" />
        <AiActionCard action={otherAction} patientId="patient-1" />
      </BrandProvider>,
    );

    expect(getByTestId('ai-action-error-ai-action-1')).toBeTruthy();
    expect(getByTestId('ai-action-accept-ai-action-1').props.accessibilityState?.disabled).toBe(false);
    expect(getByTestId('ai-action-dismiss-ai-action-1').props.accessibilityState?.disabled).toBe(false);

    expect(queryByTestId('ai-action-error-ai-action-2')).toBeNull();
    expect(getByTestId('ai-action-accept-ai-action-2').props.accessibilityState?.disabled).toBe(false);
  });

  it('ação já "accepted" (vinda do GET) renderiza o indicador final direto, sem botões', async () => {
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation());

    const { getByText, queryByTestId } = await renderCard({ ...pendingAction, status: 'accepted' });

    expect(getByText('Aceita')).toBeTruthy();
    expect(queryByTestId('ai-action-accept-ai-action-1')).toBeNull();
    expect(queryByTestId('ai-action-dismiss-ai-action-1')).toBeNull();
  });

  it('ação já "dismissed" (vinda do GET) renderiza o indicador final direto, sem botões', async () => {
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation());

    const { getByText, queryByTestId } = await renderCard({ ...pendingAction, status: 'dismissed' });

    expect(getByText('Descartada')).toBeTruthy();
    expect(queryByTestId('ai-action-accept-ai-action-1')).toBeNull();
    expect(queryByTestId('ai-action-dismiss-ai-action-1')).toBeNull();
  });

  it('diferencia visualmente prioridades diferentes usando cores do tema', async () => {
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation());

    const { getByTestId } = await render(
      <BrandProvider brand={fakeBrand}>
        <AiActionCard action={{ ...pendingAction, id: 'low-1', priority: 'low' }} patientId="patient-1" />
        <AiActionCard
          action={{ ...pendingAction, id: 'medium-1', priority: 'medium' }}
          patientId="patient-1"
        />
        <AiActionCard action={{ ...pendingAction, id: 'high-1', priority: 'high' }} patientId="patient-1" />
      </BrandProvider>,
    );

    const flatten = (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style) : style);

    expect(flatten(getByTestId('ai-action-priority-low-1').props.style).backgroundColor).toBe(
      fakeBrand.colors.success,
    );
    expect(flatten(getByTestId('ai-action-priority-medium-1').props.style).backgroundColor).toBe(
      fakeBrand.colors.warning,
    );
    expect(flatten(getByTestId('ai-action-priority-high-1').props.style).backgroundColor).toBe(
      fakeBrand.colors.danger,
    );
  });

  it('título longo encolhe (flex) e o badge de prioridade nunca encolhe, ficando dentro do card', async () => {
    mockedUseDecideAiActionMutation.mockReturnValue(idleMutation());

    const longTitleAction: AiAction = {
      ...pendingAction,
      title:
        'Reduzir drasticamente o consumo de açúcar refinado e carboidratos simples ao longo de todas as refeições do dia',
    };

    const { getByText, getByTestId } = await renderCard(longTitleAction);

    const flatten = (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style) : style);

    expect(flatten(getByText(longTitleAction.title).props.style).flex).toBe(1);
    expect(flatten(getByTestId('ai-action-priority-ai-action-1').props.style).flexShrink).toBe(0);
  });
});
