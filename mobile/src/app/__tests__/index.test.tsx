import { render } from '@testing-library/react-native';

import { resolveBrand } from '@/brands';
import { BrandProvider } from '@/core/theme/BrandProvider';

import BrandProofScreen from '../index';

type FlatStyle = { backgroundColor?: string; borderRadius?: number };

function flattenStyle(style: unknown): FlatStyle {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style ?? {}) as FlatStyle;
}

describe('BrandProofScreen', () => {
  it('renderiza sem erro nas duas marcas e aplica cor de acento e raio distintos', async () => {
    const nutriCare = await render(
      <BrandProvider brand={resolveBrand('nutri-care')}>
        <BrandProofScreen />
      </BrandProvider>,
    );
    const nutriCareStyle = flattenStyle(
      nutriCare.getByTestId('brand-proof-accent-block').props.style,
    );
    const nutriCareName = nutriCare.getByText('NutriCare');
    await nutriCare.unmount();

    const vitaPlus = await render(
      <BrandProvider brand={resolveBrand('vita-plus')}>
        <BrandProofScreen />
      </BrandProvider>,
    );
    const vitaPlusStyle = flattenStyle(
      vitaPlus.getByTestId('brand-proof-accent-block').props.style,
    );
    const vitaPlusName = vitaPlus.getByText('VitaPlus');
    await vitaPlus.unmount();

    expect(nutriCareStyle.backgroundColor).toBeDefined();
    expect(vitaPlusStyle.backgroundColor).toBeDefined();
    expect(nutriCareStyle.backgroundColor).not.toBe(vitaPlusStyle.backgroundColor);
    expect(nutriCareStyle.borderRadius).toBeDefined();
    expect(vitaPlusStyle.borderRadius).toBeDefined();
    expect(nutriCareStyle.borderRadius).not.toBe(vitaPlusStyle.borderRadius);

    expect(nutriCareName).toBeTruthy();
    expect(vitaPlusName).toBeTruthy();
  });
});
