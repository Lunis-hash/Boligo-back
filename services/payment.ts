import client from './api';

/**
 * Paiement & crédits (backend : PaymentController + CreditController).
 * Le backend n'expose qu'un seul plan (`parcours_harmonie`, 15 €, 1 crédit) ;
 * la liste est toujours lue depuis l'API pour rester alignée.
 */
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
}

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

export async function createPaymentIntent(optionId: string, promoCode?: string): Promise<PaymentSheetParams> {
  const res = await client.post<PaymentSheetParams>('/payment/create-payment-intent', {
    optionId,
    ...(promoCode ? { promoCode } : {}),
  });
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

export const PaymentService = {
  getPlans,
  createPaymentIntent,
  initStripePayment: createPaymentIntent,
  checkPromoCode,
  applyPromoCode,
  getCreditBalance,
  spendCredits,
};

export default PaymentService;
