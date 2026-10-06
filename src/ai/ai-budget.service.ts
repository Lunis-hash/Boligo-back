import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  costMicroEur,
  journeyBudgetMicroEur,
  journeyMonthlyCapMicroEur,
  monthKey,
  monthlyBudgetMicroEur,
} from './ai-budget';

const CACHE_MS = 15_000;

/** Compteur de dépense IA du mois, enregistré en base (survit aux redémarrages). */
@Injectable()
export class AiBudgetService {
  private readonly logger = new Logger('Budget IA');
  private cache: { month: string; spent: number; at: number } | null = null;
  private warned = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

  private async spentMicro(month: string): Promise<number> {
    if (
      this.cache &&
      this.cache.month === month &&
      Date.now() - this.cache.at < CACHE_MS
    ) {
      return this.cache.spent;
    }
    const row = await this.prisma.aiSpend.findUnique({ where: { month } });
    const spent = row?.costMicroEur ?? 0;
    this.cache = { month, spent, at: Date.now() };
    return spent;
  }

  /**
   * L'appel prévu tient-il dans le budget du mois ? En cas de doute (base
   * injoignable), la réponse est non : l'IA n'est jamais indispensable.
   */
  async allow(estimateMicro: number): Promise<boolean> {
    const budget = monthlyBudgetMicroEur();
    if (budget <= 0) return false;
    try {
      const spent = await this.spentMicro(monthKey());
      const ok = spent + estimateMicro <= budget;
      if (!ok)
        this.warnOnce(
          `${monthKey()}:plein`,
          'budget du mois atteint : IA suspendue jusqu’au mois prochain.',
        );
      return ok;
    } catch (err) {
      this.logger.warn(
        `Compteur illisible, IA suspendue : ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Enregistre la consommation réelle d'un appel. `actualMicro` : coût réel
   * facturé par le fournisseur, quand il le donne (OpenRouter).
   */
  async record(
    model: string,
    inputTokens: number,
    outputTokens: number,
    actualMicro?: number,
  ) {
    const month = monthKey();
    const cost = actualMicro ?? costMicroEur(model, inputTokens, outputTokens);
    try {
      const row = await this.prisma.aiSpend.upsert({
        where: { month },
        create: {
          month,
          calls: 1,
          inputTokens,
          outputTokens,
          costMicroEur: cost,
        },
        update: {
          calls: { increment: 1 },
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
          costMicroEur: { increment: cost },
        },
      });
      this.cache = { month, spent: row.costMicroEur, at: Date.now() };
      const budget = monthlyBudgetMicroEur();
      if (budget > 0 && row.costMicroEur >= budget * 0.8) {
        this.warnOnce(
          `${month}:80`,
          `80 % du budget du mois consommé (${(row.costMicroEur / 1e6).toFixed(2)} €).`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Consommation non enregistrée : ${(err as Error).message}`,
      );
    }
  }

  /**
   * Le parcours a-t-il droit au suivi IA payé ? Il faut un budget par parcours
   * non nul et au moins un crédit dépensé pour ce parcours.
   */
  async journeyEligible(journeyId: string): Promise<boolean> {
    if (journeyBudgetMicroEur() <= 0) return false;
    try {
      const paid = await this.prisma.creditTransaction.count({
        where: { journeyId, type: 'consommation' },
      });
      return paid > 0;
    } catch (err) {
      this.logger.warn(
        `Parcours ${journeyId} : paiement illisible, suivi IA payé suspendu : ${(err as Error).message}`,
      );
      return false;
    }
  }

  /**
   * L'appel prévu tient-il dans le budget restant du parcours, et dans le
   * plafond mensuel de tous les parcours payés ?
   */
  async allowJourney(journeyId: string, estimateMicro: number) {
    const budget = journeyBudgetMicroEur();
    const monthlyCap = journeyMonthlyCapMicroEur();
    if (budget <= 0) return false;
    try {
      const [journey, month] = await Promise.all([
        this.prisma.journey.findUnique({
          where: { id: journeyId },
          select: { aiCostMicroEur: true },
        }),
        this.prisma.aiSpend.findUnique({
          where: { month: monthKey() },
          select: { journeyCostMicroEur: true },
        }),
      ]);
      if (!journey) return false;
      const ok = journey.aiCostMicroEur + estimateMicro <= budget;
      if (!ok)
        this.logger.warn(
          `Parcours ${journeyId} : budget IA du parcours atteint, suite sans IA.`,
        );
      const monthSpent = Number(month?.journeyCostMicroEur ?? 0);
      const monthOk =
        monthlyCap === null || monthSpent + estimateMicro <= monthlyCap;
      if (!monthOk)
        this.warnOnce(
          `${monthKey()}:parcours-plein`,
          'plafond mensuel du suivi des parcours atteint : suite sans IA jusqu’au mois prochain.',
        );
      return ok && monthOk;
    } catch (err) {
      this.logger.warn(
        `Parcours ${journeyId} : compteur illisible, IA suspendue : ${(err as Error).message}`,
      );
      return false;
    }
  }

  /** Enregistre un appel du suivi d'un parcours (hors plafond mensuel). */
  async recordJourney(
    journeyId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    actualMicro?: number,
  ) {
    const month = monthKey();
    const cost = actualMicro ?? costMicroEur(model, inputTokens, outputTokens);
    try {
      await this.prisma.journey.update({
        where: { id: journeyId },
        data: { aiCostMicroEur: { increment: cost } },
      });
      await this.prisma.aiSpend.upsert({
        where: { month },
        create: {
          month,
          inputTokens,
          outputTokens,
          journeyCalls: 1,
          journeyCostMicroEur: BigInt(cost),
        },
        update: {
          inputTokens: { increment: inputTokens },
          outputTokens: { increment: outputTokens },
          journeyCalls: { increment: 1 },
          journeyCostMicroEur: { increment: BigInt(cost) },
        },
      });
    } catch (err) {
      this.logger.warn(
        `Consommation du parcours ${journeyId} non enregistrée : ${(err as Error).message}`,
      );
    }
  }

  /** Synthèse pour le tableau de bord. */
  async summary() {
    const month = monthKey();
    const row = await this.prisma.aiSpend.findUnique({ where: { month } });
    const journeyCalls = row?.journeyCalls ?? 0;
    const journeySpentEur = Number(row?.journeyCostMicroEur ?? 0) / 1_000_000;
    return {
      month,
      calls: row?.calls ?? 0,
      inputTokens: row?.inputTokens ?? 0,
      outputTokens: row?.outputTokens ?? 0,
      spentEur: (row?.costMicroEur ?? 0) / 1_000_000,
      budgetEur: monthlyBudgetMicroEur() / 1_000_000,
      journeyCalls,
      journeySpentEur,
      journeyBudgetEur: journeyBudgetMicroEur() / 1_000_000,
      journeyMonthlyCapEur: (journeyMonthlyCapMicroEur() ?? 0) / 1_000_000,
    };
  }

  private warnOnce(key: string, message: string) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.logger.warn(message);
  }
}
