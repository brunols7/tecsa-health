import { useContext } from 'react';

import { BrandContext } from '@/core/theme/BrandProvider';
import type { Brand } from '@/core/theme/brand.types';

/**
 * Lê a marca resolvida do `BrandContext`. Lança erro claro fora de um
 * `BrandProvider` em vez de devolver `undefined` silencioso — um componente
 * sem tema deve falhar alto, não renderizar com valores ausentes.
 */
export function useTheme(): Brand {
  const brand = useContext(BrandContext);

  if (!brand) {
    throw new Error('useTheme() foi chamado fora de um BrandProvider.');
  }

  return brand;
}
