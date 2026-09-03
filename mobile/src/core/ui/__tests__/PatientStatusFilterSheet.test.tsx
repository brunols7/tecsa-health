import { fireEvent, render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { PatientStatusFilterSheet } from '@/core/ui/PatientStatusFilterSheet';

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

async function renderSheet(props: Partial<Parameters<typeof PatientStatusFilterSheet>[0]> = {}) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const utils = await render(
    <BrandProvider brand={fakeBrand}>
      <PatientStatusFilterSheet
        visible
        current="active"
        onSelect={onSelect}
        onClose={onClose}
        {...props}
      />
    </BrandProvider>,
  );
  return { ...utils, onSelect, onClose };
}

describe('PatientStatusFilterSheet', () => {
  it('seleciona "Inativos e concluídos" chamando onSelect e fechando o modal', async () => {
    const { getByTestId, onSelect, onClose } = await renderSheet();

    await fireEvent.press(getByTestId('patient-status-filter-option-inactive_completed'));

    expect(onSelect).toHaveBeenCalledWith('inactive_completed');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('seleciona "Ativos" chamando onSelect e fechando o modal', async () => {
    const { getByTestId, onSelect, onClose } = await renderSheet({ current: 'inactive_completed' });

    await fireEvent.press(getByTestId('patient-status-filter-option-active'));

    expect(onSelect).toHaveBeenCalledWith('active');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marca visualmente a opção corrente como selecionada', async () => {
    const { getByTestId } = await renderSheet({ current: 'inactive_completed' });

    const activeOption = getByTestId('patient-status-filter-option-active');
    const inactiveOption = getByTestId('patient-status-filter-option-inactive_completed');

    const activeStyle = Array.isArray(activeOption.props.style)
      ? Object.assign({}, ...activeOption.props.style)
      : activeOption.props.style;
    const inactiveStyle = Array.isArray(inactiveOption.props.style)
      ? Object.assign({}, ...inactiveOption.props.style)
      : inactiveOption.props.style;

    expect(inactiveStyle.backgroundColor).not.toBe(activeStyle.backgroundColor);
    expect(inactiveStyle.backgroundColor).not.toBe('transparent');
  });

  it('fecha sem selecionar ao tocar no backdrop', async () => {
    const { getByTestId, onSelect, onClose } = await renderSheet();

    await fireEvent.press(getByTestId('patient-status-filter-backdrop'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
