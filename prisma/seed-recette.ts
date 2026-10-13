/**
 * Données de RECETTE LOCALE (membres FICTIFS) — voir docs/RECETTE_LOCALE.md.
 *
 *   DATABASE_URL=postgresql://…@localhost:5432/… npm run seed:recette
 *
 * - Refuse de tourner si DATABASE_URL ne vise pas localhost, 127.0.0.1 ou
 *   l'hôte Docker « db » (jamais Supabase, Render ou un autre serveur).
 * - Idempotent : supprime puis recrée SES membres (e-mails
 *   @recette.boligo.test), ses codes promo (RECETTE…) et tout ce qui en dépend.
 *   Aucune autre donnée n'est touchée.
 * - Les entretiens, le matching et le parcours passent par les VRAIS services
 *   de l'API (mêmes contrôles qu'en production) ; aucune IA, aucun e-mail,
 *   aucune notification réels : clés d'IA et d'e-mail retirées de
 *   l'environnement de ce processus, notifications remplacées par des bouchons,
 *   questions du Sondeur tirées de la banque fixe (HARMONY_QUESTIONS_SOURCE=bank).
 */

// ─── Garde-fous (avant tout import qui lirait l'environnement) ──────────────
const RAW_URL = process.env.DATABASE_URL || '';
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', 'db']);
function dbHost(raw: string): string {
  try {
    return new URL(raw).hostname;
  } catch {
    return '';
  }
}
if (!ALLOWED_HOSTS.has(dbHost(RAW_URL))) {
  console.error(
    `❌ seed:recette refusé : DATABASE_URL doit viser localhost, 127.0.0.1 ou l'hôte Docker « db » (reçu : « ${dbHost(RAW_URL) || 'absent'} »).`,
  );
  process.exit(2);
}
for (const k of [
  'OPENROUTER_API_KEY',
  'OPENROUTER_AUTH',
  'OPENROUTER_BASE_URL',
  'GROQ_API_KEY',
  'RESEND_API_KEY',
  'SENDGRID_API_KEY',
  'BREVO_API_KEY',
  'SENDINBLUE_API_KEY',
  'SMTP_HOST',
  'DAILY_API_KEY',
  'STRIPE_SECRET_KEY',
  'AI_PROFILE_MODE',
  'INTERVIEW_V82_PERCENT',
]) {
  delete process.env[k];
}
process.env.HARMONY_QUESTIONS_SOURCE = 'bank';
process.env.INTERVIEW_VERSION = '8.2';
process.env.GHOSTING_MONITOR = 'off';

import * as bcrypt from 'bcrypt';
import { PrismaService } from '../src/prisma/prisma.service';
import { AiService } from '../src/ai/ai.service';
import { InterviewService } from '../src/interview/interview.service';
import { QuestionsService } from '../src/interview/questions.service';
import { MatchingService } from '../src/matching/matching.service';
import { JourneyService } from '../src/journey/journey.service';
import { CreditService } from '../src/credit/credit.service';
import { GhostingService } from '../src/journey/ghosting.service';

export const RECETTE_DOMAIN = '@recette.boligo.test';
export const MEMBER_PASSWORD = 'Recette2026!';
export const ADMIN_PASSWORD = 'RecetteAdmin2026!';
const PROMO_CODES = ['RECETTE100', 'RECETTE50'];

const prisma = new PrismaService();
/** Bouchons : aucune notification push, aucun e-mail. */
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
// Vrai service d'IA, sans aucune clé : portrait rédigé par les règles.
const ai = new AiService();
// Modération des réponses du Sondeur : sans IA, le vrai service journalise une
// erreur (« rien de vérifié ») puis laisse passer. Le seed écrit des réponses
// neutres connues : on évite ces fausses alertes dans la console.
ai.moderateSondeurAnswer = async () => ({ allowed: true, danger: [] }) as any;
const credit = new CreditService(prisma);
const ghosting = new GhostingService(prisma, notif, credit);
const interview = new InterviewService(prisma, ai, notif);
const questions = new QuestionsService(prisma);
const matching = new MatchingService(prisma, notif);
const journeys = new JourneyService(prisma, ai, notif, gateway, credit, ghosting);

