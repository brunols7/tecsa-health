import { render } from '@testing-library/react-native';
import { Text as MockText } from 'react-native';

import { useBiometricGate } from '@/core/auth/useBiometricGate';

import TabLayout from '../_layout';

jest.mock('@/core/auth/useBiometricGate');

jest.mock('@/components/animated-icon', () => ({
  __esModule: true,
  AnimatedSplashOverlay: () => null,
}));

jest.mock('@/components/app-tabs', () => ({
  __esModule: true,
  default: () => <MockText>AppTabsStub</MockText>,
}));

const mockedUseBiometricGate = useBiometricGate as jest.MockedFunction<typeof useBiometricGate>;

describe('TabLayout', () => {
  afterEach(() => {
    mockedUseBiometricGate.mockReset();
  });

  it('não renderiza AppTabs enquanto o gate biométrico não resolveu', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'checking',
      warning: undefined,
      retry: jest.fn(),
    });

    const { queryByText } = await render(<TabLayout />);

    expect(queryByText('AppTabsStub')).toBeNull();
  });

  it('renderiza AppTabs assim que o gate biométrico resolve para unlocked', async () => {
    mockedUseBiometricGate.mockReturnValue({
      status: 'unlocked',
      reason: 'biometric',
      warning: undefined,
      retry: jest.fn(),
    });

    const { queryByText } = await render(<TabLayout />);

    expect(queryByText('AppTabsStub')).toBeTruthy();
  });
});
