import type { Brand } from '@/core/theme/brand.types';

import { assets } from './assets';
import { copy } from './copy';
import { theme } from './theme';

export const nutriCareBrand: Brand = {
  id: 'nutri-care',
  displayName: 'NutriCare',
  colors: theme.colors,
  typography: theme.typography,
  radii: theme.radii,
  spacing: theme.spacing,
  assets,
  copy,
  defaults: {
    aiActionsEnabled: true,
    offlineBanner: true,
  },
};
