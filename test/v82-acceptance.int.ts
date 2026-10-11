/**
 * Recette d'intégration V8.2 : services réels (Grand Entretien, matching,
 * parcours, Sondeur) sur une base PostgreSQL LOCALE uniquement.
 *
 *   DATABASE_URL=postgresql://…@localhost:5432/… npm run test:int:v82
 *
 * Aucune variable de .env n'est chargée ; aucune IA, aucun e-mail, aucune
 * notification réels : l'IA est simulée (questions avec et sans preuves) et
 * les notifications sont des bouchons. Les données créées sont supprimées.
 */
import * as assert from 'assert';
import { PrismaService } from '../src/prisma/prisma.service';
import { InterviewService } from '../src/interview/interview.service';
import { ProfileService } from '../src/profile/profile.service';
import { QuestionsService } from '../src/interview/questions.service';
import { MatchingService } from '../src/matching/matching.service';
import { JourneyService } from '../src/journey/journey.service';
import { CreditService } from '../src/credit/credit.service';
import { GhostingService } from '../src/journey/ghosting.service';
import {
  buildDivergenceReport,
  collectRawAnswers,
} from '../src/matching/divergence.engine';
import { buildEvidence } from '../src/journey/sondeur-evidence';
import { V82_ONLY_IDS } from '../src/interview/questions.v82';
import { isSensitiveQuestion } from '../src/interview/sensitive-questions';
import { THEME_LIST } from '../src/matching/divergence.engine';
import { buildRelationalProfile } from '../src/psychometrics/psychometrics';

const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  throw new Error('Base locale requise');
}
process.env.HARMONY_QUESTIONS_SOURCE = 'ai';
delete process.env.INTERVIEW_VERSION;

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

/** IA simulée : propositions valides (preuve neutre) et fautives (sans preuve, écart inventé, autre thème). */
const aiCalls: unknown[][] = [];
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
  generateTargetedHarmonyQuestions: async (...args: unknown[]) => {
    aiCalls.push(args);
    const questions: any[] = [];
    let n = 0;
    for (const day of [1, 2, 3])
      for (const themeKey of THEME_LIST) {
        const w = `zz${(n++).toString(36)}q`;
        const base = { day, theme: 'Recette', themeKey, emoji: '💬', options: ['Autre...'] };
        questions.push(
          { ...base, text: `Que veut dire ${w} pour vous, proposition valide ?`, preuves: [`N-${themeKey}`], nature: 'neutre' },
          { ...base, text: `Que veut dire ${w}x pour vous, sans preuve ?`, nature: 'neutre' },
          { ...base, text: `Comment dépasser votre désaccord sur ${w}y au quotidien ?`, preuves: [`N-${themeKey}`], nature: 'ecart' },
        );
      }
    return {
      questions: questions.map((q) => ({
        ...q,
        evidence: q.preuves,
        claim: q.nature,
        writer: 'recette/redacteur',
      })),
      model: 'recette/redacteur',
    };
  },
  reviewSondeurQuestions: async () => ({
    rejected: new Set(),
    preferred: new Set(),
    refusals: [],
    model: 'recette/relecteur',
  }),
};

const credit = new CreditService(prisma);
const ghosting = new GhostingService(prisma, notif, credit);
const interview = new InterviewService(prisma, ai, notif);
const questions = new QuestionsService(prisma);
const profiles = new ProfileService(prisma);
const matching = new MatchingService(prisma, notif);
const journeys = new JourneyService(prisma, ai, notif, gateway, credit, ghosting);

