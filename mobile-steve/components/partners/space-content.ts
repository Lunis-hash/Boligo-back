import type { PartnerLang } from './content';

/** Réponse de POST /partners/portal : totaux seulement, aucune donnée de membre. */
export interface PartnerSpaceData {
  partner: {
    name: string;
    company: string | null;
    type: 'ANNONCEUR' | 'AMBASSADEUR' | 'CREATEUR';
    language: string;
    commissionRate: number | null;
  };
  code: {
    code: string;
    discountType: 'percent' | 'fixed' | 'free';
    discountValue: number;
    isActive: boolean;
    expiresAt: string | null;
    uses: number;
  };
  totals: { purchases: number; revenue: number; commission: number };
  months: { month: string; purchases: number; revenue: number; commission: number }[];
  updatedAt: string;
}

export interface SpaceText {
  langSwitch: string;
  kicker: string;
  hello: (name: string) => string;
  intro: string;
  codeTitle: string;
  codeActive: string;
  codePaused: string;
  copy: string;
  copied: string;
  discount: (label: string) => string;
  expires: (date: string) => string;
  kpiPurchases: string;
  kpiRevenue: string;
  kpiCommission: (rate: number) => string;
  kpiUses: string;
  noCommission: string;
  historyTitle: string;
  historyEmpty: string;
  colMonth: string;
  colPurchases: string;
  colRevenue: string;
  colCommission: string;
  rulesTitle: string;
  rules: string[];
  privacy: string;
  updated: (date: string) => string;
  refresh: string;
  loading: string;
  invalidTitle: string;
  invalidText: string;
  tooMany: string;
  error: string;
  contact: string;
}

export const SPACE_CONTENT: Record<PartnerLang, SpaceText> = {
  fr: {
    langSwitch: 'English',
    kicker: 'Espace partenaire',
    hello: (name) => `Bonjour ${name}`,
    intro:
      'Retrouvez ici l’activité de votre code BOLIGO : les Parcours payés grâce à vous, le montant encaissé et votre commission, mois par mois.',
    codeTitle: 'Votre code personnel',
    codeActive: 'Actif',
    codePaused: 'En pause',
    copy: 'Copier',
    copied: 'Copié',
    discount: (label) => `${label} pour votre audience`,
    expires: (date) => `Valable jusqu’au ${date}`,
    kpiPurchases: 'Parcours payés avec votre code',
    kpiRevenue: 'Montant encaissé',
    kpiCommission: (rate) => `Votre commission (${rate} %)`,
    kpiUses: 'Utilisations du code',
    noCommission: 'Partenariat sous contrat : pas de commission sur les ventes.',
    historyTitle: 'Mois par mois',
    historyEmpty: 'Aucun Parcours payé avec votre code pour le moment.',
    colMonth: 'Mois',
    colPurchases: 'Parcours',
    colRevenue: 'Montant',
    colCommission: 'Commission',
    rulesTitle: 'Rappels pour vos publications',
    rules: [
      'Indiquez clairement « Collaboration commerciale » ou « Publicité » sur chaque contenu, pendant toute sa durée.',
      'Aucune promesse de résultat : BOLIGO aide à des rencontres sérieuses, sans garantie de couple.',
      'Jamais de profil, de photo ou de message de membre.',
      'BOLIGO est réservé aux personnes majeures : ne ciblez pas un public mineur.',
    ],
    privacy:
      'Vous voyez uniquement des totaux : l’identité des membres qui utilisent votre code n’est jamais partagée.',
    updated: (date) => `Chiffres à jour au ${date}`,
    refresh: 'Actualiser',
    loading: 'Chargement de votre espace…',
    invalidTitle: 'Ce lien ne fonctionne plus',
    invalidText:
      'Il a peut-être été remplacé par un lien plus récent. Écrivez-nous à contact@boligo.fr pour en recevoir un nouveau.',
    tooMany: 'Trop de consultations en peu de temps. Réessayez dans quelques minutes.',
    error: 'Impossible de charger votre espace pour le moment. Réessayez dans un instant.',
    contact: 'Une question sur votre partenariat ? contact@boligo.fr',
  },
  en: {
    langSwitch: 'Français',
    kicker: 'Partner space',
    hello: (name) => `Hello ${name}`,
    intro:
      'Follow the activity of your BOLIGO code here: the Journeys paid thanks to you, the amount collected and your commission, month by month.',
    codeTitle: 'Your personal code',
    codeActive: 'Active',
    codePaused: 'Paused',
    copy: 'Copy',
    copied: 'Copied',
    discount: (label) => `${label} for your audience`,
    expires: (date) => `Valid until ${date}`,
    kpiPurchases: 'Journeys paid with your code',
    kpiRevenue: 'Amount collected',
    kpiCommission: (rate) => `Your commission (${rate}%)`,
    kpiUses: 'Code uses',
    noCommission: 'Contract-based partnership: no commission on sales.',
    historyTitle: 'Month by month',
    historyEmpty: 'No Journey has been paid with your code yet.',
    colMonth: 'Month',
    colPurchases: 'Journeys',
    colRevenue: 'Amount',
    colCommission: 'Commission',
    rulesTitle: 'Reminders for your posts',
    rules: [
      'Clearly label every piece of content as an ad or a paid partnership (for example #ad), for as long as it is online.',
      'No promise of results: BOLIGO helps people meet seriously, with no guarantee of a relationship.',
      'Never show a member’s profile, photo or message.',
      'BOLIGO is for adults only: do not target a younger audience.',
    ],
    privacy:
      'You only see totals: the identity of the members who use your code is never shared.',
    updated: (date) => `Figures as of ${date}`,
    refresh: 'Refresh',
    loading: 'Loading your space…',
    invalidTitle: 'This link no longer works',
    invalidText:
      'It may have been replaced by a newer link. Write to contact@boligo.fr to receive a new one.',
    tooMany: 'Too many visits in a short time. Please try again in a few minutes.',
    error: 'Your space cannot be loaded right now. Please try again in a moment.',
    contact: 'A question about your partnership? contact@boligo.fr',
  },
};

/** Jeton placé après « # » dans le lien reçu par e-mail. */
export function readPortalToken(hash: string | null | undefined): string | null {
  const value = (hash ?? '').replace(/^#/, '').trim();
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

const locale = (lang: PartnerLang) => (lang === 'fr' ? 'fr-FR' : 'en-GB');

export function formatEuro(amount: number, lang: PartnerLang): string {
  return new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'EUR' }).format(amount);
}

/** « 2026-10 » → « octobre 2026 » / « October 2026 ». */
export function formatMonth(month: string, lang: PartnerLang): string {
  const [y, m] = month.split('-').map(Number);
  const label = new Intl.DateTimeFormat(locale(lang), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatDay(iso: string, lang: PartnerLang): string {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/** Réduction offerte par le code, lisible : « -10 % », « -5,00 € », « Parcours offert ». */
export function discountLabel(code: PartnerSpaceData['code'], lang: PartnerLang): string {
  if (code.discountType === 'free') return lang === 'fr' ? 'Parcours offert' : 'Free Journey';
  if (code.discountType === 'fixed') return `-${formatEuro(code.discountValue / 100, lang)}`;
  return lang === 'fr' ? `-${code.discountValue} %` : `-${code.discountValue}%`;
}