// ─── Nettoyage (uniquement les données de recette) ──────────────────────────
async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { endsWith: RECETTE_DOMAIN } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  const js = await prisma.journey.findMany({
    where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] },
    select: { id: true },
  });
  const jIds = js.map((j) => j.id);
  const promos = await prisma.promoCode.findMany({
    where: { code: { in: PROMO_CODES } },
    select: { id: true },
  });
  const pIds = promos.map((p) => p.id);

  await prisma.$transaction([
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.report.deleteMany({
      where: { OR: [{ reporterId: { in: ids } }, { reportedId: { in: ids } }] },
    }),
    prisma.harmonyResponse.deleteMany({
      where: {
        OR: [{ userId: { in: ids } }, { question: { journeyId: { in: jIds } } }],
      },
    }),
    prisma.harmonyQuestion.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.journeyInsight.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.message.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.videoSession.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.contactExchange.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.alumniCouple.deleteMany({ where: { journeyId: { in: jIds } } }),
    prisma.creditTransaction.deleteMany({
      where: {
        OR: [
          { userId: { in: ids } },
          { journeyId: { in: jIds } },
          { promoCodeId: { in: pIds } },
        ],
      },
    }),
    prisma.journey.deleteMany({ where: { id: { in: jIds } } }),
    prisma.matchProposal.deleteMany({
      where: {
        OR: [{ sourceUserId: { in: ids } }, { targetUserId: { in: ids } }],
      },
    }),
    prisma.mentalMap.deleteMany({ where: { userId: { in: ids } } }),
    prisma.moduleResponse.deleteMany({
      where: { interview: { userId: { in: ids } } },
    }),
    prisma.interviewIA.deleteMany({ where: { userId: { in: ids } } }),
    prisma.promoUsage.deleteMany({
      where: { OR: [{ userId: { in: ids } }, { promoCodeId: { in: pIds } }] },
    }),
    prisma.profile.deleteMany({ where: { userId: { in: ids } } }),
    // Paiements de test éventuels : gardés anonymisés (comme en production).
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return ids.length;
}

// ─── Membres ────────────────────────────────────────────────────────────────
interface Spec {
  key: string;
  firstName: string;
  gender: 'H' | 'F';
  age: number;
  city: string;
  profession: string;
  description: string;
  credits: number;
}

let memberHash = '';
async function createMember(s: Spec) {
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - s.age, 2, 15);
  return prisma.user.create({
    data: {
      email: `${s.key}${RECETTE_DOMAIN}`,
      passwordHash: memberHash,
      firstName: s.firstName,
      lastName: 'Fictif',
      gender: s.gender,
      birthDate: birth,
      city: s.city,
      creditBalance: s.credits,
      isVerified: true,
      accountStatus: 'nouveau',
      termsAcceptedAt: new Date(),
      termsVersion: 'recette',
      profile: {
        create: {
          displayedCity: s.city.split(',')[0],
          profession: s.profession,
          description: `[Profil fictif de recette] ${s.description}`,
          profileStatus: 'complet',
        },
      },
    },
  });
}

// ─── Grand Entretien par les services de l'API (comme test/v82-acceptance) ───
const PNR = 'Je préfère ne pas répondre';
/** « close » : comme « first », sauf quelques sujets (écarts réels, non bloquants). */
const CLOSE_DIFFERENT = new Set([
  'V82_M5_03',
  'V82_M4_05',
  'V82_M3_02',
  'V82_M8_05',
  'V82_M9_03',
]);
type Style = 'first' | 'close';
function choose(q: any, style: Style): string {
  if (q.input === 'ageRange') return q.id === 'V82_M0_01' ? '27-38' : '24-45';
  const opts = q.options.filter(
    (o: any) => !o.freeText && o.text !== PNR && o.key !== 'NA',
  );
  if (!opts.length) return q.options[q.options.length - 1].key;
  const last = style === 'close' && CLOSE_DIFFERENT.has(q.id);
  return (last ? opts[opts.length - 1] : opts[0]).key;
}
function askIfMet(q: any, answers: Record<string, string>) {
  if (!q.askIf?.length) return true;
  return q.askIf.some((d: any) =>
    (answers[d.questionId] ?? '')
      .split(',')
      .some((k: string) => d.values.includes(k)),
  );
}

/**
 * Remplit le Grand Entretien module par module. `untilModule` : dernier module
 * rempli ; `partialLast` : ce dernier module n'est rempli qu'à moitié.
 */
