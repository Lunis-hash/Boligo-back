import type { PartnerLang } from './content';

/** Réponse de POST /partners/portal : totaux seulement, aucune donnée de membre. */
export interface PartnerSpaceData {
  partner: {
    name: string;
    company: string | null;
    type: 'ANNONCEUR' | 'AMBASSADEUR' | 'CREATEUR';
    language: string;
    commissionRate: number | null;
    /** SUSPENDU : espace consultable, code et offres coupés. */
    status?: 'ACCEPTE' | 'SUSPENDU';
  };
  /** Absent (null) pour une marque sans code personnel. */
  code: {
    code: string;
    discountType: 'percent' | 'fixed' | 'free';
    discountValue: number;
    isActive: boolean;
    expiresAt: string | null;
    uses: number;
  } | null;
  /** Lien à partager (?p=CODE) : la réduction est appliquée d'office. */
  shareLink?: string | null;
  /** Tunnel : visites du lien → inscriptions → Parcours payés. */
  funnel?: {
    visits: number;
    signups: number;
    purchases: number;
    freeActivations: number;
    signupRate: number;
    purchaseRate: number;
    months: { month: string; visits: number; signups: number }[];
  };
  /** Offres de la marque montrées dans BOLIGO (annonceurs). */
  offers?: {
    id: string;
    title: string;
    perk: string;
    placement: 'OFFRES' | 'PARTENAIRE_DU_MOIS';
    isActive: boolean;
    live: boolean;
    impressions: number;
    clicks: number;
    clickRate: number;
    state?: OfferState;
    /** Ventes confirmées par la marque (relevé), jamais déduites des clics. */
    confirmedSales?: number;
  }[];
  totals: { purchases: number; revenue: number; commission: number };
  months: { month: string; purchases: number; revenue: number; commission: number }[];
  updatedAt: string;
}

