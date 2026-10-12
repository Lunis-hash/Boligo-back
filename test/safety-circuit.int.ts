/**
 * Recette d'intégration du circuit de sécurité (V8.2), services réels, base
 * PostgreSQL LOCALE uniquement :
 *
 *   DATABASE_URL=postgresql://…@localhost:5432/… npm run test:int:safety
 *
 * Vérifie que la séparation « sécurité / compatibilité » ne lève aucune
 * protection : mise à l'abri dans la Découverte et les invitations, réponses
 * préoccupantes du Sondeur cachées et signalées, décisions de la modération,
 * signalement par un membre, suspension. Aucun e-mail ni notification réels
 * (bouchons), aucune IA. Les données créées sont supprimées.
 */
import * as assert from 'assert';
import { PrismaService } from '../src/prisma/prisma.service';
import { MatchingService } from '../src/matching/matching.service';
import {
  JourneyService,
  HELD_ANSWER_TEXT,
} from '../src/journey/journey.service';
import { JourneyInsightsService } from '../src/journey/journey-insights.service';
import { CreditService } from '../src/credit/credit.service';
import { GhostingService } from '../src/journey/ghosting.service';
import { ReportService } from '../src/report/report.service';
import { AdminService } from '../src/admin/admin.service';

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url))
  throw new Error('Base locale requise');
process.env.HARMONY_QUESTIONS_SOURCE = 'bank';
process.env.SAFETY_ALERT_EMAILS = 'equipe-recette@boligo-test.fr';
delete process.env.INTERVIEW_VERSION;

const prisma = new PrismaService();
const pushes: Array<{ userId: string; title: string; content: string }> = [];
const emails: Array<{ to: string; subject: string; body: string }> = [];
const notif: any = {
  sendPushNotification: async (
    userId: string,
    _t: any,
    title: string,
    content: string,
  ) => {
    pushes.push({ userId, title, content });
  },
  notifyVideoUnlock: async () => undefined,
  notifyChatOpen: async () => undefined,
  notifyNewMatch: async () => undefined,
  emailUser: async () => undefined,
};
const email: any = {
  sendSimpleEmail: async (
    to: string,
    subject: string,
    _title: string,
    paragraphs: string[],
  ) => {
    emails.push({ to, subject, body: paragraphs.join('\n') });
  },
};
const ai: any = {
  moderateSondeurAnswer: async () => ({ allowed: true, categories: [] }),
};
const gateway: any = {
  broadcastIncomingCall: () => undefined,
  broadcastNewMessage: () => undefined,
};
const credit = new CreditService(prisma);
const ghosting = new GhostingService(prisma, notif, credit);
const insights = new JourneyInsightsService(prisma, ai, notif, email);
const journeys = new JourneyService(
  prisma,
  ai,
  notif,
  gateway,
  credit,
  ghosting,
  insights,
);
const matching = new MatchingService(prisma, notif);
const reports = new ReportService(prisma);
const admin = new AdminService(prisma, {} as any, notif, {} as any, credit);

const tag = `saf${Date.now().toString(36)}`;
let n = 0;
/** Membre au Grand Entretien terminé, avec ses réponses (version V7.1). */
async function member(gender: 'H' | 'F', answers: Record<string, string>) {
  n += 1;
  const u = await prisma.user.create({
    data: {
      email: `${tag}.${n}@boligo-test.fr`,
      firstName: `S${n}`,
      lastName: 'Securite',
      gender,
      birthDate: new Date('1992-06-01'),
      city: 'Paris, Île-de-France, France',
      creditBalance: 2,
      isVerified: true,
      accountStatus: 'actif',
    } as any,
  });
  await prisma.profile.create({ data: { userId: u.id } });
  const itv = await prisma.interviewIA.create({
    data: {
      userId: u.id,
      status: 'termine',
      questionnaireVersion: '7.1',
      responses: {
        create: {
          moduleNumber: 0,
          moduleName: 'M0',
          rawResponses: { M0_Q02: 'D', M0_Q01: 'D', M0_Q10: 'A', ...answers },
        },
      },
    },
  });
  await prisma.mentalMap.create({
    data: { userId: u.id, interviewId: itv.id, synthesis: 'recette' } as any,
  });
  return u;
}
const discoverIds = async (userId: string) =>
  ((await matching.getDiscoverProfiles(userId)) as any[]).map((p) => p.id);
