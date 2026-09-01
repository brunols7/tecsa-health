import type { Brand } from '@/core/theme/brand.types';

import { nutriCareBrand } from './nutri-care';
import { vitaPlusBrand } from './vita-plus';

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
