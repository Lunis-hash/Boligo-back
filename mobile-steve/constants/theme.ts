import { Platform } from 'react-native';

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

/**
 * Polices de la marque (chargées au démarrage par app/_layout.tsx) :
 * Plus Jakarta Sans pour les textes, Fraunces pour les titres.
 * Sur le web, une police système prend le relais le temps du chargement.
 */
const family = (name: string, fallback: string) =>
  Platform.select({ web: `${name}, ${fallback}`, default: name }) as string;
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const FONT = {
  regular: family('PlusJakartaSans_400Regular', SANS),
  medium: family('PlusJakartaSans_500Medium', SANS),
  semiBold: family('PlusJakartaSans_600SemiBold', SANS),
  bold: family('PlusJakartaSans_700Bold', SANS),
  serif: family('Fraunces_500Medium', SERIF),
  serifItalic: family('Fraunces_500Medium_Italic', SERIF),
  serifBold: family('Fraunces_600SemiBold', SERIF),
};

export const Typography: any = {
  fontFamily: FONT,
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
  h1: { fontSize: 32, fontFamily: FONT.serif },
  h2: { fontSize: 24, fontFamily: FONT.serif },
  h3: { fontSize: 20, fontFamily: FONT.semiBold },
  body: { fontSize: 15, fontFamily: FONT.regular },
  label: { fontSize: 13, fontFamily: FONT.medium },
  labelLarge: { fontSize: 15, fontFamily: FONT.medium },
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
