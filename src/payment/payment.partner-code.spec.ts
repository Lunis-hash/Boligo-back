import { ConfigService } from '@nestjs/config';
import { PaymentService } from './payment.service';

/** Un code de partenaire ne vaut que tant que le partenaire est accepté. */
describe('PaymentService — code d’un partenaire', () => {
  function serviceWith(partnerStatus: string | null) {
    const promo = {
      id: 'code-1',
      code: 'AWA10',
      discountType: 'percent',
      discountValue: 10,
      isActive: true,
      expiresAt: null,
      maxUses: null,
      usedCount: 0,
      usages: [],
      partner: partnerStatus ? { status: partnerStatus } : null,
    };
    const prisma = {
      promoCode: { findUnique: jest.fn().mockResolvedValue(promo) },
    };
    const config = {
      get: jest.fn(() => undefined),
    } as unknown as ConfigService;
    return new PaymentService(
      config,
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
    );
  }

  it.each([
    ['ACCEPTE', true],
    ['SUSPENDU', false],
    ['REFUSE', false],
    ['EN_COURS', false],
  ])('partenaire %s → code valable : %s', async (status, valid) => {
    const res = await serviceWith(status).checkPromoCode(
      'user-1',
      'AWA10',
      'parcours_harmonie',
    );
    expect(res.isValid).toBe(valid);
    if (valid) expect(res.finalAmount).toBe(1350);
  });

  it('un code sans partenaire reste régi par ses seules règles', async () => {
    const res = await serviceWith(null).checkPromoCode(
      'user-1',
      'AWA10',
      'parcours_harmonie',
    );
    expect(res.isValid).toBe(true);
  });
});
