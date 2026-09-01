import type { Brand } from '@/core/theme/brand.types';

export const assets: Pick<Brand, 'assets'>['assets'] = {
  logo: require('./assets/logo.png'),
  splashIcon: require('./assets/splash-icon.png'),
};