export type OfferState = 'brouillon' | 'programmee' | 'en_ligne' | 'expiree' | 'retiree';

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
  linkTitle: string;
  linkHint: string;
  funnelTitle: string;
  funnelVisits: string;
  funnelSignups: string;
  funnelPurchases: string;
  funnelRate: (r: number) => string;
  funnelFree: (n: number) => string;
  funnelEmpty: string;
  kitTitle: string;
  kitHint: string;
  kitPosts: (link: string, discount: string) => string[];
  offersTitle: string;
  offersHint: string;
  offerPlacement: (p: 'OFFRES' | 'PARTENAIRE_DU_MOIS') => string;
  offerLive: string;
  offerOff: string;
  offerImpressions: string;
  offerClicks: string;
  offerRate: string;
  offerState: (s: OfferState) => string;
  offerConfirmed: string;
  offersClicksNote: string;
  suspendedTitle: string;
  suspendedText: string;
  brandIntro: string;
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
      'Retrouvez ici l’activité de votre lien et de votre code BOLIGO : visites, inscriptions, Parcours payés grâce à vous, montant encaissé et commission, mois par mois.',
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
    linkTitle: 'Votre lien à partager',
    linkHint:
      'Partagez ce lien plutôt que le code seul : chaque visite est comptée, et la réduction est appliquée automatiquement au paiement de la personne inscrite (jusqu’à 90 jours après son inscription).',
    funnelTitle: 'De votre lien au Parcours payé',
    funnelVisits: 'Visites via votre lien',
    funnelSignups: 'Inscriptions',
    funnelPurchases: 'Parcours payés',
    funnelRate: (r) => `${r} % de conversion`,
    funnelFree: (n) => `${n} Parcours offert${n > 1 ? 's' : ''} avec votre code (non comptés dans les ventes).`,
    funnelEmpty: 'Les visites apparaîtront ici dès que votre lien sera partagé.',
    kitTitle: 'Kit prêt à publier',
    kitHint: 'Copiez, adaptez à votre ton, gardez la mention « Collaboration commerciale ».',
    kitPosts: (link, discount) => [
      `Collaboration commerciale avec BOLIGO · Marre du swipe ? BOLIGO fait l’inverse : pas de photos au départ, un vrai entretien, puis des personnes qui partagent vos valeurs. ${discount} sur votre premier parcours avec mon lien : ${link}`,
      `#CollaborationCommerciale · J’ai découvert une appli de rencontre qui commence par les mots, pas par les photos. Si vous cherchez du sérieux : ${link} (${discount} sur le premier parcours, réservé aux majeurs)`,
      `Publicité · Story : « Et si on se rencontrait d’abord pour ce qu’on pense ? » → lien en bio : ${link}`,
    ],
    offersTitle: 'Vos offres dans BOLIGO',
    offersHint: 'Affichages et clics comptés chaque jour, sans aucune donnée sur les membres. Les visites arrivent chez vous avec utm_source=boligo.',
    offerPlacement: (p) => (p === 'PARTENAIRE_DU_MOIS' ? 'Partenaire du mois (accueil)' : 'Page Offres partenaires'),
    offerLive: 'En ligne',
    offerOff: 'Hors ligne',
    offerImpressions: 'Affichages',
    offerClicks: 'Clics',
    offerRate: 'Taux de clic',
    offerState: (s) =>
      ({ brouillon: 'Brouillon', programmee: 'Programmée', en_ligne: 'En ligne', expiree: 'Expirée', retiree: 'Retirée' })[s],
    offerConfirmed: 'Ventes confirmées',
    offersClicksNote:
      'Un clic n’est pas une vente : seules les ventes que vous nous confirmez (relevé mensuel) figurent dans « Ventes confirmées ».',
    suspendedTitle: 'Partenariat suspendu',
    suspendedText:
      'Votre code et vos offres sont en pause : ils ne sont plus proposés aux membres. Vos chiffres restent consultables. Écrivez-nous à contact@boligo.fr pour reprendre.',
    brandIntro:
      'Retrouvez ici les affichages, les clics et les ventes confirmées de vos offres dans BOLIGO, sans aucune donnée sur les membres.',
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
      'Follow the activity of your BOLIGO link and code here: visits, sign-ups, Journeys paid thanks to you, amount collected and commission, month by month.',
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
    linkTitle: 'Your link to share',
    linkHint:
      'Share this link rather than the code alone: every visit is counted, and the discount is applied automatically when the person who signed up pays (up to 90 days after sign-up).',
    funnelTitle: 'From your link to a paid Journey',
    funnelVisits: 'Visits via your link',
    funnelSignups: 'Sign-ups',
    funnelPurchases: 'Paid Journeys',
    funnelRate: (r) => `${r}% conversion`,
    funnelFree: (n) => `${n} free Journey${n > 1 ? 's' : ''} with your code (not counted as sales).`,
    funnelEmpty: 'Visits will show here as soon as your link is shared.',
    kitTitle: 'Ready-to-post kit',
    kitHint: 'Copy, adapt to your tone, and keep the #ad / paid partnership label.',
    kitPosts: (link, discount) => [
      `#ad Paid partnership with BOLIGO · Tired of swiping? BOLIGO does the opposite: no photos at first, a real interview, then people who share your values. ${discount} on your first Journey with my link: ${link}`,
      `#ad I found a dating app that starts with words, not photos. If you want something serious: ${link} (${discount} on the first Journey, adults only)`,
      `#ad Story: “What if we met for what we think first?” → link in bio: ${link}`,
    ],
    offersTitle: 'Your offers in BOLIGO',
    offersHint: 'Views and clicks counted daily, with no data about members. Visits reach you with utm_source=boligo.',
    offerPlacement: (p) => (p === 'PARTENAIRE_DU_MOIS' ? 'Partner of the month (home page)' : 'Partner offers page'),
    offerLive: 'Live',
    offerOff: 'Offline',
    offerImpressions: 'Views',
    offerClicks: 'Clicks',
    offerRate: 'Click rate',
    offerState: (s) =>
      ({ brouillon: 'Draft', programmee: 'Scheduled', en_ligne: 'Live', expiree: 'Expired', retiree: 'Withdrawn' })[s],
    offerConfirmed: 'Confirmed sales',
    offersClicksNote:
      'A click is not a sale: only the sales you confirm to us (monthly statement) appear under “Confirmed sales”.',
    suspendedTitle: 'Partnership suspended',
    suspendedText:
      'Your code and offers are paused: members no longer see them. Your figures remain available. Write to contact@boligo.fr to resume.',
    brandIntro:
      'Follow the views, clicks and confirmed sales of your offers in BOLIGO here, with no data about members.',
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
export function discountLabel(code: NonNullable<PartnerSpaceData['code']>, lang: PartnerLang): string {
  if (code.discountType === 'free') return lang === 'fr' ? 'Parcours offert' : 'Free Journey';
  if (code.discountType === 'fixed') return `-${formatEuro(code.discountValue / 100, lang)}`;
  return lang === 'fr' ? `-${code.discountValue} %` : `-${code.discountValue}%`;
}
