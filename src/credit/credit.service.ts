import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Débit maximal en une fois (une connexion coûte 1 crédit). */
const MAX_SPEND = 10;

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  // Récupérer le solde de crédits
  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    return { credits: user?.creditBalance || 0 };
  }

  // Dépenser des crédits (connexion avec un profil)
  async spendCredits(userId: string, amount: number, description: string) {
    // Un montant négatif ou fractionnaire reviendrait à s'ajouter des crédits.
    if (!Number.isInteger(amount) || amount < 1 || amount > MAX_SPEND) {
      throw new BadRequestException('Montant de crédits invalide.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (user.creditBalance < amount) {
      throw new BadRequestException(
        `Solde insuffisant. Nécessite ${amount} crédits, disponible: ${user.creditBalance}`,
      );
    }

    // Transaction atomique : décrémenter + enregistrer
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Décrémenter le solde, seulement s'il suffit encore (deux débits
      //    simultanés ne peuvent pas rendre le solde négatif).
      const debited = await tx.user.updateMany({
        where: { id: userId, creditBalance: { gte: amount } },
        data: { creditBalance: { decrement: amount } },
      });
      if (debited.count !== 1) {
        throw new BadRequestException('Solde insuffisant.');
      }

      // 2. Créer la transaction
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          type: 'consommation',
          creditAmount: -amount,
          description,
        },
      });

      return transaction;
    });

    const newBalance = await this.getBalance(userId);
    return {
      success: true,
      newBalance: newBalance.credits,
      transaction: result,
    };
  }

  // Ajouter des crédits (paiement Stripe confirmé ou code promo gratuit).
  // Avec une référence de paiement, un même paiement n'est crédité qu'une fois,
  // même si le webhook Stripe et la confirmation de l'app arrivent ensemble.
  async addCredits(
    userId: string,
    amount: number,
    description: string,
    euroAmount?: number,
    paymentRef?: string,
  ) {
    let alreadyCredited = false;
    const result = await this.prisma.$transaction(async (tx) => {
      if (paymentRef) {
        await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${paymentRef}))) AS lock`;
        const existing = await tx.creditTransaction.findFirst({
          where: { paymentRef, type: 'achat' },
        });
        if (existing) {
          alreadyCredited = true;
          return existing;
        }
      }

      // 1. Incrémenter le solde
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      });

      // 2. Créer la transaction
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          type: 'achat',
          creditAmount: amount,
          description,
          euroAmount,
          paymentRef,
        },
      });

      return transaction;
    });

    const newBalance = await this.getBalance(userId);
    return {
      success: true,
      newBalance: newBalance.credits,
      transaction: result,
      alreadyCredited,
    };
  }

  // Remboursement Règle de Justice en cas de ghosting
  async refundJustice(
    userId: string,
    journeyId: string,
    amount: number,
    description: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Incrémenter le solde
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: amount } },
      });

      // 2. Créer la transaction
      const transaction = await tx.creditTransaction.create({
        data: {
          userId,
          journeyId,
          type: 'remboursement_justice',
          creditAmount: amount,
          description,
        },
      });

      return transaction;
    });

    const newBalance = await this.getBalance(userId);
    return {
      success: true,
      newBalance: newBalance.credits,
      transaction: result,
    };
  }

  // Historique des transactions
  async getHistory(userId: string) {
    const transactions = await this.prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 20,
    });

    return transactions;
  }
}
