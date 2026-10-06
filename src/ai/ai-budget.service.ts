import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { costMicroEur, monthKey, monthlyBudgetMicroEur } from './ai-budget';

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

  /** Enregistre la consommation réelle d'un appel. */
  async record(model: string, inputTokens: number, outputTokens: number) {
    const month = monthKey();
    const cost = costMicroEur(model, inputTokens, outputTokens);
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

  /** Synthèse pour le tableau de bord. */
  async summary() {
    const month = monthKey();
    const row = await this.prisma.aiSpend.findUnique({ where: { month } });
    return {
      month,
      calls: row?.calls ?? 0,
      inputTokens: row?.inputTokens ?? 0,
      outputTokens: row?.outputTokens ?? 0,
      spentEur: (row?.costMicroEur ?? 0) / 1_000_000,
      budgetEur: monthlyBudgetMicroEur() / 1_000_000,
    };
  }

  private warnOnce(key: string, message: string) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.logger.warn(message);
  }
}
