import { fireEvent, render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { PatientLifecycleActions } from '@/core/ui/PatientLifecycleActions';

function buildFakeBrand(): Brand {
  return {
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
      aiDisclaimer: 'Disclaimer',
      emptyBiomarkers: 'No biomarkers',
      emptyFilteredPatients: 'No filtered patients',
    },
    defaults: { aiActionsEnabled: false, offlineBanner: true },
  };
}

const fakeBrand = buildFakeBrand();

function renderComponent(props: {
  status: 'active' | 'inactive' | 'completed';
  statusChangedAt: string;
  pending: boolean;
  onChangeStatus: (target: 'active' | 'inactive' | 'completed') => void;
}) {
  return render(
    <BrandProvider brand={fakeBrand}>
      <PatientLifecycleActions {...props} />
    </BrandProvider>,
  );
}

describe('PatientLifecycleActions', () => {
  it('renderiza "Marcar como inativo" e "Concluir acompanhamento" quando status é active', async () => {
    const onChangeStatus = jest.fn();
    const { getByText, queryByTestId } = await renderComponent({
      status: 'active',
      statusChangedAt: '2026-01-01T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    expect(getByText('Marcar como inativo')).toBeTruthy();
    expect(getByText('Concluir acompanhamento')).toBeTruthy();
    expect(queryByTestId('lifecycle-status-since')).toBeNull();
  });

  it('toque em "Marcar como inativo" chama onChangeStatus com target "inactive"', async () => {
    const onChangeStatus = jest.fn();
    const { getByTestId } = await renderComponent({
      status: 'active',
      statusChangedAt: '2026-01-01T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    fireEvent.press(getByTestId('lifecycle-action-inactivate'));

    expect(onChangeStatus).toHaveBeenCalledWith('inactive');
  });

  it('toque em "Concluir acompanhamento" chama onChangeStatus com target "completed"', async () => {
    const onChangeStatus = jest.fn();
    const { getByTestId } = await renderComponent({
      status: 'active',
      statusChangedAt: '2026-01-01T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    fireEvent.press(getByTestId('lifecycle-action-complete'));

    expect(onChangeStatus).toHaveBeenCalledWith('completed');
  });

  it('renderiza só "Reativar" e "Inativo desde {data}" quando status é inactive', async () => {
    const onChangeStatus = jest.fn();
    const { getByText, queryByText } = await renderComponent({
      status: 'inactive',
      statusChangedAt: '2026-03-05T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    expect(getByText('Reativar')).toBeTruthy();
    expect(getByText('Inativo desde 05/03/2026')).toBeTruthy();
    expect(queryByText('Marcar como inativo')).toBeNull();
    expect(queryByText('Concluir acompanhamento')).toBeNull();
    expect(queryByText('Reabrir acompanhamento')).toBeNull();
  });

  it('toque em "Reativar" chama onChangeStatus com target "active"', async () => {
    const onChangeStatus = jest.fn();
    const { getByTestId } = await renderComponent({
      status: 'inactive',
      statusChangedAt: '2026-03-05T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    fireEvent.press(getByTestId('lifecycle-action-reactivate'));

    expect(onChangeStatus).toHaveBeenCalledWith('active');
  });

  it('renderiza só "Reabrir acompanhamento" e "Concluído em {data}" quando status é completed', async () => {
    const onChangeStatus = jest.fn();
    const { getByText, queryByText } = await renderComponent({
      status: 'completed',
      statusChangedAt: '2026-05-20T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    expect(getByText('Reabrir acompanhamento')).toBeTruthy();
    expect(getByText('Concluído em 20/05/2026')).toBeTruthy();
    expect(queryByText('Marcar como inativo')).toBeNull();
    expect(queryByText('Concluir acompanhamento')).toBeNull();
    expect(queryByText('Reativar')).toBeNull();
  });

  it('toque em "Reabrir acompanhamento" chama onChangeStatus com target "active"', async () => {
    const onChangeStatus = jest.fn();
    const { getByTestId } = await renderComponent({
      status: 'completed',
      statusChangedAt: '2026-05-20T00:00:00.000Z',
      pending: false,
      onChangeStatus,
    });

    fireEvent.press(getByTestId('lifecycle-action-reopen'));

    expect(onChangeStatus).toHaveBeenCalledWith('active');
  });

  it('desabilita o botão quando pending é true', async () => {
    const onChangeStatus = jest.fn();
    const { getByTestId } = await renderComponent({
      status: 'inactive',
      statusChangedAt: '2026-03-05T00:00:00.000Z',
      pending: true,
      onChangeStatus,
    });

    expect(getByTestId('lifecycle-action-reactivate').props.accessibilityState?.disabled).toBe(true);
  });
});
