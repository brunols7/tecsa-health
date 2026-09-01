import type { Brand } from '@/core/theme/brand.types';

import { nutriCareBrand } from './nutri-care';
import { vitaPlusBrand } from './vita-plus';

/**
 * Único arquivo fora de `brands/**` autorizado a importar `nutri-care/` e
 * `vita-plus/` diretamente. Todo o resto do app consome a marca resolvida
 * via `useTheme()` / `BrandProvider`.
 */
const registry: Record<string, Brand> = {
  'nutri-care': nutriCareBrand,
  'vita-plus': vitaPlusBrand,
};

export function resolveBrand(id: string): Brand {
  const brand = registry[id];

  if (!brand) {
    throw new Error(`Marca desconhecida: ${id}`);
  }

  return brand;
}
