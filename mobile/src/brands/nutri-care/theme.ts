import type { Brand } from '@/core/theme/brand.types';

/**
 * nutri-care — identidade clínica e sóbria. Fundo neutro frio, acento teal
 * profundo (não pastel), raios de borda pequenos (sensação de prontuário),
 * tipografia sans grotesca de peso médio.
 */
export const theme: Pick<
  Brand,
  'colors' | 'typography' | 'radii' | 'spacing'
> = {
  colors: {
    background: '#F2F5F7',
    surface: '#FFFFFF',
    surfaceMuted: '#E4EAEE',
    textPrimary: '#12222A',
    textSecondary: '#4C6270',
    accent: '#0F6E63',
    accentContrast: '#FFFFFF',
    success: '#1E7A4C',
    warning: '#9A6B00',
    danger: '#B3261E',
    border: '#CBD6DC',
  },
  typography: {
    fontFamily: {
      regular: 'Inter_500Medium',
      medium: 'Inter_600SemiBold',
      bold: 'Inter_700Bold',
    },
    scale: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      display: 32,
    },
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    pill: 24,
  },
  spacing: (n: number): number => n * 4,
};
