import { paymentIntentIdFromClientSecret } from '@/services/payment';

describe('paymentIntentIdFromClientSecret', () => {
  it('extrait la référence du paiement depuis le secret client Stripe', () => {
    expect(paymentIntentIdFromClientSecret('pi_3QabcDEF_secret_xyz789')).toBe('pi_3QabcDEF');
  });

  it('laisse une référence déjà nue inchangée', () => {
    expect(paymentIntentIdFromClientSecret('pi_3QabcDEF')).toBe('pi_3QabcDEF');
  });
});
