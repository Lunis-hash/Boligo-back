/**
 * Règles de facturation de BOLIGO, sans appel externe : pays du client, TVA
 * applicable quand Stripe Tax n'est pas activé, mentions légales de la
 * facture, réglages et contrôle de la configuration. Le détail des choix
 * (et ce qui reste à valider par l'expert-comptable) : docs/FACTURATION_TVA.md.
 */

/** Pays proposés dans l'application (noms français), et Mayotte. */
const COUNTRY_CODES: Record<string, string> = {
  france: 'FR',
  belgique: 'BE',
  suisse: 'CH',
  luxembourg: 'LU',
  monaco: 'MC',
  'royaume-uni': 'GB',
  allemagne: 'DE',
  espagne: 'ES',
  italie: 'IT',
  portugal: 'PT',
  'pays-bas': 'NL',
  suede: 'SE',
  norvege: 'NO',
  danemark: 'DK',
  irlande: 'IE',
  autriche: 'AT',
  pologne: 'PL',
  roumanie: 'RO',
  grece: 'GR',
  "cote d'ivoire": 'CI',
  senegal: 'SN',
  cameroun: 'CM',
  maroc: 'MA',
  algerie: 'DZ',
  tunisie: 'TN',
  mali: 'ML',
  guinee: 'GN',
  togo: 'TG',
  benin: 'BJ',
  'burkina faso': 'BF',
  niger: 'NE',
  'congo rdc': 'CD',
  congo: 'CG',
  gabon: 'GA',
  madagascar: 'MG',
  rwanda: 'RW',
  maurice: 'MU',
  canada: 'CA',
  'etats-unis': 'US',
  haiti: 'HT',
  martinique: 'MQ',
  guadeloupe: 'GP',
  'la reunion': 'RE',
  guyane: 'GF',
  mayotte: 'YT',
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’]/g, "'")
    .toLowerCase()
    .trim();

/** Code pays (ISO à deux lettres) d'un lieu « Ville, Pays » ; null s'il est inconnu. */
export function countryCodeFromCity(
  city: string | null | undefined,
): string | null {
  const parts = (city ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return COUNTRY_CODES[norm(parts[parts.length - 1])] ?? null;
}

/** Code pays à deux lettres, en majuscules ; null s'il est mal formé. */
export function normalizeCountry(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** États membres de l'Union européenne, hors France. */
const EU_OTHER = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]);

export type TaxRegime =
  | 'FR'
  | 'DOM'
  | 'DOM_EXONERE'
  | 'UE_SOUS_SEUIL'
  | 'HORS_UE'
  | 'FRANCHISE'
  | 'STRIPE_TAX';

export interface VatRule {
  ratePercent: number;
  regime: TaxRegime;
  /** Mention à porter sur la facture quand la TVA n'est pas facturée. */
  mention?: string;
}

/**
 * TVA française d'une vente à un particulier (service fourni par voie
 * électronique, prix TTC), quand Stripe Tax ne la calcule pas :
 * - France et Monaco : 20 % ;
 * - Guadeloupe, Martinique, La Réunion : 8,5 % ;
 * - Guyane et Mayotte : TVA non applicable (art. 294 du CGI) ;
 * - autre pays de l'UE : TVA française tant que les ventes à distance dans
 *   l'UE restent sous 10 000 € HT par an (art. 259 D du CGI) ; au-delà, il
 *   faut Stripe Tax et le guichet OSS ;
 * - hors de l'UE : pas de TVA française (art. 259 B du CGI) ; une taxe locale
 *   peut être due, que seul Stripe Tax calcule, une fois l'enregistrement fait ;
 * - franchise en base : pas de TVA (art. 293 B du CGI).
 * Pays inconnu : traité comme la France, par prudence.
 */
export function vatRuleFor(
  country: string | null,
  opts: { franchise: boolean },
): VatRule {
  const code = country ?? 'FR';
  if (code === 'GF' || code === 'YT')
    return {
      ratePercent: 0,
      regime: 'DOM_EXONERE',
      mention: 'TVA non applicable, art. 294 du CGI',
    };
  const french =
    code === 'FR' ||
    code === 'MC' ||
    code === 'GP' ||
    code === 'MQ' ||
    code === 'RE' ||
    EU_OTHER.has(code);
  if (!french)
    return {
      ratePercent: 0,
      regime: 'HORS_UE',
      mention: 'TVA non applicable, art. 259 B du CGI',
    };
  if (opts.franchise)
    return {
      ratePercent: 0,
      regime: 'FRANCHISE',
      mention: 'TVA non applicable, art. 293 B du CGI',
    };
  if (code === 'GP' || code === 'MQ' || code === 'RE')
    return { ratePercent: 8.5, regime: 'DOM' };
  if (EU_OTHER.has(code)) return { ratePercent: 20, regime: 'UE_SOUS_SEUIL' };
  return { ratePercent: 20, regime: 'FR' };
}

/** Prix TTC découpé en HT et TVA, en centimes. */
export function splitInclusive(
  totalCents: number,
  ratePercent: number,
): { exclTaxCents: number; taxCents: number } {
  const exclTaxCents = Math.round(totalCents / (1 + ratePercent / 100));
  return { exclTaxCents, taxCents: totalCents - exclTaxCents };
}

/** « 15,00 € » */
export function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

export interface BillingFlags {
  /** Paiements, factures et avoirs enregistrés en base ; rétractation en ligne. */
  enabled: boolean;
  /** TVA calculée par Stripe Tax sur la facture (enregistrements faits chez Stripe). */
  stripeTax: boolean;
  /** Adresse de facturation demandée sur la feuille de paiement. */
  addressRequired: boolean;
  /** Paiement refusé sans la demande de commencement avant la fin du délai. */
  consentRequired: boolean;
  /** Franchise en base de TVA. */
  franchise: boolean;
}

