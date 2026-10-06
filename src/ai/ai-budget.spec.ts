import {
  costMicroEur,
  estimateTokens,
  modelPrice,
  monthKey,
  monthlyBudgetMicroEur,
  profileAiEnabled,
} from './ai-budget';
import { AiBudgetService } from './ai-budget.service';
import { AiService } from './ai.service';

describe('Budget IA', () => {
  it('compte le coût en millionièmes d’euro, prudemment', () => {
    // 1 000 000 jetons d'entrée sur llama-3.1-8b-instant = 0,05 €.
    expect(costMicroEur('llama-3.1-8b-instant', 1_000_000, 0)).toBe(50_000);
    expect(costMicroEur('modele-inconnu', 1000, 1000)).toBe(3000);
    expect(modelPrice('minimax/minimax-m2.7:free')).toEqual({
      input: 0,
      output: 0,
    });
    expect(estimateTokens('x'.repeat(3000))).toBe(1000);
    expect(monthKey(new Date('2026-10-06T12:00:00Z'))).toBe('2026-10');
  });

  it('fixe 10 € par mois par défaut ; 0 coupe toute IA', () => {
    expect(monthlyBudgetMicroEur(undefined)).toBe(10_000_000);
    expect(monthlyBudgetMicroEur('2,5')).toBe(2_500_000);
    expect(monthlyBudgetMicroEur('0')).toBe(0);
    expect(monthlyBudgetMicroEur('n’importe quoi')).toBe(0);
  });

  it('rédige les portraits sans IA sauf demande explicite', () => {
    expect(profileAiEnabled(undefined)).toBe(false);
    expect(profileAiEnabled('deterministe')).toBe(false);
    expect(profileAiEnabled('AI')).toBe(true);
  });

  it('refuse un appel qui dépasserait le budget, et enregistre la consommation', async () => {
    const rows = new Map<string, { costMicroEur: number; calls: number }>();
    const prisma = {
      aiSpend: {
        findUnique: jest.fn(({ where }: { where: { month: string } }) =>
          Promise.resolve(rows.get(where.month) ?? null),
        ),
        upsert: jest.fn(
          ({
            where,
            create,
            update,
          }: {
            where: { month: string };
            create: { costMicroEur: number };
            update: { costMicroEur: { increment: number } };
          }) => {
            const row = rows.get(where.month);
            const next = row
              ? {
                  calls: row.calls + 1,
                  costMicroEur:
                    row.costMicroEur + update.costMicroEur.increment,
                }
              : { calls: 1, costMicroEur: create.costMicroEur };
            rows.set(where.month, next);
            return Promise.resolve(next);
          },
        ),
      },
    };
    const old = process.env.AI_MONTHLY_BUDGET_EUR;
    process.env.AI_MONTHLY_BUDGET_EUR = '0.01'; // 10 000 millionièmes
    const budget = new AiBudgetService(prisma as never);
    expect(await budget.allow(9_000)).toBe(true);
    await budget.record('modele-inconnu', 3000, 1000); // 5 000
    expect(await budget.allow(6_000)).toBe(false);
    expect(await budget.allow(4_000)).toBe(true);
    expect((await budget.summary()).spentEur).toBe(0.005);
    process.env.AI_MONTHLY_BUDGET_EUR = old;
    if (old === undefined) delete process.env.AI_MONTHLY_BUDGET_EUR;
  });

  it('budget épuisé : la modération passe au filtre local, sans appel payant', async () => {
    const budget = {
      allow: jest.fn(() => Promise.resolve(false)),
      record: jest.fn(),
    };
    const service = new AiService(undefined, budget as never);
    const groqCreate = jest.fn();
    (service as unknown as { groq: unknown }).groq = {
      chat: { completions: { create: groqCreate } },
      models: {
        list: () => Promise.resolve({ data: [{ id: 'llama-3.1-8b-instant' }] }),
      },
    };
    const res = await service.moderateChatMessage(
      'Voici mon numéro, appelle-moi ce soir après le travail, on se voit ?',
    );
    expect(groqCreate).not.toHaveBeenCalled();
    expect(res).toHaveProperty('allowed');
  });
});
