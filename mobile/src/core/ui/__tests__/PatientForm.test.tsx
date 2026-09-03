import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { PatientForm } from '@/core/ui/PatientForm';
import type { PatientFormValues } from '@/core/ui/PatientForm';

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

function renderForm(props: {
  mode: 'create' | 'edit';
  initialValues?: PatientFormValues;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  submitting: boolean;
  fieldErrors?: Partial<Record<keyof PatientFormValues, string>>;
}) {
  return render(
    <BrandProvider brand={fakeBrand}>
      <PatientForm {...props} />
    </BrandProvider>,
  );
}

describe('PatientForm', () => {
  it('mantém o botão de confirmar desabilitado até o nome ser preenchido', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({ mode: 'create', onSubmit, submitting: false });

    expect(getByTestId('patient-form-submit').props.accessibilityState?.disabled).toBe(true);

    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Silva');

    await waitFor(() =>
      expect(getByTestId('patient-form-submit').props.accessibilityState?.disabled).toBe(false),
    );
  });

  it('formata a data de nascimento automaticamente em DD/MM/AAAA enquanto o usuário digita', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({ mode: 'create', onSubmit, submitting: false });

    await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '05051990');

    expect(getByTestId('patient-form-birthdate-input').props.value).toBe('05/05/1990');
  });

  it('bloqueia o envio e mostra o erro do campo quando a data de nascimento está incompleta', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({ mode: 'create', onSubmit, submitting: false });

    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Silva');
    await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '0505');
    await fireEvent.press(getByTestId('patient-form-goal-lose_weight'));
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-form-birthdate-error')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia o envio e mostra o erro do campo quando nenhum objetivo é selecionado', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({ mode: 'create', onSubmit, submitting: false });

    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Silva');
    await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '05051990');
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() => expect(getByTestId('patient-form-goal-error')).toBeTruthy());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('chama onSubmit com os valores exatos (data convertida para AAAA-MM-DD) quando todos os campos são válidos', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({ mode: 'create', onSubmit, submitting: false });

    await fireEvent.changeText(getByTestId('patient-form-name-input'), 'Maria Silva');
    await fireEvent.changeText(getByTestId('patient-form-birthdate-input'), '05051990');
    await fireEvent.press(getByTestId('patient-form-goal-gain_muscle'));
    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'Maria Silva',
          birthDate: '1990-05-05',
          goal: 'gain_muscle',
        },
        expect.anything(),
      ),
    );
  });

  it('modo edit pré-preenche os campos, mostrando a data em DD/MM/AAAA e enviando em AAAA-MM-DD', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({
      mode: 'edit',
      initialValues: { name: 'João Souza', birthDate: '1985-02-10', goal: 'maintain' },
      onSubmit,
      submitting: false,
    });

    expect(getByTestId('patient-form-name-input').props.value).toBe('João Souza');
    expect(getByTestId('patient-form-birthdate-input').props.value).toBe('10/02/1985');

    await fireEvent.press(getByTestId('patient-form-submit'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {
          name: 'João Souza',
          birthDate: '1985-02-10',
          goal: 'maintain',
        },
        expect.anything(),
      ),
    );
  });

  it('exibe o erro externo (fieldErrors) embaixo do campo correspondente', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByText } = await renderForm({
      mode: 'create',
      onSubmit,
      submitting: false,
      fieldErrors: { name: 'Já existe um paciente com este nome' },
    });

    expect(getByTestId('patient-form-name-error')).toBeTruthy();
    expect(getByText('Já existe um paciente com este nome')).toBeTruthy();
  });

  it('desabilita o botão de confirmar enquanto submitting é true', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = await renderForm({
      mode: 'edit',
      initialValues: { name: 'João Souza', birthDate: '1985-02-10', goal: 'maintain' },
      onSubmit,
      submitting: true,
    });

    expect(getByTestId('patient-form-submit').props.accessibilityState?.disabled).toBe(true);
  });
});
