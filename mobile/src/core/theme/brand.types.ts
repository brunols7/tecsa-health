import type { ImageSourcePropType } from 'react-native';

export type FeatureFlags = {
  aiActionsEnabled: boolean;
  offlineBanner: boolean;
};

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
    emptyBiomarkers: string;
    emptyFilteredPatients: string;
  };
  defaults: FeatureFlags;
};
