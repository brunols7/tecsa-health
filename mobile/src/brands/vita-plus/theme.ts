import type { Brand } from '@/core/theme/brand.types';

export const theme: Pick<
  Brand,
  'colors' | 'typography' | 'radii' | 'spacing'
> = {
  colors: {
    background: '#FBF3E9',
    surface: '#FFFDF9',
    surfaceMuted: '#F3E4D2',
    textPrimary: '#3A2A20',
    textSecondary: '#7A6455',
    accent: '#F2734A',
    accentContrast: '#FFFFFF',
    success: '#3E9C6E',
    warning: '#C98A1E',
    danger: '#D65B4A',
    border: '#E8D5BE',
  },
  typography: {
    fontFamily: {
      regular: 'Nunito_400Regular',
      medium: 'Nunito_600SemiBold',
      bold: 'Nunito_700Bold',
    },
    scale: {
      xs: 13,
      sm: 15,
      md: 17,
      lg: 22,
      xl: 28,
      display: 36,
    },
  },
  radii: {
    sm: 10,
    md: 18,
    lg: 28,
    pill: 999,
  },
  spacing: (n: number): number => n * 4,
};
