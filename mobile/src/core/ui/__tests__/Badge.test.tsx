import { render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { Badge } from '@/core/ui/Badge';

type FlatStyle = { backgroundColor?: string; borderRadius?: number; color?: string };

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style ?? {}) as FlatStyle;
}

function buildFakeBrand(surfaceMuted: string, textSecondary: string, radiusPill: number): Brand {
  return {
    id: 'brand-a',
    displayName: 'Brand A',
    colors: {
      background: '#ffffff',
      surface: '#f0f0f0',
      surfaceMuted,
      textPrimary: '#000000',
      textSecondary,
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
    radii: { sm: 4, md: 8, lg: 12, pill: radiusPill },
    spacing: (n: number) => n * 4,
    assets: { logo: { uri: 'logo' }, splashIcon: { uri: 'splash' } },
    copy: { patientsTitle: 'Patients', emptyPatients: 'No patients', aiDisclaimer: 'Disclaimer' },
    defaults: { aiActionsEnabled: false, offlineBanner: true },
  };
}

const fakeBrandA = buildFakeBrand('#e0e0e0', '#333333', 999);
const fakeBrandB = buildFakeBrand('#d0f0ff', '#004466', 4);

describe('Badge', () => {
  it('renderiza o label recebido', async () => {
    const { getByText } = await render(
      <BrandProvider brand={fakeBrandA}>
        <Badge label="Emagrecimento" />
      </BrandProvider>,
    );

    expect(getByText('Emagrecimento')).toBeTruthy();
  });

  it('renderiza nas duas marcas aplicando tokens de cor/raio distintos', async () => {
    const brandA = await render(
      <BrandProvider brand={fakeBrandA}>
        <Badge label="Emagrecimento" testID="badge" />
      </BrandProvider>,
    );
    const containerStyleA = flattenStyle(brandA.getByTestId('badge').props.style);
    const textStyleA = flattenStyle(brandA.getByText('Emagrecimento').props.style);
    await brandA.unmount();

    const brandB = await render(
      <BrandProvider brand={fakeBrandB}>
        <Badge label="Emagrecimento" testID="badge" />
      </BrandProvider>,
    );
    const containerStyleB = flattenStyle(brandB.getByTestId('badge').props.style);
    const textStyleB = flattenStyle(brandB.getByText('Emagrecimento').props.style);
    await brandB.unmount();

    expect(containerStyleA.backgroundColor).toBe(fakeBrandA.colors.surfaceMuted);
    expect(containerStyleB.backgroundColor).toBe(fakeBrandB.colors.surfaceMuted);
    expect(containerStyleA.backgroundColor).not.toBe(containerStyleB.backgroundColor);

    expect(containerStyleA.borderRadius).toBe(fakeBrandA.radii.pill);
    expect(containerStyleB.borderRadius).toBe(fakeBrandB.radii.pill);
    expect(containerStyleA.borderRadius).not.toBe(containerStyleB.borderRadius);

    expect(textStyleA.color).toBe(fakeBrandA.colors.textSecondary);
    expect(textStyleB.color).toBe(fakeBrandB.colors.textSecondary);
    expect(textStyleA.color).not.toBe(textStyleB.color);
  });
});
