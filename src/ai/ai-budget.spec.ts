import {
  costFromPrice,
  costMicroEur,
  estimateTokens,
  journeyBudgetMicroEur,
  journeyMonthlyCapMicroEur,
  usdToMicroEur,
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

  it('donne 1 € à chaque parcours payé par défaut ; 0 coupe ce suivi', () => {
    expect(journeyBudgetMicroEur(undefined)).toBe(1_000_000);
    expect(journeyBudgetMicroEur('0,5')).toBe(500_000);
    expect(journeyBudgetMicroEur('0')).toBe(0);
  });

  it('parcours payé : budget propre, compté à part du plafond mensuel', async () => {
    const journeys = new Map([
      ['paye', { aiCostMicroEur: 0, paid: 1 }],
      ['gratuit', { aiCostMicroEur: 0, paid: 0 }],
    ]);
    const month = { costMicroEur: 0, journeyCalls: 0, journeyCostMicroEur: 0n };
    const prisma = {
      creditTransaction: {
        count: jest.fn(({ where }: { where: { journeyId: string } }) =>
          Promise.resolve(journeys.get(where.journeyId)?.paid ?? 0),
        ),
      },
      journey: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(journeys.get(where.id) ?? null),
        ),
        update: jest.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: { aiCostMicroEur: { increment: number } };
          }) => {
            journeys.get(where.id)!.aiCostMicroEur +=
              data.aiCostMicroEur.increment;
            return Promise.resolve({});
          },
        ),
      },
      aiSpend: {
        upsert: jest.fn(
          ({
            update,
          }: {
            update: {
              journeyCalls: { increment: number };
              journeyCostMicroEur: { increment: bigint };
            };
          }) => {
            month.journeyCalls += update.journeyCalls.increment;
            month.journeyCostMicroEur += update.journeyCostMicroEur.increment;
            return Promise.resolve(month);
          },
        ),
        findUnique: jest.fn(() => Promise.resolve(month)),
      },
    };
    const old = process.env.AI_JOURNEY_BUDGET_EUR;
    delete process.env.AI_JOURNEY_BUDGET_EUR;
    const budget = new AiBudgetService(prisma as never);
    expect(await budget.journeyEligible('paye')).toBe(true);
    expect(await budget.journeyEligible('gratuit')).toBe(false);
    expect(await budget.allowJourney('paye', 900_000)).toBe(true);
    // gpt-oss-120b : 2 000 jetons lus, 1 000 écrits = 300 + 750 millionièmes.
    await budget.recordJourney('paye', 'openai/gpt-oss-120b', 2000, 1000);
    expect(journeys.get('paye')!.aiCostMicroEur).toBe(1050);
    expect(await budget.allowJourney('paye', 999_000)).toBe(false);
    expect(await budget.allowJourney('inconnu', 1)).toBe(false);
    const summary = await budget.summary();
    expect(summary).toMatchObject({
      spentEur: 0,
      journeyCalls: 1,
      journeySpentEur: 0.00105,
      journeyBudgetEur: 1,
    });
    process.env.AI_JOURNEY_BUDGET_EUR = '0';
    expect(await budget.journeyEligible('paye')).toBe(false);
    if (old === undefined) delete process.env.AI_JOURNEY_BUDGET_EUR;
    else process.env.AI_JOURNEY_BUDGET_EUR = old;
  });

  it('prix réels (OpenRouter) et plafond mensuel des parcours payés', async () => {
    // Claude Sonnet à 2 $ / 10 $ : 1 000 jetons lus + 500 écrits = 7 000 millionièmes.
    expect(costFromPrice({ prompt: 2, completion: 10 }, 1000, 500)).toBe(7000);
    expect(usdToMicroEur(0.0071)).toBe(7100);
    expect(journeyMonthlyCapMicroEur(undefined)).toBe(100_000_000);
    expect(journeyMonthlyCapMicroEur('0')).toBe(0);

    const prisma = {
      journey: {
        findUnique: jest.fn(() => Promise.resolve({ aiCostMicroEur: 0 })),
      },
      aiSpend: {
        findUnique: jest.fn(() =>
          Promise.resolve({ journeyCostMicroEur: 99_990_000n }),
        ),
      },
    };
    const old = process.env.AI_JOURNEY_MONTHLY_CAP_EUR;
    delete process.env.AI_JOURNEY_MONTHLY_CAP_EUR;
    const budget = new AiBudgetService(prisma as never);
    // 99,99 € déjà dépensés ce mois : un appel de 0,02 € dépasserait les 100 €.
    expect(await budget.allowJourney('j', 20_000)).toBe(false);
    expect(await budget.allowJourney('j', 5_000)).toBe(true);
    if (old !== undefined) process.env.AI_JOURNEY_MONTHLY_CAP_EUR = old;
  });
});
