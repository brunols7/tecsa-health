import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { BrandProvider } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';
import { QueryStateView } from '@/core/ui/QueryStateView';

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
    emptyFilteredPatients: 'No filtered patients',
  },
  defaults: { aiActionsEnabled: false, offlineBanner: true },
};

describe('QueryStateView', () => {
  it('renderiza o skeleton quando status é pending', async () => {
    const { getByText, queryByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <QueryStateView<string[]>
          status="pending"
          isEmpty={false}
          onRetry={jest.fn()}
          skeleton={<Text>skeleton-de-teste</Text>}
          emptyState={<Text>vazio-de-teste</Text>}
          errorMessage="deu erro"
          data={undefined}
        >
          {(data) => <Text>{data.join(',')}</Text>}
        </QueryStateView>
      </BrandProvider>,
    );

    expect(getByText('skeleton-de-teste')).toBeTruthy();
    expect(queryByText('vazio-de-teste')).toBeNull();
  });

  it('renderiza a mensagem de erro e o botão de retry quando status é error', async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <QueryStateView<string[]>
          status="error"
          isEmpty={false}
          onRetry={onRetry}
          skeleton={<Text>skeleton-de-teste</Text>}
          emptyState={<Text>vazio-de-teste</Text>}
          errorMessage="algo deu errado, tente de novo"
          data={undefined}
        >
          {(data) => <Text>{data.join(',')}</Text>}
        </QueryStateView>
      </BrandProvider>,
    );

    expect(getByText('algo deu errado, tente de novo')).toBeTruthy();

    fireEvent.press(getByText('Tentar novamente'));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renderiza o estado vazio quando status é success e isEmpty é true', async () => {
    const { getByText, queryByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <QueryStateView<string[]>
          status="success"
          isEmpty={true}
          onRetry={jest.fn()}
          skeleton={<Text>skeleton-de-teste</Text>}
          emptyState={<Text>vazio-de-teste</Text>}
          errorMessage="deu erro"
          data={[]}
        >
          {(data) => <Text>{data.join(',')}</Text>}
        </QueryStateView>
      </BrandProvider>,
    );

    expect(getByText('vazio-de-teste')).toBeTruthy();
    expect(queryByText('skeleton-de-teste')).toBeNull();
  });

  it('renderiza children(data) quando status é success e isEmpty é false', async () => {
    const { getByText, queryByText } = await render(
      <BrandProvider brand={fakeBrand}>
        <QueryStateView<string[]>
          status="success"
          isEmpty={false}
          onRetry={jest.fn()}
          skeleton={<Text>skeleton-de-teste</Text>}
          emptyState={<Text>vazio-de-teste</Text>}
          errorMessage="deu erro"
          data={['a', 'b', 'c']}
        >
          {(data) => <Text>{data.join(',')}</Text>}
        </QueryStateView>
      </BrandProvider>,
    );

    expect(getByText('a,b,c')).toBeTruthy();
    expect(queryByText('vazio-de-teste')).toBeNull();
  });
});
