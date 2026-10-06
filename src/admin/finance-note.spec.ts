import { financeNote } from './admin.service';

describe('financeNote', () => {
  it('signale le mode test : aucune carte débitée', () => {
    expect(financeNote('sk_test_abc')).toContain('mode test');
  });

  it('signale le mode réel', () => {
    expect(financeNote('sk_live_abc')).toContain('mode réel');
  });

  it('signale l’absence de Stripe', () => {
    expect(financeNote(undefined)).toContain("n'est pas configuré");
  });

  it('ne parle plus d’un prestataire non utilisé', () => {
    expect(financeNote('sk_test_abc')).not.toMatch(/CinetPay/);
  });
});
