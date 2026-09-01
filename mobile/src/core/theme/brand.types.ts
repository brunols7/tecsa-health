import type { ImageSourcePropType } from 'react-native';

/**
 * Chaves de feature flag conhecidas pelo core. O valor default de cada marca
 * (em `Brand.defaults`) é usado enquanto `GET /api/v1/feature-flags` não
 * responde — ver CLAUDE.md §5.7.
 */
export type FeatureFlags = {
  aiActionsEnabled: boolean;
  offlineBanner: boolean;
};

/**
 * Contrato que toda marca deve satisfazer. O core nunca importa uma marca
 * diretamente — consome sempre este tipo via `useTheme()`.
 *
 * Tokens são semânticos (papel na interface), nunca literais (nome da cor).
 * Ver CLAUDE.md §5.2.
 */
export type Brand = {
  id: string;
  displayName: string;
  colors: {
    background: string;
    surface: string;
    surfaceMuted: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    accentContrast: string;
    success: string;
    warning: string;
    danger: string;
    border: string;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    scale: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      display: number;
    };
  };
  radii: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
  spacing: (n: number) => number;
  assets: {
    logo: ImageSourcePropType;
    splashIcon: ImageSourcePropType;
  };
  copy: {
    patientsTitle: string;
    emptyPatients: string;
    aiDisclaimer: string;
  };
  defaults: FeatureFlags;
};