const on = (v: string | undefined) =>
  ['1', 'true', 'oui', 'yes'].includes((v ?? '').trim().toLowerCase());

export function billingFlags(
  env: Record<string, string | undefined> = process.env,
): BillingFlags {
  return {
    enabled: on(env.BILLING_ENABLED),
    stripeTax: on(env.BILLING_STRIPE_TAX),
    addressRequired: on(env.BILLING_ADDRESS_REQUIRED),
    consentRequired: on(env.BILLING_EARLY_START_CONSENT_REQUIRED),
    franchise: on(env.BILLING_VAT_FRANCHISE),
  };
}

export interface SellerIdentity {
  name: string;
  legalForm: string;
  address: string;
  siren: string;
  vatNumber: string;
  mediator: string;
}

export function sellerIdentity(
  env: Record<string, string | undefined> = process.env,
): SellerIdentity {
  const v = (k: string) => (env[k] ?? '').trim();
  return {
    name: v('BILLING_SELLER_NAME') || 'BOLIGO',
    legalForm: v('BILLING_SELLER_LEGAL_FORM'),
    address: v('BILLING_SELLER_ADDRESS'),
    siren: v('BILLING_SELLER_SIREN'),
    vatNumber: v('BILLING_SELLER_VAT_NUMBER'),
    mediator: v('BILLING_MEDIATOR'),
  };
}

/** Mentions légales du pied de facture et du reçu (une par ligne). */
export function invoiceFooterLines(
  seller: SellerIdentity,
  rule?: VatRule,
): string[] {
  const lines = [
    [seller.name, seller.legalForm].filter(Boolean).join(', '),
    seller.address,
    [
      seller.siren && `SIREN ${seller.siren}`,
      seller.vatNumber && `TVA intracommunautaire ${seller.vatNumber}`,
    ]
      .filter(Boolean)
      .join(' · '),
    rule?.mention ?? '',
    'Prestation de service fournie par voie électronique. Prix TTC.',
    seller.mediator && `Médiateur de la consommation : ${seller.mediator}`,
  ];
  return lines.filter((l): l is string => !!l);
}

const PLACEHOLDER = /X{2,}|À COMPL|A COMPL|TODO/i;

/**
 * Configuration incomplète, signalée au démarrage (jamais de valeur secrète
 * dans les messages). En mode réel, une facture sans identité du vendeur
 * n'est pas conforme.
 */
export function billingConfigIssues(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const issues: string[] = [];
  const live = (env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_');
  const flags = billingFlags(env);
  const seller = sellerIdentity(env);
  const required: Array<[string, string]> = [
    ['BILLING_SELLER_NAME', env.BILLING_SELLER_NAME ?? ''],
    ['BILLING_SELLER_LEGAL_FORM', seller.legalForm],
    ['BILLING_SELLER_ADDRESS', seller.address],
    ['BILLING_SELLER_SIREN', seller.siren],
    ['BILLING_MEDIATOR', seller.mediator],
  ];
  if (!flags.franchise)
    required.push(['BILLING_SELLER_VAT_NUMBER', seller.vatNumber]);
  const missing = required
    .filter(([, value]) => !value.trim() || PLACEHOLDER.test(value))
    .map(([key]) => key);
  if (missing.length)
    issues.push(
      `${live ? 'Mode réel : factures non conformes' : 'Factures incomplètes'}, à renseigner : ${missing.join(', ')}.`,
    );
  if (flags.franchise && seller.vatNumber)
    issues.push(
      'BILLING_VAT_FRANCHISE actif avec un numéro de TVA : vérifier le statut avec l’expert-comptable.',
    );
  if (flags.stripeTax && !flags.enabled)
    issues.push(
      'BILLING_STRIPE_TAX sans BILLING_ENABLED : la TVA calculée par Stripe ne sera pas enregistrée en base.',
    );
  if (live && !flags.enabled)
    issues.push(
      'Mode réel sans BILLING_ENABLED : ni registre des factures, ni avoirs, ni rétractation en ligne.',
    );
  if (live && !flags.consentRequired)
    issues.push(
      'Mode réel sans BILLING_EARLY_START_CONSENT_REQUIRED : un paiement peut partir sans la demande de commencement anticipé.',
    );
  return issues;
}

/** Délai de rétractation : 14 jours à compter du paiement (art. L221-18). */
export const WITHDRAWAL_DAYS = 14;

export function withdrawalDeadline(paidAt: Date): Date {
  return new Date(paidAt.getTime() + WITHDRAWAL_DAYS * 24 * 3600 * 1000);
}

export function withdrawalOpen(paidAt: Date, now = new Date()): boolean {
  return now.getTime() <= withdrawalDeadline(paidAt).getTime();
}

/**
 * Demande de commencement avant la fin du délai de rétractation (art.
 * L221-25 et L221-28 du Code de la consommation). Texte à faire valider par
 * un avocat ; l'application affiche le même, et le serveur garde la version.
 */
export const EARLY_START_CONSENT_VERSION = '2026-10-07';
export const EARLY_START_CONSENT_TEXT =
  'Je demande que mon Parcours Harmonie puisse commencer avant la fin du délai de rétractation de 14 jours. Si je me rétracte après son début, je devrai un montant proportionnel au service déjà fourni ; une fois le parcours entièrement terminé, je ne pourrai plus me rétracter.';