async function fillInterview(
  userId: string,
  style: Style,
  untilModule = 10,
  partialLast = false,
) {
  await interview.setSensitiveConsent(userId, true);
  await interview.getStatus(userId);
  const all: Record<string, string> = {};
  for (let m = 0; m <= untilModule; m++) {
    for (let round = 0; round < 3; round++) {
      const qs = await questions.getQuestionsForUser(userId, m, 'fr');
      if (!qs.length) break;
      const answers: Record<string, string> = {};
      for (const q of qs) {
        if (!askIfMet(q, { ...all, ...answers })) continue;
        answers[q.id] = choose(q, style);
      }
      let keys = Object.keys(answers);
      if (!keys.length) break;
      if (partialLast && m === untilModule) {
        keys = keys.slice(0, Math.max(1, Math.floor(keys.length / 2)));
        const half: Record<string, string> = {};
        for (const k of keys) half[k] = answers[k];
        Object.assign(all, half);
        await interview.saveModule(userId, {
          moduleNumber: m,
          moduleName: `Module ${m}`,
          answers: half,
        } as any);
        break;
      }
      Object.assign(all, answers);
      await interview.saveModule(userId, {
        moduleNumber: m,
        moduleName: `Module ${m}`,
        answers,
      } as any);
    }
  }
  return interview.getStatus(userId);
}

async function versionOf(userId: string) {
  const itv = await prisma.interviewIA.findFirst({
    where: { userId },
    orderBy: { startDate: 'desc' },
  });
  return itv?.questionnaireVersion ?? null;
}

function check(cond: unknown, message: string): asserts cond {
  if (!cond) throw new Error(`Seed de recette incohérent : ${message}`);
}