const score = (a: string, b: string) =>
  (matching as any).resolveCompatibilityScore(a, b);

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const limit = { M6_Q04: 'A' }; // « Rupture immédiate — limite absolue »
  const X = await member('H', limit);
  const tolerant = await member('F', { M6_Q04: 'C' }); // « Ça dépend des circonstances »
  const control = await member('F', limit);
  // Réponse isolée et modérée : insiste « parfois » quand l'autre refuse.
  const isolated = await member('F', { M6_Q04: 'B', M9_Q24: 'C' });
  // « Une gifle peut se comprendre : plutôt d'accord » (attitude à risque, règle V7.1).
  const slap = await member('F', { M6_Q04: 'B', M6_Q24: 'D' });

  await check(
    'limite de sécurité face à une tolérance déclarée : profil non proposé, invitation refusée, score non pénalisé',
    async () => {
      const s = await score(X.id, tolerant.id);
      assert.strictEqual(s.hardStop, false, 'jamais une « incompatibilité »');
      assert.strictEqual(s.safetyHold, true);
      const ids = await discoverIds(X.id);
      assert.ok(
        ids.includes(control.id),
        'la Découverte fonctionne (témoin visible)',
      );
      assert.ok(!ids.includes(tolerant.id), 'mis à l’abri dans la Découverte');
      assert.ok(
        !(await discoverIds(tolerant.id)).includes(X.id),
        'dans les deux sens',
      );
      const inv: any = await matching.createMatch(tolerant.id, X.id);
      assert.strictEqual(inv.success, false);
      assert.strictEqual(
        await prisma.matchProposal.count({
          where: { sourceUserId: tolerant.id },
        }),
        0,
      );
    },
  );

  await check(
    'réponse isolée et modérée : ni mise à l’abri, ni exclusion, ni signalement',
    async () => {
      const s = await score(X.id, isolated.id);
      assert.strictEqual(s.safetyHold, false);
      assert.strictEqual(s.hardStop, false);
      assert.ok((await discoverIds(X.id)).includes(isolated.id));
      assert.strictEqual(
        await prisma.report.count({ where: { reportedId: isolated.id } }),
        0,
      );
    },
  );

  await check(
    'justifier la gifle face à une limite absolue : mis à l’abri, comme en V7.1, sans « incompatibilité »',
    async () => {
      const s = await score(X.id, slap.id);
      assert.strictEqual(s.safetyHold, true);
      assert.strictEqual(s.hardStop, false);
      assert.ok(!(await discoverIds(X.id)).includes(slap.id));
      assert.strictEqual(
        await prisma.report.count({ where: { reportedId: slap.id } }),
        0,
        'aucun signalement sur une réponse d’entretien',
      );
    },
  );

  await check(
    'aucune information de sécurité dans les vues renvoyées aux membres',
    async () => {
      const views = (await matching.getDiscoverProfiles(X.id)) as any[];
      assert.ok(views.length > 0);
      for (const v of views) assert.ok(!('safetyHold' in v));
    },
  );

  // ─── Sondeur : réponse préoccupante ────────────────────────────────────────
  const inv: any = await matching.createMatch(X.id, control.id);
  const acc: any = await matching.acceptMatch(inv.match.id, control.id);
  const journeyId: string = acc.journey.id;
  const qs: any[] = await journeys.getDailyQuestions(journeyId, X.id);
  const day1 = qs.filter((q) => q.day === 1);

  await check(
    'menace écrite dans le Sondeur : enregistrée, cachée à l’autre, signalée, équipe prévenue sans nom',
    async () => {
      await journeys.respondToQuestion(
        day1[0].id,
        control.id,
        'Si tu me quittes, je te tuerai.',
      );
      await journeys.respondToQuestion(
        day1[0].id,
        X.id,
        'Je veux du respect et de la douceur.',
      );
      const forX: any[] = await journeys.getDailyQuestions(journeyId, X.id);
      const r = forX
        .find((q) => q.id === day1[0].id)
        .responses.find((x: any) => x.userId === control.id);
      assert.strictEqual(r.responseText, HELD_ANSWER_TEXT);
      const rep = await prisma.report.findFirst({
        where: { reportedId: control.id, status: 'en_attente' },
      });
      assert.ok(rep, 'signalement en attente de la modération');
      assert.match(rep!.description ?? '', /menace/);
      assert.ok(
        emails.some((e) => /urgent/i.test(e.subject)),
        'équipe prévenue',
      );
      for (const e of emails) {
        assert.ok(
          !e.body.includes('tuerai') && !e.body.includes(control.firstName),
          'ni nom ni réponse dans l’e-mail',
        );
      }
    },
  );

  await check(
    'décision « rejeté » : la réponse redevient visible (aucune sanction arbitraire)',
    async () => {
      const rep = await prisma.report.findFirstOrThrow({
        where: { reportedId: control.id, status: 'en_attente' },
      });
      await admin.updateReport(rep.id, 'rejete' as any);
      const forX: any[] = await journeys.getDailyQuestions(journeyId, X.id);
      const r = forX
        .find((q) => q.id === day1[0].id)
        .responses.find((x: any) => x.userId === control.id);
      assert.strictEqual(r.responseText, 'Si tu me quittes, je te tuerai.');
    },
  );

  await check(
    'confidence d’une violence subie : signalée sans mettre l’auteur en cause, ressources d’aide envoyées',
    async () => {
      const before = pushes.length;
      await journeys.respondToQuestion(
        day1[1].id,
        control.id,
        'Mon ex me frappait quand je refusais de sortir.',
      );
      const rep = await prisma.report.findFirst({
        where: { reportedId: control.id, status: 'en_attente' },
        orderBy: { reportedAt: 'desc' },
      });
      assert.ok(rep);
      assert.match(rep!.description ?? '', /violence subie|violence_subie/);
      assert.ok(
        pushes.slice(before).some((p) => p.userId === control.id),
        'message d’aide privé à l’auteur',
      );
      assert.ok(
        !pushes.slice(before).some((p) => p.userId === X.id),
        'rien envoyé à l’autre membre',
      );
    },
  );

  await check(
    'signalement par un membre puis suspension : absent de la Découverte, ne peut plus inviter',
    async () => {
      const other = await member('H', limit);
      const r: any = await reports.createReport(X.id, {
        reportedUserId: isolated.id,
        reason: 'harcelement' as any,
        description: 'Messages insistants',
      });
      assert.ok(r);
      assert.strictEqual(
        (
          await prisma.report.findFirstOrThrow({
            where: { reporterId: X.id, reportedId: isolated.id },
          })
        ).status,
        'en_attente',
      );
      await admin.updateUser(
        isolated.id,
        { accountStatus: 'suspendu' } as any,
        'MODERATOR' as any,
      );
      assert.ok(!(await discoverIds(other.id)).includes(isolated.id));
      const tryInvite: any = await matching.createMatch(isolated.id, other.id);
      assert.strictEqual(tryInvite.success, false);
    },
  );
}

