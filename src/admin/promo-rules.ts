import { DiscountType } from '@prisma/client';

/** Code promo : lettres et chiffres en majuscules, 3 à 30 caractères. */
export function normalizePromoCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^[A-Z0-9]{3,30}$/.test(code) ? code : null;
}

/**
 * Valeur de remise cohérente avec son type : pourcentage de 1 à 100, montant
 * fixe en centimes (1 centime à 1 000 €), gratuité sans valeur.
 * Renvoie la valeur à enregistrer, ou un message d'erreur.
 */
export function checkDiscount(
  type: DiscountType,
  value: number | undefined,
): { value: number } | { error: string } {
  if (type === DiscountType.free) return { value: 0 };
  if (value === undefined || !Number.isInteger(value)) {
    return { error: 'Indiquez la valeur de la réduction.' };
  }
  if (type === DiscountType.percent && (value < 1 || value > 100)) {
    return { error: 'Une réduction en pourcentage va de 1 à 100 %.' };
  }
  if (type === DiscountType.fixed && (value < 1 || value > 100_000)) {
    return { error: 'Une réduction fixe va de 0,01 € à 1 000 €.' };
  }
  return { value };
}
