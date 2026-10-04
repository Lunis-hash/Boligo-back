/**
 * Identité visuelle BOLIGO (direction « Couleur ») : framboise et lavande en
 * tête, bleu nuit en contrepoint. Aucun noir ni orange : les textes sont prune
 * foncé. Les contrastes texte/fond respectent le niveau AA.
 */
export const Brand = {
  framboise: '#C62A6E',
  lavande: '#7C5CDB',
  nuit: '#33287A',
  /** Teintes pastel des cartes et fonds. */
  rose: '#FDE6EF',
  lilas: '#EEE8FF',
  ciel: '#E3ECFF',
  /** Fond de page : blanc rosé. */
  fond: '#FFF8FA',
  blanc: '#FFFFFF',
  /** Textes. */
  encre: '#2A1B3D',
  encreDouce: '#5E4F6E',
  encrePale: '#8A7B98',
  /** Bordures très légères. */
  bordRose: '#F3E4EC',
  bordLilas: '#ECE6FA',
  bordCiel: '#E3E9F7',
  /** États (en ligne, action irréversible), accordés à la palette. */
  succes: '#1F8A65',
  danger: '#B3263E',
} as const;

/** Familles de polices chargées par useBrandFonts() (repli système sinon). */
export const BrandFont = {
  titre: 'Fraunces_500Medium',
  titreItalique: 'Fraunces_500Medium_Italic',
  titreGras: 'Fraunces_600SemiBold',
  texte: 'PlusJakartaSans_400Regular',
  texteMoyen: 'PlusJakartaSans_500Medium',
  texteDemi: 'PlusJakartaSans_600SemiBold',
  texteGras: 'PlusJakartaSans_700Bold',
} as const;
