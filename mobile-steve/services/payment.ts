import client from './api';

/**
 * Paiement & crédits (backend : PaymentController + CreditController).
 * Le backend n'expose qu'un seul plan (`parcours_harmonie`, 15 €, 1 crédit) ;
 * la liste est toujours lue depuis l'API pour rester alignée.
 */
/**
 * Formule unique BOLIGO : « Parcours Harmonie », 15 €, 1 crédit = 1 parcours.
 * Le montant et le crédit sont fixés et validés par le serveur ; l'app n'affiche
 * aucune autre offre, même si le backend en exposait d'autres.
 */
export const HARMONIE_PLAN_ID = 'parcours_harmonie';

export function selectHarmoniePlan<T extends { id: string }>(plans: T[]): T[] {
  return plans.filter((plan) => plan.id === HARMONIE_PLAN_ID);
}

export interface PaymentPlanFeature {
  icon: string;
  label: string;
  detail: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  priceDisplay: string;
  credits: number;
  description: string;
  features: PaymentPlanFeature[];
  guarantee?: string;
  badge?: string;
  promoCodes?: { hint?: string; exampleCodes?: string[] };
  /** « TVA comprise · paiement unique · sans abonnement » */
  priceNote?: string;
  /** Demande de commencement avant la fin du délai de rétractation. */
  earlyStartConsent?: { version: string; text: string; required: boolean };
  billingAddressRequired?: boolean;
}

/**
 * Texte affiché si le serveur ne le fournit pas (ancienne API) : le même que
 * celui que le serveur enregistre avec le paiement.
 */
export const EARLY_START_CONSENT_FALLBACK = {
  version: '2026-10-07',
  text: 'Je demande que mon Parcours Harmonie puisse commencer avant la fin du délai de rétractation de 14 jours. Si je me rétracte après son début, je devrai un montant proportionnel au service déjà fourni ; une fois le parcours entièrement terminé, je ne pourrai plus me rétracter.',
};

export interface PaymentSheetParams {
  paymentIntent: string;
  ephemeralKey: string;
  customer: string;
  publishableKey?: string;
  finalAmount: number;
  originalAmount: number;
  discount: number;
  /** Présent uniquement quand Stripe n'est pas configuré côté serveur. */
  isMock?: boolean;
  /** Adresse de facturation complète demandée sur la feuille de paiement. */
  billingAddressRequired?: boolean;
  /** Nom du membre, proposé sur la feuille de paiement. */
  billingName?: string;
}

export interface PromoCheckResult {
  isValid: boolean;
  isFree: boolean;
  originalAmount: number;
  finalAmount: number;
  discountEur: number;
  message?: string;
}

export interface PromoApplyResult {
  success: boolean;
  isFree: boolean;
  newAmount: number;
  newAmountDisplay: string;
  message?: string;
  discountEur?: number;
}

export async function getPlans(): Promise<PaymentPlan[]> {
  const res = await client.get<{ plans: PaymentPlan[] }>('/payment/plans');
  return res.data?.plans ?? [];
}

export async function createPaymentIntent(
  optionId: string,
  promoCode?: string,
  consent?: { earlyStartConsent: boolean; consentVersion: string },
): Promise<PaymentSheetParams> {
  const res = await client.post<PaymentSheetParams>('/payment/create-payment-intent', {
    optionId,
    ...(promoCode ? { promoCode } : {}),
    ...(consent ?? {}),
  });
  return res.data;
}

/** « pi_123_secret_abc » → « pi_123 » (le client ne reçoit que le secret client). */
export function paymentIntentIdFromClientSecret(clientSecret: string): string {
  return clientSecret.split('_secret_')[0];
}

export interface PaymentConfirmation {
  credited: boolean;
  alreadyCredited?: boolean;
  status: string;
  credits?: number;
}

/**
 * Après la feuille de paiement : le serveur relit le paiement chez Stripe et
 * crédite le compte (une seule fois, même si le webhook arrive aussi).
 */
export async function confirmPayment(paymentIntentId: string): Promise<PaymentConfirmation> {
  const res = await client.post<PaymentConfirmation>('/payment/confirm', { paymentIntentId });
  return res.data;
}

export async function checkPromoCode(code: string, optionId: string): Promise<PromoCheckResult> {
  const res = await client.post<PromoCheckResult>('/payment/check-promo', { code, optionId });
  return res.data;
}

/** Applique un code promo ; si l'offre est gratuite, le backend crédite directement le compte. */
export async function applyPromoCode(code: string, optionId: string): Promise<PromoApplyResult> {
  const res = await client.post<PromoApplyResult>('/payment/apply-promo', { code, optionId });
  return res.data;
}

export async function getCreditBalance(): Promise<number> {
  const res = await client.get<{ credits: number }>('/credit/balance');
  return typeof res.data?.credits === 'number' ? res.data.credits : 0;
}

export async function spendCredits(amount: number, description: string): Promise<number> {
  const res = await client.post<{ success: boolean; newBalance: number }>('/credit/spend', { amount, description });
  return res.data?.newBalance ?? 0;
}

/** Paiement sur le web : adresse de la page de paiement Stripe (Checkout). */
export async function createCheckoutSession(
  optionId: string,
  promoCode?: string,
  consent?: { earlyStartConsent: boolean; consentVersion: string },
): Promise<{ url: string; sessionId: string }> {
  const res = await client.post<{ url: string; sessionId: string }>('/payment/checkout-session', {
    optionId,
    ...(promoCode ? { promoCode } : {}),
    ...(consent ?? {}),
  });
  return res.data;
}

/** Retour de la page Stripe : le serveur relit la session et crédite une fois. */
export async function confirmCheckout(sessionId: string): Promise<PaymentConfirmation> {
  const res = await client.post<PaymentConfirmation>('/payment/confirm-checkout', { sessionId });
  return res.data;
}

export interface Purchase {
  paymentRef: string;
  paidAt: string;
  amountCents: number;
  description: string;
  invoiceNumber?: string;
  refundedCents: number;
  withdrawal?: { status: 'recue' | 'remboursee' | 'refusee'; requestedAt: string; refundCents?: number };
  withdrawalDeadline: string;
  canWithdraw: boolean;
}

/** Achats payés par carte, avec facture et rétractation. */
export async function getPurchases(): Promise<Purchase[]> {
  const res = await client.get<Purchase[]>('/payment/purchases');
  return Array.isArray(res.data) ? res.data : [];
}

/** Lien du PDF de la facture (relu chez Stripe à chaque demande). */
export async function getInvoiceUrl(paymentRef: string): Promise<string> {
  const res = await client.get<{ url: string }>(`/payment/invoices/${encodeURIComponent(paymentRef)}`);
  return res.data.url;
}

/** « Se rétracter du contrat ici » : un accusé de réception part par e-mail. */
export async function requestWithdrawal(paymentRef: string): Promise<{ status: string; requestedAt: string }> {
  const res = await client.post<{ status: string; requestedAt: string }>('/payment/withdrawals', { paymentRef });
  return res.data;
}

export const PaymentService = {
  getPlans,
  createPaymentIntent,
  initStripePayment: createPaymentIntent,
  confirmPayment,
  checkPromoCode,
  applyPromoCode,
  getCreditBalance,
  spendCredits,
  getPurchases,
  getInvoiceUrl,
  createCheckoutSession,
  confirmCheckout,
  requestWithdrawal,
};

export default PaymentService;