main()
  .catch((e) => {
    console.error('ÉCHEC :', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await prisma.user.findMany({
      where: { email: { startsWith: `${tag}.` } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const js = await prisma.journey.findMany({
      where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] },
      select: { id: true },
    });
    const jIds = js.map((j) => j.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.report.deleteMany({
      where: { OR: [{ reporterId: { in: ids } }, { reportedId: { in: ids } }] },
    });
    await prisma.message.deleteMany({ where: { journeyId: { in: jIds } } });
    await prisma.harmonyResponse.deleteMany({ where: { userId: { in: ids } } });
    await prisma.harmonyQuestion.deleteMany({
      where: { journeyId: { in: jIds } },
    });
    await prisma.journeyInsight.deleteMany({
      where: { journeyId: { in: jIds } },
    });
    await prisma.creditTransaction.deleteMany({
      where: { userId: { in: ids } },
    });
    await prisma.journey.deleteMany({ where: { id: { in: jIds } } });
    await prisma.matchProposal.deleteMany({
      where: {
        OR: [{ sourceUserId: { in: ids } }, { targetUserId: { in: ids } }],
      },
    });
    await prisma.mentalMap.deleteMany({ where: { userId: { in: ids } } });
    await prisma.moduleResponse.deleteMany({
      where: { interview: { userId: { in: ids } } },
    });
    await prisma.interviewIA.deleteMany({ where: { userId: { in: ids } } });
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    console.log(`\n${passed} vérifications du circuit de sécurité réussies`);
  });
