import { fireEvent, render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { BiometricGateScreen } from '@/core/ui/BiometricGateScreen';
import type { BiometricGateResult } from '@/core/auth/useBiometricGate';

type FlatStyle = { backgroundColor?: string; borderRadius?: number };

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style ?? {}) as FlatStyle;
}

function buildFakeBrand(accent: string, radiusMd: number): Brand {
  return {
    id: 'brand-a',
    displayName: 'Brand A',
    colors: {
      background: '#ffffff',
      surface: '#f0f0f0',
      surfaceMuted: '#e0e0e0',
      textPrimary: '#000000',
      textSecondary: '#333333',
      accent,
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
    radii: { sm: 4, md: radiusMd, lg: 12, pill: 999 },
    spacing: (n: number) => n * 4,
    assets: { logo: { uri: 'logo' }, splashIcon: { uri: 'splash' } },
    copy: { patientsTitle: 'Patients', emptyPatients: 'No patients', aiDisclaimer: 'Disclaimer' },
    defaults: { aiActionsEnabled: false, offlineBanner: true },
  };
}

const fakeBrandA = buildFakeBrand('#0000ff', 8);
const fakeBrandB = buildFakeBrand('#22aa55', 20);

const statusAndReasonVariants: {
  status: BiometricGateResult['status'];
  reason?: Extract<BiometricGateResult, { status: 'unlocked' }>['reason'];
  warning?: string;
}[] = [
  { status: 'checking' },
  { status: 'locked' },
  { status: 'unlocked', reason: 'biometric' },
  { status: 'unlocked', reason: 'device_credential', warning: 'aviso de device credential' },
  {
    status: 'unlocked',
    reason: 'no_credential_available',
    warning: 'aviso de segurança sem credencial',
  },
];

describe('BiometricGateScreen', () => {
  it('renderiza sem erro nas duas marcas e aplica cor de acento e raio distintos no botão de retry', async () => {
    const brandA = await render(
      <BrandProvider brand={fakeBrandA}>
        <BiometricGateScreen status="locked" onRetry={jest.fn()} />
      </BrandProvider>,
    );
    const brandAStyle = flattenStyle(brandA.getByText('Tentar novamente').parent?.props.style);
    await brandA.unmount();

    const brandB = await render(
      <BrandProvider brand={fakeBrandB}>
        <BiometricGateScreen status="locked" onRetry={jest.fn()} />
      </BrandProvider>,
    );
    const brandBStyle = flattenStyle(brandB.getByText('Tentar novamente').parent?.props.style);
    await brandB.unmount();

    expect(brandAStyle.backgroundColor).toBeDefined();
    expect(brandBStyle.backgroundColor).toBeDefined();
    expect(brandAStyle.backgroundColor).not.toBe(brandBStyle.backgroundColor);
    expect(brandAStyle.borderRadius).toBeDefined();
    expect(brandBStyle.borderRadius).toBeDefined();
    expect(brandAStyle.borderRadius).not.toBe(brandBStyle.borderRadius);
  });

  it('não renderiza o botão de retry quando status não é locked', async () => {
    const { queryByText } = await render(
      <BrandProvider brand={fakeBrandA}>
        <BiometricGateScreen status="checking" onRetry={jest.fn()} />
      </BrandProvider>,
    );

    expect(queryByText('Tentar novamente')).toBeNull();
  });

  it('renderiza o botão de retry e dispara onRetry quando status é locked', async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      <BrandProvider brand={fakeBrandA}>
        <BiometricGateScreen status="locked" onRetry={onRetry} />
      </BrandProvider>,
    );

    fireEvent.press(getByText('Tentar novamente'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderiza sem erro para cada combinação possível de status e reason', async () => {
    for (const variant of statusAndReasonVariants) {
      const { unmount } = await render(
        <BrandProvider brand={fakeBrandA}>
          <BiometricGateScreen
            status={variant.status}
            reason={variant.reason}
            warning={variant.warning}
            onRetry={jest.fn()}
          />
        </BrandProvider>,
      );

      await unmount();
    }
  });
});
