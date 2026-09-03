import { fireEvent, render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { PatientDetailMenuSheet } from '@/core/ui/PatientDetailMenuSheet';

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

async function renderSheet(props: Partial<Parameters<typeof PatientDetailMenuSheet>[0]> = {}) {
  const onClose = jest.fn();
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const utils = await render(
    <BrandProvider brand={fakeBrand}>
      <PatientDetailMenuSheet
        visible
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        deletePending={false}
        deleteFailed={false}
        {...props}
      />
    </BrandProvider>,
  );
  return { ...utils, onClose, onEdit, onDelete };
}

describe('PatientDetailMenuSheet', () => {
  it('toca em "Editar" chamando onEdit', async () => {
    const { getByTestId, onEdit } = await renderSheet();

    await fireEvent.press(getByTestId('patient-detail-edit-link'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('toca em "Excluir" chamando onDelete', async () => {
    const { getByTestId, onDelete } = await renderSheet();

    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('ignora o toque em excluir enquanto a exclusão anterior está pendente', async () => {
    const { getByTestId, onDelete } = await renderSheet({ deletePending: true });

    await fireEvent.press(getByTestId('patient-detail-delete-button'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('exibe a mensagem de erro quando a exclusão falha', async () => {
    const { queryByTestId } = await renderSheet({ deleteFailed: false });

    expect(queryByTestId('patient-detail-delete-error')).toBeNull();

    const { getByTestId: getByTestIdFailed } = await renderSheet({ deleteFailed: true });

    expect(getByTestIdFailed('patient-detail-delete-error')).toBeTruthy();
  });

  it('fecha sem editar ou excluir ao tocar no backdrop', async () => {
    const { getByTestId, onClose, onEdit, onDelete } = await renderSheet();

    await fireEvent.press(getByTestId('patient-detail-menu-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
