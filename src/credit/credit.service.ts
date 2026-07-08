import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true },
    });

    if (!user) {
      throw new BadRequestException('Utilisateur non trouvé');
    }

    if (user.creditBalance < amount) {
      throw new BadRequestException(
        `Solde insuffisant. Nécessite ${amount} crédits, disponible: ${user.creditBalance}`
      );
    }

    // Transaction atomique : décrémenter + enregistrer
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Décrémenter le solde
      await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { decrement: amount } },
      });

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

  // Ajouter des crédits (simulation d'achat ou paiement réel)
  async addCredits(userId: string, amount: number, description: string, euroAmount?: number, paymentRef?: string) {
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
    };
  }

  // Remboursement Règle de Justice en cas de ghosting
  async refundJustice(userId: string, journeyId: string, amount: number, description: string) {
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
