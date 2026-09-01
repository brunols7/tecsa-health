import { useContext } from 'react';

import { BrandContext } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';

export function useTheme(): Brand {
  const brand = useContext(BrandContext);

  if (!brand) {
    throw new Error('useTheme() foi chamado fora de um BrandProvider.');
  }

  return brand;
}
