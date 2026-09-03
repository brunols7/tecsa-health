import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { createBiomarker } from '@/core/api/patients';
import { ApiError } from '@/core/api/http';
import type { Biomarker } from '@/core/api/schemas/biomarker';
import { createTestQueryClient } from '@/core/offline/queryClient';
import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { BiomarkerForm } from '@/core/ui/BiomarkerForm';

jest.mock('@/core/api/patients');

const mockedCreateBiomarker = createBiomarker as jest.MockedFunction<typeof createBiomarker>;

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
    aiDisclaimer: 'Disclaimer',
    emptyBiomarkers: 'No biomarkers',
    emptyFilteredPatients: 'No matching patients',
  },
  defaults: { aiActionsEnabled: false, offlineBanner: true },
};

const createdBiomarker: Biomarker = {
  id: 'bio-created',
  code: 'ferritina',
  label: 'Ferritina',
  value: 40,
  unit: 'ng/mL',
  refMin: 20,
  refMax: 200,
  measuredAt: '2026-01-01',
  status: 'normal',
};

async function renderForm(onSuccess: () => void = jest.fn()) {
  const queryClient = createTestQueryClient();
  const utils = await render(
    <QueryClientProvider client={queryClient}>
      <BrandProvider brand={fakeBrand}>
        <BiomarkerForm patientId="patient-1" onSuccess={onSuccess} />
      </BrandProvider>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

type GetByTestId = Awaited<ReturnType<typeof render>>['getByTestId'];

async function changeText(getByTestId: GetByTestId, testID: string, text: string) {
  await act(async () => {
    fireEvent.changeText(getByTestId(testID), text);
  });
}

async function press(getByTestId: GetByTestId, testID: string) {
  await act(async () => {
    fireEvent.press(getByTestId(testID));
  });
}

async function fillValidForm(getByTestId: GetByTestId) {
  await changeText(getByTestId, 'biomarker-form-label-input', 'Ferritina');
  await changeText(getByTestId, 'biomarker-form-value-input', '40');
  await changeText(getByTestId, 'biomarker-form-unit-input', 'ng/mL');
  await changeText(getByTestId, 'biomarker-form-ref-min-input', '20');
  await changeText(getByTestId, 'biomarker-form-ref-max-input', '200');
  await changeText(getByTestId, 'biomarker-form-measured-at-input', '2026-01-01');
}

describe('BiomarkerForm', () => {
  afterEach(() => {
    mockedCreateBiomarker.mockReset();
  });

  it('bloqueia o envio quando label está vazio, mostra erro no campo e não chama a API', async () => {
    const { getByTestId, queryByTestId } = await renderForm();

    await changeText(getByTestId, 'biomarker-form-value-input', '40');
    await changeText(getByTestId, 'biomarker-form-unit-input', 'ng/mL');
    await changeText(getByTestId, 'biomarker-form-ref-min-input', '20');
    await changeText(getByTestId, 'biomarker-form-ref-max-input', '200');
    await press(getByTestId, 'biomarker-form-submit');

    expect(getByTestId('biomarker-form-label-input-error')).toBeTruthy();
    expect(queryByTestId('biomarker-form-submit-error')).toBeNull();
    expect(mockedCreateBiomarker).not.toHaveBeenCalled();
  });

  it('bloqueia o envio quando value não é numérico e não chama a API', async () => {
    const { getByTestId } = await renderForm();

    await fillValidForm(getByTestId);
    await changeText(getByTestId, 'biomarker-form-value-input', 'quarenta');
    await press(getByTestId, 'biomarker-form-submit');

    expect(getByTestId('biomarker-form-value-input-error')).toBeTruthy();
    expect(mockedCreateBiomarker).not.toHaveBeenCalled();
  });

  it('bloqueia o envio quando refMin >= refMax e não chama a API', async () => {
    const { getByTestId } = await renderForm();

    await fillValidForm(getByTestId);
    await changeText(getByTestId, 'biomarker-form-ref-min-input', '200');
    await changeText(getByTestId, 'biomarker-form-ref-max-input', '100');
    await press(getByTestId, 'biomarker-form-submit');

    expect(getByTestId('biomarker-form-ref-max-input-error')).toBeTruthy();
    expect(mockedCreateBiomarker).not.toHaveBeenCalled();
  });

  it('atualiza o selo de status ao vivo pelos três estados ao digitar value/refMin/refMax', async () => {
    const { getByTestId, getByText } = await renderForm();

    await changeText(getByTestId, 'biomarker-form-ref-min-input', '20');
    await changeText(getByTestId, 'biomarker-form-ref-max-input', '200');

    await changeText(getByTestId, 'biomarker-form-value-input', '10');
    expect(getByText('low')).toBeTruthy();

    await changeText(getByTestId, 'biomarker-form-value-input', '40');
    expect(getByText('normal')).toBeTruthy();

    await changeText(getByTestId, 'biomarker-form-value-input', '999');
    expect(getByText('high')).toBeTruthy();
  });

  it('desabilita o botão de submit enquanto a mutation está em voo', async () => {
    let resolveCreate: (value: Biomarker) => void = () => {};
    mockedCreateBiomarker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const { getByTestId } = await renderForm();

    await fillValidForm(getByTestId);
    await press(getByTestId, 'biomarker-form-submit');

    expect(getByTestId('biomarker-form-submit').props.accessibilityState?.disabled).toBe(true);

    await act(async () => {
      resolveCreate(createdBiomarker);
    });
    await waitFor(() =>
      expect(getByTestId('biomarker-form-submit').props.accessibilityState?.disabled).toBe(false),
    );
  });

  it('em erro da mutation mantém os dados digitados, mostra erro inline e não chama onSuccess', async () => {
    mockedCreateBiomarker.mockRejectedValue(new ApiError('falha de rede', 500));
    const onSuccess = jest.fn();
    const { getByTestId } = await renderForm(onSuccess);

    await fillValidForm(getByTestId);
    await press(getByTestId, 'biomarker-form-submit');

    await waitFor(() => expect(getByTestId('biomarker-form-submit-error')).toBeTruthy());
    expect(getByTestId('biomarker-form-retry')).toBeTruthy();
    expect(getByTestId('biomarker-form-label-input').props.value).toBe('Ferritina');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('em sucesso chama onSuccess', async () => {
    mockedCreateBiomarker.mockResolvedValue(createdBiomarker);
    const onSuccess = jest.fn();
    const { getByTestId } = await renderForm(onSuccess);

    await fillValidForm(getByTestId);
    await press(getByTestId, 'biomarker-form-submit');

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });
});
