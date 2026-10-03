/**
 * Vérification d'intégration des règles métier corrigées lors de l'audit :
 * invitations et crédits, cycle de vie des invitations, étapes du parcours,
 * échange de coordonnées, codes promo, Sondeur, Grand Entretien.
 *
 * S'exécute UNIQUEMENT sur une base PostgreSQL locale (refus sinon) :
 *   npm run test:int
 * Les données créées sont supprimées à la fin.
 */
import 'dotenv/config';
import * as assert from 'assert';
import { PrismaService } from '../src/prisma/prisma.service';
import { MatchingService } from '../src/matching/matching.service';
import { JourneyService } from '../src/journey/journey.service';
import { VideoCallService } from '../src/video/video-call.service';
import { PaymentService } from '../src/payment/payment.service';
import { CreditService } from '../src/credit/credit.service';
import { InterviewService } from '../src/interview/interview.service';

process.env.HARMONY_QUESTIONS_SOURCE = 'bank';
const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  throw new Error('Base locale requise');
}

const prisma = new PrismaService();
const notif: any = { sendPushNotification: async () => undefined, notifyVideoUnlock: async () => undefined };
const gateway: any = { broadcastIncomingCall: () => undefined, broadcastNewMessage: () => undefined };
const matching = new MatchingService(prisma, notif);
const credit = new CreditService(prisma);
const journeys = new JourneyService(prisma, {} as any, notif, gateway, credit);
const video = new VideoCallService(prisma, { logConfigurationHint: () => undefined } as any, notif, gateway);
const payment = new PaymentService({ get: () => undefined } as any, prisma, credit, {} as any);

const tag = `lc${Date.now().toString(36)}`;
let n = 0;
async function member(gender: 'H' | 'F', credits: number, extra: Record<string, unknown> = {}) {
  n += 1;
  const u = await prisma.user.create({
    data: {
      email: `${tag}.${n}@boligo-test.fr`,
      firstName: `T${n}`,
      lastName: 'Test',
      gender,
      birthDate: new Date('1990-01-01'),
      city: 'Paris, Île-de-France, France',
      creditBalance: credits,
      isVerified: true,
      accountStatus: 'actif',
      ...extra,
    } as any,
  });
  const itv = await prisma.interviewIA.create({ data: { userId: u.id, status: 'termine' } as any });
  await prisma.mentalMap.create({ data: { userId: u.id, interviewId: itv.id, synthesis: 'test' } as any });
  return u;
}
const balance = async (id: string) =>
  (await prisma.user.findUniqueOrThrow({ where: { id } })).creditBalance;

