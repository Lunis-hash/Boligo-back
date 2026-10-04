/**
 * Palette de l'application, alignée sur l'identité « Couleur » (constants/brand.ts) :
 * framboise et lavande en tête, bleu nuit en contrepoint, textes prune foncé.
 * Les anciens noms de jetons sont conservés pour ne pas toucher chaque écran.
 */
export const Colors = {
  primary: {
    red: '#C62A6E', // framboise
    coral: '#E2679A', // rose vif
    purple: '#7C5CDB', // lavande
    orange: '#33287A', // bleu nuit (plus d'orange dans l'identité)
    rose: '#D63F7E',
    blue: '#4E6BD6',
  },
  neutral: {
    white: '#FFFFFF',
    black: '#2A1B3D',
    backgroundLight: '#FBF5F8',
    border: '#EDE4EC',
  },
  text: {
    primary100: '#2A1B3D',
    primary70: '#5E4F6E',
    primary40: '#9A8FA8',
    secondary: '#6B5E7A',
    inactive: '#9A8FA8',
  },
};

export const Typography: any = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
    serif: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    h1: 32,
    h2: 24,
    h3: 20,
    body: 15,
    label: 13,
    labelLarge: 15,
  },
  h1: { fontSize: 32, fontFamily: 'System' },
  h2: { fontSize: 24, fontFamily: 'System' },
  h3: { fontSize: 20, fontFamily: 'System' },
  body: { fontSize: 15, fontFamily: 'System' },
  label: { fontSize: 13, fontFamily: 'System' },
  labelLarge: { fontSize: 15, fontFamily: 'System' },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
};
