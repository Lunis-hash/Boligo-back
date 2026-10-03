import { BadRequestException } from '@nestjs/common';
import { CreditService } from './credit.service';
import { PrismaService } from '../prisma/prisma.service';

function mockPrisma(balance = 3) {
  const tx = {
    user: {
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    creditTransaction: {
      create: jest.fn().mockResolvedValue({ id: 'tx-new' }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({ creditBalance: balance }),
    },
    $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  return { prisma, tx };
}

describe('CreditService', () => {
  it.each([-5, 0, 0.5, 11, Number.NaN])(
    'refuse de « dépenser » %p crédit(s)',
    async (amount) => {
      const { prisma, tx } = mockPrisma();
      const service = new CreditService(prisma as unknown as PrismaService);
      await expect(service.spendCredits('u1', amount, 'test')).rejects.toThrow(
        BadRequestException,
      );
      expect(tx.user.updateMany).not.toHaveBeenCalled();
    },
  );

  it('ne débite que si le solde suffit encore au moment du débit', async () => {
    const { prisma, tx } = mockPrisma(1);
    tx.user.updateMany.mockResolvedValue({ count: 0 }); // débit concurrent passé avant
    const service = new CreditService(prisma as unknown as PrismaService);
    await expect(service.spendCredits('u1', 1, 'Connexion')).rejects.toThrow(
      'Solde insuffisant.',
    );
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', creditBalance: { gte: 1 } },
      data: { creditBalance: { decrement: 1 } },
    });
    expect(tx.creditTransaction.create).not.toHaveBeenCalled();
  });

  it('crédite une seule fois un même paiement', async () => {
    const { prisma, tx } = mockPrisma();
    const service = new CreditService(prisma as unknown as PrismaService);
    const first = await service.addCredits(
      'u1',
      1,
      'Parcours Harmonie',
      15,
      'pi_1',
    );
    expect(first.alreadyCredited).toBe(false);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledTimes(1);

    tx.creditTransaction.findFirst.mockResolvedValue({ id: 'tx-new' });
    const second = await service.addCredits(
      'u1',
      1,
      'Parcours Harmonie',
      15,
      'pi_1',
    );
    expect(second.alreadyCredited).toBe(true);
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });
});
