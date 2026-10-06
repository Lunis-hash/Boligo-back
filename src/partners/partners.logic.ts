import { PartnerType } from '@prisma/client';

/** Préfixe d'un code partenaire : lettres du nom, sans accents, 3 à 8 caractères. */
export function codeStem(name: string): string {
  const letters = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const stem = letters.slice(0, 8);
  return stem.length >= 3 ? stem : `${stem}BLG`.slice(0, 8);
}

/** Code saisi par l'équipe : lettres et chiffres en majuscules, 4 à 20 caractères. */
export function normalizeCode(input: string): string | null {
  const code = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return code.length >= 4 && code.length <= 20 ? code : null;
}

/** Commission due, arrondie au centime. */
export function commissionDue(
  revenueEur: number,
  ratePercent: number | null | undefined,
): number {
  if (!ratePercent || revenueEur <= 0) return 0;
  return Math.round(revenueEur * ratePercent) / 100;
}

/** Commission par défaut selon le profil (modifiable dans le tableau de bord). */
export function defaultCommission(type: PartnerType): number | null {
  if (type === PartnerType.AMBASSADEUR) return 20;
  if (type === PartnerType.CREATEUR) return 15;
  return null;
}

const LABELS: Record<PartnerType, { fr: string; en: string }> = {
  ANNONCEUR: { fr: 'Marque / annonceur', en: 'Brand / advertiser' },
  AMBASSADEUR: { fr: 'Ambassadeur commercial', en: 'Sales ambassador' },
  CREATEUR: {
    fr: 'Créateur de contenu / influenceur',
    en: 'Content creator / influencer',
  },
};

export function partnerTypeLabel(
  type: PartnerType,
  lang: 'fr' | 'en' = 'fr',
): string {
  return LABELS[type][lang];
}