let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function main() {
  const A = await member('H', 1);
  const B = await member('F', 1);
  const C = await member('F', 0);
  const D = await member('H', 1);

  let ab: any;
  await check('invitation : 1 crédit débité par le serveur, référencé', async () => {
    ab = await matching.createMatch(A.id, B.id);
    assert.strictEqual(ab.success, true);
    assert.strictEqual(await balance(A.id), 0);
    const tx = await prisma.creditTransaction.findFirst({ where: { paymentRef: `MATCH_${ab.match.id}` } });
    assert.ok(tx && tx.creditAmount === -1);
  });

  await check('règle d’or : pas de 2e invitation, sans débit', async () => {
    await prisma.user.update({ where: { id: A.id }, data: { creditBalance: 1 } });
    const r: any = await matching.createMatch(A.id, C.id);
    assert.strictEqual(r.success, false);
    assert.strictEqual(await balance(A.id), 1);
    await prisma.user.update({ where: { id: A.id }, data: { creditBalance: 0 } });
  });

  await check('profil déjà invité indisponible pour un autre membre', async () => {
    const r: any = await matching.createMatch(D.id, B.id);
    assert.strictEqual(r.success, false);
    assert.strictEqual(await balance(D.id), 1);
  });

  await check('refus : invitation fermée, crédit rendu une seule fois', async () => {
    const r: any = await matching.declineMatch(ab.match.id, B.id);
    assert.strictEqual(r.success, true);
    assert.strictEqual(await balance(A.id), 1);
    const again: any = await matching.declineMatch(ab.match.id, B.id);
    assert.strictEqual(again.success, false);
    assert.strictEqual(await balance(A.id), 1);
    const p = await prisma.matchProposal.findUniqueOrThrow({ where: { id: ab.match.id } });
    assert.strictEqual(p.status, 'refusee');
  });

  let ac: any;
  await check('acceptation sans crédit refusée, invitation conservée', async () => {
    ac = await matching.createMatch(A.id, C.id);
    assert.strictEqual(ac.success, true);
    const r: any = await matching.acceptMatch(ac.match.id, C.id);
    assert.strictEqual(r.success, false);
    assert.strictEqual(r.code, 'NO_CREDIT');
    const p = await prisma.matchProposal.findUniqueOrThrow({ where: { id: ac.match.id } });
    assert.strictEqual(p.status, 'en_attente');
  });

  let journeyId = '';
  await check('acceptation : crédit débité, parcours créé, crédits liés au parcours', async () => {
    await prisma.user.update({ where: { id: C.id }, data: { creditBalance: 1 } });
    const r: any = await matching.acceptMatch(ac.match.id, C.id);
    assert.strictEqual(r.success, true);
    journeyId = r.journey.id;
    assert.strictEqual(await balance(C.id), 0);
    const linked = await prisma.creditTransaction.count({ where: { journeyId, type: 'consommation' } });
    assert.strictEqual(linked, 2);
    const twice: any = await matching.acceptMatch(ac.match.id, C.id);
    assert.strictEqual(twice.success, false);
    assert.strictEqual(await balance(C.id), 0);
  });

  await check('Découverte bloquée pendant le parcours, rouverte quand il échoue', async () => {
    assert.deepStrictEqual(await matching.getDiscoverProfiles(A.id), []);
    await prisma.journey.update({ where: { id: journeyId }, data: { currentStep: 'termine', result: 'echoue', endDate: new Date() } });
    const list = await matching.getDiscoverProfiles(A.id);
    assert.ok(list.some((p: any) => p.id === B.id) === false, 'B déjà rencontrée');
    const mine = await matching.getMyMatches(A.id);
    assert.ok(!mine.some((m: any) => m.journeyId === journeyId), 'parcours échoué masqué');
    await prisma.journey.update({ where: { id: journeyId }, data: { currentStep: 'phase_harmonie', result: 'en_cours', endDate: null } });
  });

  await check('expiration : invitation fermée et crédit rendu', async () => {
    const E = await member('H', 1);
    const F = await member('F', 0);
    const r: any = await matching.createMatch(E.id, F.id);
    assert.strictEqual(r.success, true);
    await prisma.matchProposal.update({ where: { id: r.match.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await matching.getReceivedLikes(F.id);
    const p = await prisma.matchProposal.findUniqueOrThrow({ where: { id: r.match.id } });
    assert.strictEqual(p.status, 'expiree');
    assert.strictEqual(await balance(E.id), 1);
  });

  await check('retrait par l’auteur : crédit rendu', async () => {
    const G = await member('H', 1);
    const H = await member('F', 0);
    const r: any = await matching.createMatch(G.id, H.id);
    const c: any = await matching.cancelMatch(r.match.id, G.id);
    assert.strictEqual(c.success, true);
    assert.strictEqual(await balance(G.id), 1);
    const notMine: any = await matching.cancelMatch(r.match.id, H.id);
    assert.strictEqual(notMine.success, false);
  });

  await check('deux invitations simultanées : une seule passe, un seul débit', async () => {
    const I = await member('H', 2);
    const J = await member('F', 0);
    const K = await member('F', 0);
    const res: any[] = await Promise.all([matching.createMatch(I.id, J.id), matching.createMatch(I.id, K.id)]);
    assert.strictEqual(res.filter((x) => x.success).length, 1);
    assert.strictEqual(await balance(I.id), 1);
  });

  await check('membre suspendu absent de la Découverte et non invitable', async () => {
    const L = await member('H', 1);
    const S = await member('F', 0, { accountStatus: 'suspendu' });
    const list = await matching.getDiscoverProfiles(L.id);
    assert.ok(!list.some((p: any) => p.id === S.id));
    const r: any = await matching.createMatch(L.id, S.id);
    assert.strictEqual(r.success, false);
    assert.strictEqual(await balance(L.id), 1);
  });

  await check('avancement forcé refusé hors vidéo → échange', async () => {
    await assert.rejects(journeys.advanceStep(journeyId, A.id, 'termine'));
    await prisma.journey.update({ where: { id: journeyId }, data: { currentStep: 'video' } });
    await assert.rejects(journeys.advanceStep(journeyId, A.id, 'echange_contacts'));
  });

  await check('fin d’appel sans les deux membres : étape inchangée', async () => {
    await prisma.videoSession.upsert({
      where: { journeyId },
      create: { journeyId, status: 'en_cours', startDate: new Date(Date.now() - 60000), consentA: true },
      update: { status: 'en_cours', startDate: new Date(Date.now() - 60000), consentA: true, consentB: false },
    });
    const r = await video.endCall(journeyId, A.id, 60);
    assert.strictEqual(r.advanced, false);
  });

  await check('fin d’appel à deux : passage à l’échange de coordonnées', async () => {
    await prisma.videoSession.update({ where: { journeyId }, data: { status: 'en_cours', consentB: true } });
    const r = await video.endCall(journeyId, C.id, 60);
    assert.strictEqual(r.advanced, true);
  });

  await check('échange de coordonnées : un refus n’est jamais levé par l’autre', async () => {
    await journeys.exchangeContact(journeyId, A.id, true, true);
    const r = await journeys.exchangeContact(journeyId, C.id, false, true);
    assert.strictEqual(r.bothAccepted, true);
    assert.strictEqual(r.phoneShared, false);
    assert.strictEqual(r.emailShared, true);
    const view = await journeys.getContactExchange(journeyId, A.id);
    assert.strictEqual(view.partner.telephone, null);
    assert.ok(view.partner.email);
    const j = await prisma.journey.findUniqueOrThrow({ where: { id: journeyId } });
    assert.strictEqual(j.result, 'reussi');
  });

  await check('échange de coordonnées refusé hors étape', async () => {
    const M = await member('H', 1);
    const N = await member('F', 1);
    const inv: any = await matching.createMatch(M.id, N.id);
    const acc: any = await matching.acceptMatch(inv.match.id, N.id);
    await assert.rejects(journeys.exchangeContact(acc.journey.id, M.id, true, true));
  });

  await check('Sondeur : réponse du partenaire masquée tant qu’on n’a pas répondu', async () => {
    const R = await member('H', 1);
    const T = await member('F', 1);
    const inv: any = await matching.createMatch(R.id, T.id);
    const acc: any = await matching.acceptMatch(inv.match.id, T.id);
    // Questions du Sondeur tirées de la banque (aucun appel IA en test).
    const generated: any[] = await journeys.getDailyQuestions(acc.journey.id, T.id);
    const q = generated[0];
    await prisma.harmonyResponse.create({ data: { questionId: q.id, userId: T.id, responseText: 'Réponse de T' } });
    const forR: any[] = await journeys.getDailyQuestions(acc.journey.id, R.id);
    const mineBefore = forR.find((x) => x.id === q.id);
    assert.strictEqual(mineBefore.responses.length, 0);
    assert.strictEqual(mineBefore.partnerAnswered, true);
    await prisma.harmonyResponse.create({ data: { questionId: q.id, userId: R.id, responseText: 'Réponse de R' } });
    const after: any[] = await journeys.getDailyQuestions(acc.journey.id, R.id);
    assert.strictEqual(after.find((x) => x.id === q.id).responses.length, 2);
  });

  await check('Grand Entretien terminé : un nouvel envoi ne rouvre rien', async () => {
    const U = await member('H', 0);
    const interview = new InterviewService(prisma, {} as any);
    const r: any = await interview.saveModule(U.id, { moduleNumber: 3, moduleName: 'M3', answers: {} });
    assert.strictEqual(r.alreadyCompleted, true);
    assert.strictEqual(await prisma.interviewIA.count({ where: { userId: U.id } }), 1);
    await assert.rejects(
      interview.saveModule(U.id, { moduleNumber: 3, moduleName: 'M3', answers: { M0_Q06: 'A' } }),
    );
  });

  await check('arrêt du parcours par un membre : clos pour les deux, crédit rendu à l’autre une fois', async () => {
    const V = await member('H', 1);
    const W = await member('F', 1);
    const inv: any = await matching.createMatch(V.id, W.id);
    const acc: any = await matching.acceptMatch(inv.match.id, W.id);
    await journeys.leaveJourney(acc.journey.id, W.id);
    assert.strictEqual(await balance(V.id), 1);
    assert.strictEqual(await balance(W.id), 0);
    await assert.rejects(journeys.leaveJourney(acc.journey.id, V.id));
    assert.strictEqual(await balance(V.id), 1);
    const j = await prisma.journey.findUniqueOrThrow({ where: { id: acc.journey.id } });
    assert.strictEqual(j.result, 'abandonne');
  });

  await check('code promo gratuit : plafond et usage unique respectés en concurrence', async () => {
    const code = `T${tag}`.toUpperCase().slice(0, 20);
    await prisma.promoCode.create({ data: { code, discountType: 'free', discountValue: 0, maxUses: 1 } });
    const P = await member('H', 0);
    const Q = await member('F', 0);
    const res = await Promise.allSettled([
      payment.applyPromoCode(P.id, code, 'parcours_harmonie'),
      payment.applyPromoCode(Q.id, code, 'parcours_harmonie'),
    ]);
    assert.strictEqual(res.filter((x) => x.status === 'fulfilled').length, 1);
    assert.strictEqual((await balance(P.id)) + (await balance(Q.id)), 1);
    const promo = await prisma.promoCode.findUniqueOrThrow({ where: { code } });
    assert.strictEqual(promo.usedCount, 1);
    await assert.rejects(payment.applyPromoCode(P.id, 'BOLIGO100X', 'parcours_harmonie'));
  });

  console.log(`\n${passed} vérifications réussies`);
}

main()
  .catch((e) => {
    console.error('ÉCHEC :', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Nettoyage des données de test locales.
    const users = await prisma.user.findMany({ where: { email: { startsWith: `${tag}.` } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    const js = await prisma.journey.findMany({ where: { OR: [{ userAId: { in: ids } }, { userBId: { in: ids } }] }, select: { id: true } });
    const jIds = js.map((j) => j.id);
    await prisma.harmonyResponse.deleteMany({ where: { userId: { in: ids } } });
    await prisma.harmonyQuestion.deleteMany({ where: { journeyId: { in: jIds } } });
    await prisma.contactExchange.deleteMany({ where: { journeyId: { in: jIds } } });
    await prisma.videoSession.deleteMany({ where: { journeyId: { in: jIds } } });
    await prisma.creditTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.journey.deleteMany({ where: { id: { in: jIds } } });
    await prisma.matchProposal.deleteMany({ where: { OR: [{ sourceUserId: { in: ids } }, { targetUserId: { in: ids } }] } });
    await prisma.promoUsage.deleteMany({ where: { userId: { in: ids } } });
    await prisma.promoCode.deleteMany({ where: { code: `T${tag}`.toUpperCase().slice(0, 20) } });
    await prisma.mentalMap.deleteMany({ where: { userId: { in: ids } } });
    await prisma.interviewIA.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });
