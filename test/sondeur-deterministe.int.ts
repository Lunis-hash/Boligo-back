/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await -- recette : objets de l'API non typés */
// Configuration de PRODUCTION (repli déterministe, fail-closed) : aucune
// qualification de test, l'IA de rédaction du Sondeur doit rester éteinte.
process.env.SONDEUR_MODELS_FILE = `${__dirname}/../config/sondeur-models.json`;
/**
 * Recette d'intégration du Sondeur DÉTERMINISTE (production en repli) sur
 * 3 jours, services réels, base locale, comptes fictifs :
 * - aucune rédaction IA (ni question, ni relecture), même avec
 *   HARMONY_QUESTIONS_SOURCE=ai ;
 * - nombre adaptatif de questions (9 à 21), toutes déterministes ;
 * - aucune régénération ni suppression au rechargement ;
 * - reprise exactement sur la même question (nouveau service, comme un
 *   redémarrage) ;
 * - confidentialité : jamais la réponse de l'autre avant la sienne ; les deux
 *   réponses révélées avant la question suivante ;
 * - journées : la suivante n'ouvre qu'au jour suivant.
 *
 *   DATABASE_URL=postgresql://…@localhost:5432/… npm run test:int:deterministe
 */
import * as assert from 'assert';
import { PrismaService } from '../src/prisma/prisma.service';
import { InterviewService } from '../src/interview/interview.service';
import { QuestionsService } from '../src/interview/questions.service';
import { MatchingService } from '../src/matching/matching.service';
import { JourneyService } from '../src/journey/journey.service';
import { CreditService } from '../src/credit/credit.service';
import { GhostingService } from '../src/journey/ghosting.service';
import { sondeurGenerationEnabled } from '../src/ai/sondeur-router';

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  throw new Error('Base locale requise');
}
process.env.HARMONY_QUESTIONS_SOURCE = 'ai';
process.env.INTERVIEW_VERSION = '8.2';

const prisma = new PrismaService();
const notif: any = {
  sendPushNotification: async () => undefined,
  notifyVideoUnlock: async () => undefined,
  notifyChatOpen: async () => undefined,
  notifyNewMatch: async () => undefined,
  emailUser: async () => undefined,
};
const gateway: any = {
  broadcastIncomingCall: () => undefined,
  broadcastNewMessage: () => undefined,
};
/** IA : toute tentative de rédaction du Sondeur est comptée (attendu : 0). */
const writingCalls: string[] = [];
const ai: any = {
  generateProfileSynthesis: async () => ({
    synthesis: 'Synthèse de recette',
    needsList: [],
    keyValues: [],
    redFlags: [],
    maturityScore: 50,
    alchemyScore: 50,
    bio: 'Bio de recette',
  }),
  generateTargetedHarmonyQuestions: async () => {
    writingCalls.push('rédaction');
    return null;
  },
  reviewSondeurQuestions: async () => {
    writingCalls.push('relecture');
    return null;
  },
  moderateSondeurAnswer: async () => ({ allowed: true, danger: [] }),
  journeyAiEligible: async () => true,
};
const credit = new CreditService(prisma);
const ghosting = new GhostingService(prisma, notif, credit);
const interview = new InterviewService(prisma, ai, notif);
const questions = new QuestionsService(prisma);
const matching = new MatchingService(prisma, notif);
const newJourneys = () =>
  new JourneyService(prisma, ai, notif, gateway, credit, ghosting);

const tag = `det${Date.now().toString(36)}`;
let n = 0;
async function member(gender: 'H' | 'F', age: number) {
  n += 1;
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - age, 0, 1);
  const u = await prisma.user.create({
    data: {
      email: `${tag}.${n}@boligo-test.fr`,
      firstName: `D${n}`,
      lastName: 'Recette',
      gender,
      birthDate: birth,
      city: 'Paris, Île-de-France, France',
      creditBalance: 1,
      isVerified: true,
      accountStatus: 'actif',
    } as any,
  });
  await prisma.profile.create({ data: { userId: u.id } });
  return u;
}

const PNR = 'Je préfère ne pas répondre';
/** Couple « proche » (comme la recette V8.2) : quelques écarts natifs. */
const CLOSE_DIFFERENT = new Set([
  'V82_M5_03',
  'V82_M4_05',
  'V82_M3_02',
  'V82_M8_05',
  'M8_Q20',
  'V82_M9_03',
]);
function choose(q: any, close: boolean): string {
  if (q.input === 'ageRange') return q.id === 'V82_M0_01' ? '27-35' : '24-45';
  if (q.id === 'M0_Q10') return 'A';
  const opts = q.options.filter(
    (o: any) => !o.freeText && o.text !== PNR && o.key !== 'NA',
  );
  if (!opts.length) return q.options[q.options.length - 1].key;
  const last = close && CLOSE_DIFFERENT.has(q.id);
  return (last ? opts[opts.length - 1] : opts[0]).key;
}
function askIfMet(q: any, answers: Record<string, string>) {
  if (!q.askIf?.length) return true;
  return q.askIf.some((d: any) =>
    (answers[d.questionId] ?? '').split(',').some((k) => d.values.includes(k)),
  );
}
async function completeInterview(userId: string, last: boolean) {
  await interview.getStatus(userId);
  const all: Record<string, string> = {};
  for (let m = 0; m <= 10; m++) {
    for (let round = 0; round < 3; round++) {
      const qs = await questions.getQuestionsForUser(userId, m, 'fr');
      if (!qs.length) break;
      const answers: Record<string, string> = {};
      for (const q of qs) {
        if (!askIfMet(q, { ...all, ...answers })) continue;
        answers[q.id] = choose(q, last);
      }
      if (!Object.keys(answers).length) break;
      Object.assign(all, answers);
      await interview.saveModule(userId, {
        moduleNumber: m,
        moduleName: `Module ${m}`,
        answers,
      } as any);
    }
  }
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  let journeyId = '';
  let A: any;
  let B: any;
  let ids: string[] = [];

  await check(
    'configuration de production : rédaction IA du Sondeur désactivée (fail-closed)',
    async () => {
      assert.strictEqual(sondeurGenerationEnabled(), false);
    },
  );

  await check(
    'parcours démarré (double consentement) : Sondeur adaptatif 100 % déterministe, aucune rédaction IA',
    async () => {
      A = await member('H', 31);
      B = await member('F', 29);
      await interview.setSensitiveConsent(A.id, true);
      await interview.setSensitiveConsent(B.id, true);
      await completeInterview(A.id, false);
      await completeInterview(B.id, true);
      const inv: any = await matching.createMatch(A.id, B.id);
      assert.ok(inv.match, `invitation refusée : ${inv.message}`);
      const acc: any = await matching.acceptMatch(inv.match.id, B.id);
      journeyId = acc.journey.id;
      const list: any[] = await newJourneys().getDailyQuestions(
        journeyId,
        A.id,
      );
      assert.ok(
        list.length >= 9 && list.length <= 21,
        `${list.length} questions`,
      );
      assert.deepStrictEqual(writingCalls, [], 'rédaction IA appelée');
      const stored = await prisma.harmonyQuestion.findMany({
        where: { journeyId },
        select: { meta: true },
      });
      assert.ok(
        stored.every((q) => (q.meta as any)?.source !== 'ia'),
        'question IA servie',
      );
      ids = list.map((q) => q.id);
    },
  );

  await check(
    'rechargement : aucune régénération ni suppression, mêmes questions dans le même ordre',
    async () => {
      for (let i = 0; i < 3; i++) {
        const again: any[] = await newJourneys().getDailyQuestions(
          journeyId,
          i % 2 ? B.id : A.id,
        );
        assert.deepStrictEqual(
          again.map((q) => q.id),
          ids,
        );
      }
      assert.strictEqual(
        await prisma.harmonyQuestion.count({ where: { journeyId } }),
        ids.length,
      );
      assert.deepStrictEqual(writingCalls, []);
    },
  );

  await check(
    '3 jours : confidentialité, révélation, reprise exacte, journée suivante fermée jusqu’au lendemain',
    async () => {
      const all = await prisma.harmonyQuestion.findMany({
        where: { journeyId },
        orderBy: [{ day: 'asc' }, { sentAt: 'asc' }],
      });
      const byId = new Map(all.map((q) => [q.id, q]));
      let day = 1;
      for (let i = 0; i < ids.length; i++) {
        const q = byId.get(ids[i])!;
        if (q.day > day) {
          // La journée suivante reste fermée tant qu'elle n'a pas commencé.
          await assert.rejects(
            newJourneys().respondToQuestion(q.id, A.id, 'Réponse en avance.'),
            /disponible/,
          );
          // Lendemain : la journée s'ouvre (date de départ reculée d'un jour).
          const j = await prisma.journey.findUnique({
            where: { id: journeyId },
          });
          await prisma.journey.update({
            where: { id: journeyId },
            data: {
              stepStartDate: new Date(
                j!.stepStartDate.getTime() - 24 * 3600 * 1000,
              ),
            },
          });
          day = q.day;
        }
        // Reprise : un service neuf (redémarrage) retrouve la même question.
        const forA: any[] = await newJourneys().getDailyQuestions(
          journeyId,
          A.id,
        );
        const cur = forA.findIndex((x) => x.turn === 'current');
        assert.strictEqual(forA[cur]?.id, q.id, `reprise sur ${i + 1}`);
        if (i > 0) assert.strictEqual(forA[i - 1].turn, 'revealed');
        if (i + 1 < forA.length) assert.strictEqual(forA[i + 1].turn, 'locked');
        await newJourneys().respondToQuestion(
          q.id,
          A.id,
          `Réponse de A, jour ${q.day}, question ${i + 1}, assez détaillée.`,
        );
        // B ne voit pas la réponse de A avant la sienne ; A attend.
        const forB: any[] = await newJourneys().getDailyQuestions(
          journeyId,
          B.id,
        );
        assert.strictEqual(forB[i].turn, 'current');
        assert.ok(
          !forB[i].responses.some((r: any) => r.userId === A.id),
          'réponse de A visible avant celle de B',
        );
        const waitingA: any[] = await newJourneys().getDailyQuestions(
          journeyId,
          A.id,
        );
        assert.strictEqual(waitingA[i].turn, 'waiting');
        if (i + 1 < ids.length)
          await assert.rejects(
            newJourneys().respondToQuestion(ids[i + 1], A.id, 'En avance.'),
          );
        await newJourneys().respondToQuestion(
          q.id,
          B.id,
          `Réponse de B, jour ${q.day}, question ${i + 1}, assez détaillée.`,
        );
        const after: any[] = await newJourneys().getDailyQuestions(
          journeyId,
          A.id,
        );
        assert.strictEqual(after[i].turn, 'revealed');
        assert.strictEqual(after[i].responses.length, 2, 'deux réponses');
      }
      // Fin : toutes révélées, aucune rédaction IA, aucune question perdue.
      const end: any[] = await newJourneys().getDailyQuestions(journeyId, B.id);
      assert.ok(end.every((q) => q.turn === 'revealed'));
      assert.deepStrictEqual(
        end.map((q) => q.id),
        ids,
      );
      assert.strictEqual(
        await prisma.harmonyResponse.count({
          where: { question: { journeyId } },
        }),
        ids.length * 2,
      );
      assert.deepStrictEqual(writingCalls, []);
    },
  );

  console.log(`\n${passed} vérifications du Sondeur déterministe réussies`);
}

main()
  .catch((e) => {
    console.error('ÉCHEC :', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
