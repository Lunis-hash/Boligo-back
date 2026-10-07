import { BadRequestException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { AdminService } from './admin.service';

type Promo = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  isActive: boolean;
  _count: { usages: number; transactions: number };
  partner: { id: string } | null;
};

function setup(promos: Promo[]) {
  const prisma = {
    promoCode: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; code?: string } }) =>
          Promise.resolve(
            promos.find((p) =>
              where.id ? p.id === where.id : p.code === where.code,
            ) ?? null,
          ),
      ),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'nouveau', ...data }),
      ),
      update: jest.fn(
        ({ where, data }: { where: { id: string }; data: Partial<Promo> }) => {
          const p = promos.find((x) => x.id === where.id)!;
          Object.assign(p, data);
          return Promise.resolve(p);
        },
      ),
      delete: jest.fn(() => Promise.resolve({})),
      findMany: jest.fn(() => Promise.resolve(promos)),
      count: jest.fn(() => Promise.resolve(promos.length)),
    },
    creditTransaction: {
      groupBy: jest.fn(() =>
        Promise.resolve([
          {
            promoCodeId: 'p-used',
            _count: { _all: 2 },
            _sum: { euroAmount: 27 },
          },
        ]),
      ),
    },
  };
  const service = new AdminService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, prisma, promos };
}

const promo = (over: Partial<Promo>): Promo => ({
  id: 'p',
  code: 'CODE',
  discountType: DiscountType.percent,
  discountValue: 10,
  isActive: true,
  _count: { usages: 0, transactions: 0 },
  partner: null,
  ...over,
});

describe('Page Codes promo', () => {
  it('crée un code en majuscules et refuse une réduction incohérente', async () => {
    const { service, prisma } = setup([promo({ code: 'EXISTE' })]);
    const createdData = (n: number) =>
      (
        prisma.promoCode.create.mock.calls[n] as unknown as [
          { data: Record<string, unknown> },
        ]
      )[0].data;
    await service.createPromoCode({
      code: ' lancement ',
      discountType: DiscountType.percent,
      discountValue: 20,
      description: '  Lancement  ',
    });
    expect(createdData(0)).toMatchObject({
      code: 'LANCEMENT',
      discountValue: 20,
      description: 'Lancement',
      isActive: true,
      maxUses: null,
      expiresAt: null,
    });
    await expect(
      service.createPromoCode({
        code: 'existe',
        discountType: DiscountType.percent,
        discountValue: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createPromoCode({
        code: 'TROPFORT',
        discountType: DiscountType.percent,
        discountValue: 150,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.createPromoCode({
      code: 'OFFERT',
      discountType: DiscountType.free,
      discountValue: 99,
    });
    expect(createdData(1)).toMatchObject({ code: 'OFFERT', discountValue: 0 });
  });

  it('modifie la réduction en gardant une valeur cohérente', async () => {
    const { service, promos } = setup([promo({ id: 'p1' })]);
    await service.updatePromoCode('p1', { discountValue: 25 });
    expect(promos[0].discountValue).toBe(25);
    await expect(
      service.updatePromoCode('p1', { discountType: DiscountType.fixed }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updatePromoCode('p1', {
      discountType: DiscountType.fixed,
      discountValue: 300,
    });
    expect(promos[0]).toMatchObject({
      discountType: 'fixed',
      discountValue: 300,
    });
  });

  it('supprime un code jamais utilisé, met en pause un code utilisé, protège un code partenaire', async () => {
    const { service, prisma, promos } = setup([
      promo({ id: 'p-new' }),
      promo({ id: 'p-used', _count: { usages: 1, transactions: 1 } }),
      promo({ id: 'p-partner', partner: { id: 'x' } }),
    ]);
    await expect(service.deletePromoCode('p-new')).resolves.toEqual({
      deleted: true,
      paused: false,
    });
    await expect(service.deletePromoCode('p-used')).resolves.toEqual({
      deleted: false,
      paused: true,
    });
    expect(promos[1].isActive).toBe(false);
    await expect(service.deletePromoCode('p-partner')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.promoCode.delete).toHaveBeenCalledTimes(1);
  });

  it('liste les codes avec leurs ventes', async () => {
    const { service } = setup([
      promo({ id: 'p-used' }),
      promo({ id: 'p-new' }),
    ]);
    const res = await service.listPromoCodes({ q: 'code' });
    expect(res.data[0].sales).toEqual({ purchases: 2, revenue: 27 });
    expect(res.data[1].sales).toEqual({ purchases: 0, revenue: 0 });
  });
});
