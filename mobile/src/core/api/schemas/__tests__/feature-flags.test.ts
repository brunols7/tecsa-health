import { featureFlagsSchema } from '@/core/api/schemas/feature-flags';

describe('featureFlagsSchema', () => {
  it('aceita um payload completo', () => {
    const result = featureFlagsSchema.safeParse({ aiActionsEnabled: true, offlineBanner: false });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ aiActionsEnabled: true, offlineBanner: false });
  });

  it('aceita um payload parcial, incluindo objeto vazio', () => {
    const empty = featureFlagsSchema.safeParse({});
    const partial = featureFlagsSchema.safeParse({ aiActionsEnabled: true });

    expect(empty.success).toBe(true);
    expect(empty.data).toEqual({});
    expect(partial.success).toBe(true);
    expect(partial.data).toEqual({ aiActionsEnabled: true });
  });

  it('rejeita um payload com tipo errado', () => {
    const result = featureFlagsSchema.safeParse({ aiActionsEnabled: 'true' });

    expect(result.success).toBe(false);
  });
});
