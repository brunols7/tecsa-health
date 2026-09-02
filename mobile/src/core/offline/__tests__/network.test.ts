import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { setupNetworkStatusListener, useIsOffline } from '@/core/offline/network';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    useNetInfo: jest.fn(),
  },
}));

const mockedAddEventListener = NetInfo.addEventListener as jest.MockedFunction<
  typeof NetInfo.addEventListener
>;
const mockedUseNetInfo = NetInfo.useNetInfo as jest.MockedFunction<typeof NetInfo.useNetInfo>;

describe('setupNetworkStatusListener', () => {
  afterEach(() => {
    mockedAddEventListener.mockReset();
  });

  it('devolve a função de unsubscribe do NetInfo.addEventListener', () => {
    const unsubscribe = jest.fn();
    mockedAddEventListener.mockReturnValue(unsubscribe);

    const result = setupNetworkStatusListener();

    expect(result).toBe(unsubscribe);
  });

  it('liga onlineManager.setOnline ao estado reportado pelo NetInfo', () => {
    const setOnlineSpy = jest.spyOn(onlineManager, 'setOnline');
    mockedAddEventListener.mockImplementation((listener) => {
      listener({ isConnected: true } as never);
      return jest.fn();
    });

    setupNetworkStatusListener();

    expect(setOnlineSpy).toHaveBeenCalledWith(true);
  });
});

describe('useIsOffline', () => {
  afterEach(() => {
    mockedUseNetInfo.mockReset();
  });

  it('reflete false quando o NetInfo reporta conectado', async () => {
    mockedUseNetInfo.mockReturnValue({ isConnected: true } as never);

    const { result } = await renderHook(() => useIsOffline());

    expect(result.current).toBe(false);
  });

  it('reflete true quando o NetInfo reporta desconectado', async () => {
    mockedUseNetInfo.mockReturnValue({ isConnected: false } as never);

    const { result } = await renderHook(() => useIsOffline());

    expect(result.current).toBe(true);
  });
});
