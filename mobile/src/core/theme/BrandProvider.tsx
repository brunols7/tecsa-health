import { createContext, type ReactNode } from 'react';

import type { Brand } from '@/core/theme/brand.types';

export const BrandContext = createContext<Brand | null>(null);

type BrandProviderProps = {
  brand: Brand;
  children: ReactNode;
};

export function BrandProvider({ brand, children }: BrandProviderProps): ReactNode {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}
