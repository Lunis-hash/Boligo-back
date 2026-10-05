import { useFonts } from 'expo-font';
// Imports par graisse : seuls ces fichiers de police sont embarqués.
import { Fraunces_500Medium } from '@expo-google-fonts/fraunces/500Medium';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { BrandFont } from '@/constants/brand';

/*
 * Plus Jakarta Sans : copies locales des fichiers Google Fonts, sans les
 * ligatures « fi », « fl », « ff ». Le glyphe « fi » d'origine s'affiche
 * vide dans plusieurs navigateurs (« profl » au lieu de « profil »).
 * Régénération : voir assets/fonts/README.md.
 */
const PlusJakartaSans_400Regular = require('@/assets/fonts/PlusJakartaSans_400Regular.ttf');
const PlusJakartaSans_400Regular_Italic = require('@/assets/fonts/PlusJakartaSans_400Regular_Italic.ttf');
const PlusJakartaSans_500Medium = require('@/assets/fonts/PlusJakartaSans_500Medium.ttf');
const PlusJakartaSans_600SemiBold = require('@/assets/fonts/PlusJakartaSans_600SemiBold.ttf');
const PlusJakartaSans_700Bold = require('@/assets/fonts/PlusJakartaSans_700Bold.ttf');

type FontRole = keyof typeof BrandFont;

/**
 * Charge les polices de la marque. Tant qu'elles ne sont pas prêtes, `font()`
 * renvoie undefined et le texte utilise la police du système.
 */
export function useBrandFonts() {
  const [loaded, error] = useFonts({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_400Regular_Italic,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });
  const ready = loaded && !error;
  return {
    ready,
    font: (role: FontRole): string | undefined => (ready ? BrandFont[role] : undefined),
  };
}
