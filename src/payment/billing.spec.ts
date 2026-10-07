import {
  billingConfigIssues,
  countryCodeFromCity,
  invoiceFooterLines,
  sellerIdentity,
  splitInclusive,
  vatRuleFor,
  withdrawalOpen,
} from './billing';

describe('Règles de facturation', () => {
  it('lit le pays d’un lieu « Ville, Pays »', () => {
    expect(countryCodeFromCity('Abidjan, Côte d’Ivoire')).toBe('CI');
    expect(countryCodeFromCity('Fort-de-France, Martinique')).toBe('MQ');
    expect(countryCodeFromCity('Paris')).toBeNull();
    expect(countryCodeFromCity(null)).toBeNull();
  });

  it('TVA française de 20 % en France, à Monaco et dans l’UE sous le seuil', () => {
    for (const c of ['FR', 'MC', 'BE', 'DE']) {
      expect(vatRuleFor(c, { franchise: false }).ratePercent).toBe(20);
    }
    expect(vatRuleFor('BE', { franchise: false }).regime).toBe('UE_SOUS_SEUIL');
    // Pays inconnu : traité comme la France, par prudence.
    expect(vatRuleFor(null, { franchise: false }).regime).toBe('FR');
  });

  it('outre-mer : 8,5 % aux Antilles et à La Réunion, rien en Guyane et à Mayotte', () => {
    expect(vatRuleFor('MQ', { franchise: false }).ratePercent).toBe(8.5);
    expect(vatRuleFor('RE', { franchise: false }).regime).toBe('DOM');
    const gf = vatRuleFor('GF', { franchise: false });
    expect(gf.ratePercent).toBe(0);
    expect(gf.mention).toMatch(/art\. 294/);
  });

  it('hors UE : pas de TVA française, mention de l’article 259 B', () => {
    for (const c of ['SN', 'CI', 'CA', 'GB', 'CH']) {
      const rule = vatRuleFor(c, { franchise: false });
      expect(rule.ratePercent).toBe(0);
      expect(rule.mention).toMatch(/259 B/);
    }
  });

  it('franchise en base : pas de TVA, mention de l’article 293 B', () => {
    const rule = vatRuleFor('FR', { franchise: true });
    expect(rule.ratePercent).toBe(0);
    expect(rule.mention).toMatch(/293 B/);
    // Hors UE, la règle de territorialité prime.
    expect(vatRuleFor('SN', { franchise: true }).mention).toMatch(/259 B/);
  });

  it('découpe un prix TTC en HT et TVA', () => {
    expect(splitInclusive(1500, 20)).toEqual({
      exclTaxCents: 1250,
      taxCents: 250,
    });
    expect(splitInclusive(1500, 8.5)).toEqual({
      exclTaxCents: 1382,
      taxCents: 118,
    });
    expect(splitInclusive(1500, 0)).toEqual({
      exclTaxCents: 1500,
      taxCents: 0,
    });
  });

  it('pied de facture : identité du vendeur et mention de TVA, sans faux numéro', () => {
    const seller = sellerIdentity({
      BILLING_SELLER_NAME: 'BOLIGO',
      BILLING_SELLER_LEGAL_FORM: 'SAS au capital de 1 000 €',
      BILLING_SELLER_ADDRESS: '1 rue de l’Exemple, 75001 Paris',
      BILLING_SELLER_SIREN: '123 456 789',
      BILLING_MEDIATOR: 'Médiateur exemple',
    });
    const lines = invoiceFooterLines(
      seller,
      vatRuleFor('SN', { franchise: false }),
    );
    expect(lines.join('\n')).toMatch(/SIREN 123 456 789/);
    expect(lines.join('\n')).toMatch(/259 B/);
    expect(lines.join('\n')).not.toMatch(/XX/);
  });

  it('signale une identité incomplète, surtout en mode réel', () => {
    const issues = billingConfigIssues({
      STRIPE_SECRET_KEY: 'sk_live_x',
      BILLING_SELLER_NAME: 'BOLIGO',
      BILLING_SELLER_VAT_NUMBER: 'FR XX XXX XXX XXX',
    });
    expect(issues[0]).toMatch(/Mode réel/);
    expect(issues[0]).toMatch(/BILLING_SELLER_VAT_NUMBER/);
    expect(issues.join(' ')).toMatch(/BILLING_ENABLED/);
    expect(issues.join(' ')).toMatch(/BILLING_EARLY_START_CONSENT_REQUIRED/);
  });

  it('rétractation ouverte 14 jours après le paiement', () => {
    const paid = new Date('2026-10-01T10:00:00Z');
    expect(withdrawalOpen(paid, new Date('2026-10-15T09:00:00Z'))).toBe(true);
    expect(withdrawalOpen(paid, new Date('2026-10-15T11:00:00Z'))).toBe(false);
  });
});
