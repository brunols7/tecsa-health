import type { Persister } from '@tanstack/query-persist-client-core';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { createMMKV } from 'react-native-mmkv';

export const mmkvStorage = createMMKV({ id: 'tecsa-health-cache' });

const mmkvStorageAdapter = {
  getItem: (key: string): string | null => mmkvStorage.getString(key) ?? null,
  setItem: (key: string, value: string): void => {
    mmkvStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    mmkvStorage.remove(key);
  },
};

export const mmkvPersister: Persister = createSyncStoragePersister({
  storage: mmkvStorageAdapter,
});