// ─── Programme ──────────────────────────────────────────────────────────────
async function main() {
  console.log(`🧪 Seed de recette sur l'hôte « ${dbHost(RAW_URL)} » (base locale)`);
  const removed = await cleanup();
  console.log(`🧹 ${removed} membre(s) fictif(s) précédent(s) supprimé(s).`);

  memberHash = await bcrypt.hash(MEMBER_PASSWORD, 10);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // Administrateur fictif.
  await prisma.user.create({
    data: {
      email: `admin${RECETTE_DOMAIN}`,
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Recette',
      birthDate: new Date('1985-01-01'),
      gender: 'AUTRE',
      role: 'ADMIN',
      accountStatus: 'actif',
      isVerified: true,
      profile: { create: {} },
    },
  });

  // Codes promo de test (réinitialisés à chaque passage).
  const promoData = [
    {
      code: 'RECETTE100',
      discountType: 'free' as const,
      discountValue: 0,
      description: 'Recette locale : parcours offert (code fictif)',
    },
    {
      code: 'RECETTE50',
      discountType: 'percent' as const,
      discountValue: 50,
      description: 'Recette locale : -50 % (code fictif)',
    },
  ];
  for (const p of promoData) {
    await prisma.promoCode.upsert({
      where: { code: p.code },
      update: { ...p, usedCount: 0, isActive: true, maxUses: null, expiresAt: null },
      create: { ...p, isActive: true },
    });
  }

  // 1. Couple « Grand Entretien V8.2 terminé », invitation en attente.
  const adam = await createMember({
    key: 'adam.termine',
    firstName: 'Adam',
    gender: 'H',
    age: 34,
    city: 'Lyon, Auvergne-Rhône-Alpes, France',
    profession: 'Architecte (fictif)',
    description: 'Calme, curieux, aime la randonnée et cuisiner pour les amis.',
    credits: 2,
  });
  const bella = await createMember({
    key: 'bella.termine',
    firstName: 'Bella',
    gender: 'F',
    age: 31,
    city: 'Lyon, Auvergne-Rhône-Alpes, France',
    profession: 'Pharmacienne (fictif)',
    description: 'Rieuse et posée, passionnée de musique et de voyages.',
    credits: 2,
  });
  for (const [u, style] of [
    [adam, 'first'],
    [bella, 'close'],
  ] as const) {
    const st: any = await fillInterview(u.id, style);
    check(st.isCompleted, `${u.email} : entretien non terminé`);
    check((await versionOf(u.id)) === '8.2', `${u.email} : version ≠ 8.2`);
  }
  const invite: any = await matching.createMatch(adam.id, bella.id);
  check(invite.match, `invitation Adam → Bella refusée : ${invite.message}`);

  // 2. Couple « Sondeur en cours » : parcours actif, questions en partie répondues.
  const cyril = await createMember({
    key: 'cyril.sondeur',
    firstName: 'Cyril',
    gender: 'H',
    age: 36,
    city: 'Paris, Île-de-France, France',
    profession: 'Professeur de mathématiques (fictif)',
    description: 'Attentif, organisé, adore les jeux de société.',
    credits: 2,
  });
  const diane = await createMember({
    key: 'diane.sondeur',
    firstName: 'Diane',
    gender: 'F',
    age: 33,
    city: 'Paris, Île-de-France, France',
    profession: 'Infirmière (fictif)',
    description: 'Généreuse et directe, aime la danse et les marchés.',
    credits: 2,
  });
  await fillInterview(cyril.id, 'first');
  await fillInterview(diane.id, 'close');
  const inv2: any = await matching.createMatch(cyril.id, diane.id);
  check(inv2.match, `invitation Cyril → Diane refusée : ${inv2.message}`);
  const acc: any = await matching.acceptMatch(inv2.match.id, diane.id);
  check(acc?.journey?.id, `parcours Cyril/Diane non créé : ${acc?.message}`);
  const journeyId: string = acc.journey.id;
  const qs: any[] = await journeys.getDailyQuestions(journeyId, cyril.id);
  check(qs.length >= 2, `Sondeur : ${qs.length} question(s) servie(s)`);
  await journeys.respondToQuestion(
    qs[0].id,
    cyril.id,
    "Réponse fictive de recette : j'aimerais qu'on en parle simplement, sans pression.",
  );
  await journeys.respondToQuestion(
    qs[0].id,
    diane.id,
    'Réponse fictive de recette : pour moi c’est important, on peut trouver un équilibre.',
  );
  await journeys.respondToQuestion(
    qs[1].id,
    cyril.id,
    'Réponse fictive de recette : deuxième question, à Diane de répondre maintenant.',
  );

  // 3. Membre au Grand Entretien V8.2 EN COURS (modules 0 à 3 complets, 4 à moitié).
  const emma = await createMember({
    key: 'emma.entretien',
    firstName: 'Emma',
    gender: 'F',
    age: 29,
    city: 'Bordeaux, Nouvelle-Aquitaine, France',
    profession: 'Graphiste (fictif)',
    description: 'Créative et sportive, cherche une relation sérieuse.',
    credits: 0,
  });
  const stEmma: any = await fillInterview(emma.id, 'first', 4, true);
  check(!stEmma.isCompleted, 'Emma : entretien terminé alors qu’il doit être en cours');
  check((await versionOf(emma.id)) === '8.2', 'Emma : version ≠ 8.2');

  // 4. Nouveau membre vide (aucun entretien commencé).
  await createMember({
    key: 'felix.nouveau',
    firstName: 'Félix',
    gender: 'H',
    age: 30,
    city: 'Marseille, Provence-Alpes-Côte d’Azur, France',
    profession: 'Chef de projet (fictif)',
    description: 'Vient de s’inscrire.',
    credits: 0,
  });

  // Résumé.
  const users = await prisma.user.findMany({
    where: { email: { endsWith: RECETTE_DOMAIN } },
    orderBy: { email: 'asc' },
    select: {
      email: true,
      role: true,
      accountStatus: true,
      creditBalance: true,
      interviews: {
        select: { status: true, questionnaireVersion: true, _count: { select: { responses: true } } },
      },
    },
  });
  const answered = await prisma.harmonyResponse.count({
    where: { question: { journeyId } },
  });
  const served = await prisma.harmonyQuestion.count({ where: { journeyId } });
  console.log('\n✅ Données de recette prêtes (toutes FICTIVES) :');
  for (const u of users) {
    const itv = u.interviews[0];
    console.log(
      `   ${u.email.padEnd(40)} ${u.role.padEnd(5)} ${u.accountStatus.padEnd(12)} crédits=${u.creditBalance}` +
        (itv ? `  entretien ${itv.questionnaireVersion} ${itv.status} (${itv._count.responses} enregistrements)` : ''),
    );
  }
  console.log(`   Parcours Cyril/Diane : ${served} questions du Sondeur, ${answered} réponses.`);
  console.log(`   Codes promo : ${PROMO_CODES.join(', ')}`);
  console.log(`   Mot de passe des membres : ${MEMBER_PASSWORD} — admin : ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error('❌ seed:recette :', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
