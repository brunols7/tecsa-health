import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export function setupNetworkStatusListener(): () => void {
  return NetInfo.addEventListener((state) => {
    onlineManager.setOnline(state.isConnected === true);
  });
}

export function useIsOffline(): boolean {
  const netInfo = NetInfo.useNetInfo();

  return netInfo.isConnected === false;
}
