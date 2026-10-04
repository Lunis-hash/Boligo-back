import { useFonts } from 'expo-font';
import {
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { BrandFont } from '@/constants/brand';

type FontRole = keyof typeof BrandFont;

/**
 * Charge les polices de la marque sans bloquer l'affichage : tant qu'elles ne
 * sont pas prêtes, `font()` renvoie undefined et le texte utilise la police
 * du système.
 */
export function useBrandFonts() {
  const [loaded, error] = useFonts({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    PlusJakartaSans_400Regular,
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