const tag = `v82r${Date.now().toString(36)}`;
let n = 0;
async function member(gender: 'H' | 'F', age: number) {
  n += 1;
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - age, 0, 1);
  const u = await prisma.user.create({
    data: {
      email: `${tag}.${n}@boligo-test.fr`,
      firstName: `R${n}`,
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
/** « Proche » : comme « first », sauf quelques sujets (écarts natifs, punitions corporelles). */
const CLOSE_DIFFERENT = new Set(['V82_M5_03', 'V82_M4_05', 'V82_M3_02', 'V82_M8_05', 'M8_Q20', 'V82_M9_03']);
type Style = 'first' | 'last' | 'close';
/** Réponse « première option » ou « dernière option », hors saisie libre et « ne pas répondre ». */
function choose(q: any, style: Style): string {
  if (q.input === 'ageRange') return q.id === 'V82_M0_01' ? '27-35' : '24-45';
  if (q.id === 'M0_Q10') return 'A';
  const opts = q.options.filter(
    (o: any) => !o.freeText && o.text !== PNR && o.key !== 'NA',
  );
  // Saisie libre seule (V82_M1_01) : « je préfère ne pas répondre ».
  if (!opts.length) return q.options[q.options.length - 1].key;
  const last = style === 'last' || (style === 'close' && CLOSE_DIFFERENT.has(q.id));
  return (last ? opts[opts.length - 1] : opts[0]).key;
}
function askIfMet(q: any, answers: Record<string, string>) {
  if (!q.askIf?.length) return true;
  return q.askIf.some((d: any) =>
    (answers[d.questionId] ?? '').split(',').some((k) => d.values.includes(k)),
  );
}

/** Grand Entretien complet par les services de l'API, module par module. */
async function completeInterview(userId: string, style: Style, lang: 'fr' | 'en' = 'fr') {
  await interview.getStatus(userId);
  const all: Record<string, string> = {};
  for (let m = 0; m <= 10; m++) {
    for (let round = 0; round < 3; round++) {
      const qs = await questions.getQuestionsForUser(userId, m, lang);
      if (!qs.length) break;
      const answers: Record<string, string> = {};
      for (const q of qs) {
        if (!askIfMet(q, { ...all, ...answers })) continue;
        answers[q.id] = choose(q, style);
      }
      if (!Object.keys(answers).length) break;
      Object.assign(all, answers);
      await interview.saveModule(userId, { moduleNumber: m, moduleName: `Module ${m}`, answers } as any);
    }
  }
  return interview.getStatus(userId);
}

async function storedAnswers(userId: string) {
  const itv = await prisma.interviewIA.findFirst({
    where: { userId },
    orderBy: { startDate: 'desc' },
    include: { responses: true },
  });
  return collectRawAnswers(itv?.responses);
}

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  // ─── V7.1 par défaut ───────────────────────────────────────────────────────
  await check('sans INTERVIEW_VERSION : le Grand Entretien servi est la V7.1 (production inchangée)', async () => {
    const C = await member('H', 30);
    const status: any = await completeInterview(C.id, 'first');
    assert.strictEqual(status.isCompleted, true);
    const a = await storedAnswers(C.id);
    assert.ok(a.M0_Q01, 'M0_Q01 (V7.1) attendue');
    assert.ok(!Object.keys(a).some((id) => V82_ONLY_IDS.has(id)));
  });

  // ─── V8.2 ──────────────────────────────────────────────────────────────────
  process.env.INTERVIEW_VERSION = '8.2';

  await check('INTERVIEW_VERSION=8.2 : questions V8.2, curseurs d’âge, anglais', async () => {
    const E = await member('F', 29);
    await interview.getStatus(E.id);
    const fr = await questions.getQuestionsForUser(E.id, 0, 'fr');
    const ids = fr.map((q) => q.id);
    assert.ok(ids.includes('V82_M0_01') && ids.includes('V82_M0_03'));
    assert.ok(!ids.includes('M0_Q01'));
    assert.strictEqual((fr.find((q) => q.id === 'V82_M0_01') as any).input, 'ageRange');
    const en = await questions.getQuestionsForUser(E.id, 0, 'en');
    assert.match(en.find((q) => q.id === 'V82_M0_03')!.text, /^Do you have children/);
    const en8 = await questions.getQuestionsForUser(E.id, 8, 'en');
    assert.match(en8.find((q) => q.id === 'V82_M8_06')!.text, /no violence or danger/);
  });

  await check('saisies refusées : plage invalide, plages incohérentes, question V7.1 dans un entretien V8.2', async () => {
    const E = await member('F', 31);
    await interview.getStatus(E.id);
    const save = (answers: Record<string, string>) =>
      interview.saveModule(E.id, { moduleNumber: 0, moduleName: 'M0', answers } as any);
    await assert.rejects(save({ V82_M0_01: '40-30' }));
    await assert.rejects(save({ V82_M0_01: '28-34', V82_M0_02: '30-40' }));
    await save({ V82_M0_03: 'A' }); // l'entretien est désormais V8.2
    await assert.rejects(save({ M0_Q01: 'A' }));
    await assert.rejects(save({ V82_M0_03: 'A,B' })); // « pas d'enfant » + « avec moi »
  });

  await check('un entretien V7.1 commencé reste en V7.1 malgré INTERVIEW_VERSION=8.2', async () => {
    const D = await member('H', 33);
    delete process.env.INTERVIEW_VERSION;
    await interview.getStatus(D.id);
    await interview.saveModule(D.id, { moduleNumber: 0, moduleName: 'M0', answers: { M0_Q01: 'A' } } as any);
    process.env.INTERVIEW_VERSION = '8.2';
    const ids = (await questions.getQuestionsForUser(D.id, 1, 'fr')).map((q) => q.id);
    assert.ok(ids.length > 0);
    assert.ok(!ids.some((id) => V82_ONLY_IDS.has(id)));
  });

  const A = await member('H', 32);
  const B = await member('F', 30);
  // ─── Versionnement durable ─────────────────────────────────────────────────
  const versionOf = async (userId: string) =>
    (await prisma.interviewIA.findFirst({ where: { userId }, orderBy: { startDate: 'desc' } }))?.questionnaireVersion;
  const qIds = async (userId: string, m: number) =>
    (await questions.getQuestionsForUser(userId, m, 'fr')).map((q) => q.id);

  await check('version : entretien vierge V8.2 reste V8.2 quand la configuration repasse en V7.1', async () => {
    process.env.INTERVIEW_VERSION = '8.2';
    const U = await member('F', 28);
    await interview.getStatus(U.id);
    assert.strictEqual(await versionOf(U.id), '8.2');
    delete process.env.INTERVIEW_VERSION;
    const ids = await qIds(U.id, 0);
    assert.ok(ids.includes('V82_M0_03') && !ids.includes('M0_Q01'));
    process.env.INTERVIEW_VERSION = '8.2';
  });

  await check('version : identifiants communs seulement (périmètre d’inscription) → la version enregistrée décide', async () => {
    delete process.env.INTERVIEW_VERSION;
    const U = await member('H', 36);
    // Inscription : le périmètre M0_Q02 crée l'entretien (profile.service).
    await prisma.interviewIA.create({
      data: { userId: U.id, status: 'en_cours', questionnaireVersion: '7.1', responses: { create: { moduleNumber: 0, moduleName: 'M0', rawResponses: { M0_Q02: 'A' } } } },
    });
    process.env.INTERVIEW_VERSION = '8.2';
    const ids = await qIds(U.id, 0);
    assert.ok(ids.includes('M0_Q01') && !ids.some((id) => V82_ONLY_IDS.has(id)));
  });

  await check('version : entretien antérieur au versionnement (aucune version) → V7.1, même avec INTERVIEW_VERSION=8.2', async () => {
    process.env.INTERVIEW_VERSION = '8.2';
    const U = await member('F', 35);
    await prisma.interviewIA.create({
      data: { userId: U.id, status: 'en_cours', responses: { create: { moduleNumber: 0, moduleName: 'M0', rawResponses: { M0_Q02: 'A' } } } },
    });
    assert.strictEqual(await versionOf(U.id), null);
    const ids = await qIds(U.id, 0);
    assert.ok(ids.includes('M0_Q01') && !ids.some((id) => V82_ONLY_IDS.has(id)));
    await interview.saveModule(U.id, { moduleNumber: 0, moduleName: 'M0', answers: { M0_Q01: 'A' } } as any);
    await assert.rejects(interview.saveModule(U.id, { moduleNumber: 0, moduleName: 'M0', answers: { V82_M0_03: 'A' } } as any));
    assert.strictEqual(await versionOf(U.id), null, 'donnée existante inchangée');
  });

  await check('version : entretien V8.2 interrompu, configuration changée, reprise et fin en V8.2', async () => {
    process.env.INTERVIEW_VERSION = '8.2';
    const U = await member('H', 31);
    await interview.getStatus(U.id);
    await interview.saveModule(U.id, { moduleNumber: 0, moduleName: 'M0', answers: { V82_M0_03: 'A', V82_M0_01: '27-35', V82_M0_02: '24-45' } } as any);
    delete process.env.INTERVIEW_VERSION; // retour arrière de la configuration
    const status: any = await completeInterview(U.id, 'first');
    assert.strictEqual(status.isCompleted, true);
    const a = await storedAnswers(U.id);
    assert.ok(a.V82_M8_06 && !a.M0_Q01, 'terminé dans sa version d’origine');
    assert.strictEqual(await versionOf(U.id), '8.2');
    process.env.INTERVIEW_VERSION = '8.2';
  });

  await check('version : entretien créé à l’inscription (périmètre) reçoit la version configurée, puis ne bouge plus', async () => {
    process.env.INTERVIEW_VERSION = '8.2';
    const U = await member('F', 27);
    await profiles.updateProfile(U.id, { meetingScope: 'national' } as any);
    assert.strictEqual(await versionOf(U.id), '8.2');
    delete process.env.INTERVIEW_VERSION;
    assert.ok((await qIds(U.id, 0)).includes('V82_M0_03'));
    process.env.INTERVIEW_VERSION = '8.2';
  });

  await check('version : immuable en base (déclencheur), même par une écriture directe', async () => {
    const U = await member('F', 30);
    await interview.getStatus(U.id);
    const itv = await prisma.interviewIA.findFirstOrThrow({ where: { userId: U.id } });
    await assert.rejects(prisma.interviewIA.update({ where: { id: itv.id }, data: { questionnaireVersion: '7.1' } }), /immuable/);
    await assert.rejects(prisma.interviewIA.update({ where: { id: itv.id }, data: { questionnaireVersion: '9.9' } }));
    assert.strictEqual(await versionOf(U.id), '8.2');
  });

  await check('version : activation progressive à 100 % puis retour à 0 %', async () => {
    delete process.env.INTERVIEW_VERSION;
    process.env.INTERVIEW_V82_PERCENT = '100';
    const U = await member('H', 29);
    await interview.getStatus(U.id);
    process.env.INTERVIEW_V82_PERCENT = '0';
    const W = await member('H', 29);
    await interview.getStatus(W.id);
    delete process.env.INTERVIEW_V82_PERCENT;
    assert.strictEqual(await versionOf(U.id), '8.2');
    assert.strictEqual(await versionOf(W.id), '7.1');
    process.env.INTERVIEW_VERSION = '8.2';
  });

  await check('deux Grands Entretiens V8.2 complets ; sans accord, aucune réponse sensible enregistrée', async () => {
    await interview.setSensitiveConsent(A.id, true);
    await interview.setSensitiveConsent(B.id, false);
    const sa: any = await completeInterview(A.id, 'first');
    const sb: any = await completeInterview(B.id, 'last', 'en');
    assert.strictEqual(sa.isCompleted, true);
    assert.strictEqual(sb.isCompleted, true);
    const a = await storedAnswers(A.id);
    const b = await storedAnswers(B.id);
    assert.ok(a.V82_M0_03 && b.V82_M0_03);
    assert.ok(!('M8_Q13' in a) && !('M8_Q13' in b));
    assert.ok(a.V82_M8_06 && b.V82_M8_06, 'M8_Q13 reformulée posée');
    for (const id of ['M5_Q07', 'M9_Q07', 'M4_Q14', 'M10_Q15']) assert.ok(a[id] && b[id], id);
    assert.ok(a.M1_Q16, 'A a consenti : religion enregistrée');
    assert.ok(!Object.keys(b).some((id) => isSensitiveQuestion(id)), 'B sans accord : aucune donnée sensible');
    const map = await prisma.mentalMap.findFirst({ where: { userId: A.id } });
    assert.ok(map, 'carte mentale créée (IA simulée)');
  });

  let journeyId = '';
  await check('compatibilité V8.2 : alerte de sécurité séparée, jamais une exclusion', async () => {
    const a = await storedAnswers(A.id);
    const b = await storedAnswers(B.id);
    const report = buildDivergenceReport(a, b);
    assert.strictEqual(report.questionnaire, '8.2');
    assert.ok(report.divergences.some((d) => d.questionId.startsWith('V82_')));
    // B a répondu « tout à fait d'accord » à la gifle (dernière option) : alerte, pas exclusion.
    assert.ok(report.safetyAlerts!.some((d) => d.questionId === 'M6_Q24' || d.questionId === 'M6_Q04'));
    assert.ok(!report.divergences.some((d) => d.severity === 'critique' && ['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24', 'M8_Q20'].includes(d.questionId) && !report.safetyAlerts!.includes(d)));
    const score: any = await (matching as any).resolveCompatibilityScore(A.id, B.id);
    assert.strictEqual(typeof score.percent, 'number');
    const critical = report.divergences.filter((d) => d.severity === 'critique' && !report.safetyAlerts!.includes(d));
    // Réponses opposées sur tout : de vraies incompatibilités déclarées (enfants…),
    // jamais tirées des alertes de sécurité.
    assert.strictEqual(score.hardStop, critical.length > 0);
    assert.ok(critical.every((d) => !['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24', 'M8_Q20'].includes(d.questionId)));
    const inv: any = await matching.createMatch(A.id, B.id);
    if (score.hardStop) assert.strictEqual(inv.success, false);
  });

  const A2 = await member('H', 34);
  const B2 = await member('F', 31);
  await check('couple V8.2 proche : écarts natifs, punitions corporelles en alerte (sans mise à l’abri), invitation et parcours possibles', async () => {
    await interview.setSensitiveConsent(A2.id, true);
    await interview.setSensitiveConsent(B2.id, true);
    await completeInterview(A2.id, 'first');
    await completeInterview(B2.id, 'close');
    const report = buildDivergenceReport(await storedAnswers(A2.id), await storedAnswers(B2.id));
    assert.strictEqual(report.questionnaire, '8.2');
    // Profil relationnel lu sur les échelles V8.2 (Mini-IPIP : cinq traits).
    const profile = buildRelationalProfile(await storedAnswers(A2.id), 'H');
    assert.strictEqual(profile?.personality.length, 5);
    assert.ok(report.divergences.some((d) => d.questionId === 'V82_M5_03'));
    assert.ok(report.safetyAlerts!.some((d) => d.questionId === 'M8_Q20'));
    assert.strictEqual(report.hardStop, false);
    assert.strictEqual(report.safetyHold, false);
    const inv: any = await matching.createMatch(A2.id, B2.id);
    assert.ok(inv.match, `invitation refusée : ${inv.message}`);
    const acc: any = await matching.acceptMatch(inv.match.id, B2.id);
    journeyId = acc.journey.id;
  });

  await check('Sondeur V8.2 : 21 questions, preuves tracées, questions sans preuve jamais servies', async () => {
    const list: any[] = await journeys.getDailyQuestions(journeyId, A2.id);
    const all = await prisma.harmonyQuestion.findMany({
      where: { journeyId },
      select: { questionText: true, meta: true },
    });
    assert.strictEqual(all.length, 21);
    for (const q of all) {
      const ev = (q.meta as any)?.evidence;
      assert.ok(ev && Array.isArray(ev.evidence), `trace manquante : ${q.questionText}`);
    }
    assert.ok(!all.some((q) => /sans preuve|désaccord sur/.test(q.questionText)));
    const fromAi = all.filter((q) => q.questionText.includes('proposition valide'));
    assert.ok(fromAi.length > 0);
    for (const q of fromAi) assert.match((q.meta as any).evidence.evidence[0], /^N-/);
    // L'API des membres ne renvoie jamais meta (méthode, modèles, preuves).
    assert.ok(list.length > 0);
    for (const q of list) assert.ok(!('meta' in q), 'meta exposé aux membres');
  });

  await check('confidentialité : l’index de preuves transmis à l’IA ne contient aucune réponse', async () => {
    assert.ok(aiCalls.length > 0);
    const index = String(aiCalls[0][6]);
    const report = buildDivergenceReport(await storedAnswers(A2.id), await storedAnswers(B2.id));
    for (const e of buildEvidence(report))
      for (const p of e.privateTexts) assert.ok(!index.includes(p), `réponse dans l’index : ${p}`);
    // Ni coordonnées ni nom de famille dans ce qui est envoyé à l'IA.
    const sent = JSON.stringify(aiCalls[0]);
    for (const u of [A2, B2]) {
      assert.ok(!sent.includes(u.email));
      assert.ok(!sent.includes('Recette'));
    }
    // Aucune réponse de sécurité citée à l'IA (gifle : « tout à fait d'accord »).
    const analysis = String(aiCalls[0][0]);
    assert.ok(!/une gifle peut se comprendre/i.test(analysis));
    const quoted = analysis.split('\n').filter((l) => /« Tout à fait d.accord »/.test(l));
    if (quoted.length) console.log(quoted.join('\n'));
    assert.ok(!quoted.some((l) => /gifle|violence|LIMITE/i.test(l)));
  });
}

main()
  .catch((e) => {
    console.error('ÉCHEC :', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    const users = await prisma.user.findMany({ where: { email: { startsWith: `${tag}.` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    const js = await prisma.journey.findMany({ where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] }, select: { id: true } });
    const jIds = js.map((j) => j.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.harmonyResponse.deleteMany({ where: { userId: { in: ids } } });
    await prisma.harmonyQuestion.deleteMany({ where: { journeyId: { in: jIds } } });
    await prisma.creditTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.journey.deleteMany({ where: { id: { in: jIds } } });
    await prisma.matchProposal.deleteMany({ where: { OR: [{ sourceUserId: { in: ids } }, { targetUserId: { in: ids } }] } });
    await prisma.mentalMap.deleteMany({ where: { userId: { in: ids } } });
    await prisma.moduleResponse.deleteMany({ where: { interview: { userId: { in: ids } } } });
    await prisma.interviewIA.deleteMany({ where: { userId: { in: ids } } });
    await prisma.profile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    console.log(`\n${passed} vérifications V8.2 réussies`);
  });
