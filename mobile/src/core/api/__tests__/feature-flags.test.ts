import { apiGet } from '@/core/api/http';
import { fetchFeatureFlags } from '@/core/api/feature-flags';

jest.mock('@/core/api/http');

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>;

describe('fetchFeatureFlags', () => {
  afterEach(() => {
    mockedApiGet.mockReset();
  });

  it('chama apiGet com o path e o brand corretos e devolve a resposta parseada', async () => {
    mockedApiGet.mockResolvedValue({ aiActionsEnabled: true, offlineBanner: false });

    const result = await fetchFeatureFlags('demo-brand');

    expect(mockedApiGet).toHaveBeenCalledWith('/api/v1/feature-flags', { brand: 'demo-brand' });
    expect(result).toEqual({ aiActionsEnabled: true, offlineBanner: false });
  });

  it('propaga o erro do zod quando a resposta falha o parse do schema', async () => {
    mockedApiGet.mockResolvedValue({ aiActionsEnabled: 'not-a-boolean' });

    await expect(fetchFeatureFlags('demo-brand')).rejects.toThrow();
  });
});
