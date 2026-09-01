import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { QueryClient } from '@tanstack/react-query';

import { mmkvPersister } from '@/core/offline/storage';

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

export const queryClient = new QueryClient();

persistQueryClient({
  queryClient,
  persister: mmkvPersister,
});
