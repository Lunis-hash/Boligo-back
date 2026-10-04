import { Platform, TextStyle } from 'react-native';
import { BrandFont } from '@/constants/brand';

export interface LandingFonts {
  title: TextStyle;
  titleItalic: TextStyle;
  text: TextStyle;
  medium: TextStyle;
  semi: TextStyle;
  bold: TextStyle;
}

const serifFallback = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, serif' });

/**
 * Styles de police de la page d'accueil. Tant que les polices de la marque ne
 * sont pas chargées, on garde une police système de même allure.
 */
export function landingFonts(ready: boolean): LandingFonts {
  if (ready) {
    // Ligatures désactivées : le glyphe « fi » des fichiers de police
    // s'affiche vide dans certains navigateurs (« profl » au lieu de « profil »).
    const plain: TextStyle['fontVariant'] = ['no-common-ligatures'];
    return {
      title: { fontFamily: BrandFont.titre, fontVariant: plain },
      titleItalic: { fontFamily: BrandFont.titreItalique, fontVariant: plain },
      text: { fontFamily: BrandFont.texte, fontVariant: plain },
      medium: { fontFamily: BrandFont.texteMoyen, fontVariant: plain },
      semi: { fontFamily: BrandFont.texteDemi, fontVariant: plain },
      bold: { fontFamily: BrandFont.texteGras, fontVariant: plain },
    };
  }
  return {
    title: { fontFamily: serifFallback, fontWeight: '500' },
    titleItalic: { fontFamily: serifFallback, fontWeight: '500', fontStyle: 'italic' },
    text: { fontWeight: '400' },
    medium: { fontWeight: '500' },
    semi: { fontWeight: '600' },
    bold: { fontWeight: '700' },
  };
}
