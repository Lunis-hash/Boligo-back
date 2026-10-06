import { DiscountType } from '@prisma/client';
import { checkDiscount, normalizePromoCode } from './promo-rules';

describe('Codes promo : règles de saisie', () => {
  it('accepte 3 à 30 lettres ou chiffres, en majuscules', () => {
    expect(normalizePromoCode(' lancement2026 ')).toBe('LANCEMENT2026');
    expect(normalizePromoCode('ab')).toBeNull();
    expect(normalizePromoCode('ÉTÉ2026')).toBeNull();
    expect(normalizePromoCode('a b c')).toBeNull();
    expect(normalizePromoCode('x'.repeat(31))).toBeNull();
  });

  it('vérifie la valeur selon le type de réduction', () => {
    expect(checkDiscount(DiscountType.percent, 10)).toEqual({ value: 10 });
    expect(checkDiscount(DiscountType.percent, 0)).toHaveProperty('error');
    expect(checkDiscount(DiscountType.percent, 120)).toHaveProperty('error');
    expect(checkDiscount(DiscountType.percent, undefined)).toHaveProperty(
      'error',
    );
    expect(checkDiscount(DiscountType.fixed, 500)).toEqual({ value: 500 });
    expect(checkDiscount(DiscountType.fixed, 0)).toHaveProperty('error');
    expect(checkDiscount(DiscountType.fixed, 2.5)).toHaveProperty('error');
    expect(checkDiscount(DiscountType.free, 40)).toEqual({ value: 0 });
    expect(checkDiscount(DiscountType.free, undefined)).toEqual({ value: 0 });
  });
});
