import { createContext, type ReactNode } from 'react';

import { resolveBrand } from '@/brands';
import type { Brand } from '@/core/theme/brand.types';

export const BrandContext = createContext<Brand | null>(null);

type BrandProviderProps = {
  brandId: string;
  children: ReactNode;
};

/**
 * Único lugar do core que resolve uma marca em runtime — via `brandId`
 * vindo de `Constants.expoConfig.extra.brandId` (preenchido por
 * `app.config.ts`). Nenhum outro componente do core chama `resolveBrand`
 * diretamente.
 */
export function BrandProvider({ brandId, children }: BrandProviderProps): ReactNode {
  const brand = resolveBrand(brandId);

  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}
