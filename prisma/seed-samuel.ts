import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('🌱 Début du seed pour Samuel et Amélie...');

  // 1. Samuel
  const samuel = await prisma.user.upsert({
    where: { email: 'samuel@boligo.com' },
    update: {
      creditBalance: 6,
      accountStatus: 'actif',
    },
    create: {
      email: 'samuel@boligo.com',
      passwordHash,
      firstName: 'Samuel',
      lastName: 'Dupont',
      birthDate: new Date('1992-05-15'),
      gender: 'H',
      city: 'Paris',
      accountStatus: 'actif',
      creditBalance: 6,
    },
  });

  await prisma.profile.upsert({
    where: { userId: samuel.id },
    update: { profession: 'Designer' },
    create: {
      userId: samuel.id,
      displayedCity: 'Paris',
      profession: 'Designer',
      profileStatus: 'actif',
    },
  });

  await prisma.mentalMap.deleteMany({ where: { userId: samuel.id } });
  await prisma.interviewIA.deleteMany({ where: { userId: samuel.id } });

  // 1.b Create InterviewIA and MentalMap for Samuel
  const samuelInterview = await prisma.interviewIA.create({
    data: {
      userId: samuel.id,
      status: 'termine',
    },
  });

  await prisma.mentalMap.create({
    data: {
      userId: samuel.id,
      interviewId: samuelInterview.id,
      synthesis: "Samuel est un profil de designer créatif et réfléchi, qui recherche une relation stable et harmonieuse.",
      bio: "Créer de la beauté au quotidien et bâtir une relation sincère.",
      maturityScore: 0.90,
      alchemyScore: 0.85,
      keyValues: ['Créativité', 'Loyauté'],
    },
  });

  // 2. Amélie
  const amelie = await prisma.user.upsert({
    where: { email: 'amelie@boligo.com' },
    update: {
      creditBalance: 6,
      accountStatus: 'actif',
    },
    create: {
      email: 'amelie@boligo.com',
      passwordHash,
      firstName: 'Amélie',
      lastName: 'Girard',
      birthDate: new Date('1994-11-20'),
      gender: 'F',
      city: 'Lyon',
      accountStatus: 'actif',
      creditBalance: 6,
    },
  });

  await prisma.profile.upsert({
    where: { userId: amelie.id },
    update: { profession: 'Ingénieure' },
    create: {
      userId: amelie.id,
      displayedCity: 'Lyon',
      profession: 'Ingénieure',
      profileStatus: 'actif',
    },
  });

  await prisma.mentalMap.deleteMany({ where: { userId: amelie.id } });
  await prisma.interviewIA.deleteMany({ where: { userId: amelie.id } });

  // 2.b Create InterviewIA and MentalMap for Amélie
  const amelieInterview = await prisma.interviewIA.create({
    data: {
      userId: amelie.id,
      status: 'termine',
    },
  });

  await prisma.mentalMap.create({
    data: {
      userId: amelie.id,
      interviewId: amelieInterview.id,
      synthesis: "Amélie recherche la stabilité et l'authenticité dans une relation durable.",
      bio: "Construire sur des bases solides.",
      maturityScore: 0.92,
      alchemyScore: 0.88,
      keyValues: ['Authenticité', 'Famille'],
    },
  });

  // Clear existing matching between them if any to start fresh
  const existingProposal = await prisma.matchProposal.findFirst({
    where: {
      OR: [
        { sourceUserId: samuel.id, targetUserId: amelie.id },
        { sourceUserId: amelie.id, targetUserId: samuel.id }
      ]
    }
  });

  if (existingProposal) {
    const journey = await prisma.journey.findUnique({ where: { proposalId: existingProposal.id } });
    if (journey) {
      await prisma.harmonyResponse.deleteMany({ where: { question: { journeyId: journey.id } } });
      await prisma.harmonyQuestion.deleteMany({ where: { journeyId: journey.id } });
      await prisma.message.deleteMany({ where: { journeyId: journey.id } });
      await prisma.videoSession.deleteMany({ where: { journeyId: journey.id } });
      await prisma.contactExchange.deleteMany({ where: { journeyId: journey.id } });
      await prisma.alumniCouple.deleteMany({ where: { journeyId: journey.id } });
      await prisma.creditTransaction.deleteMany({ where: { journeyId: journey.id } });
      await prisma.journey.delete({ where: { id: journey.id } });
    }
    await prisma.matchProposal.delete({ where: { id: existingProposal.id } });
  }

  // Create a MatchProposal from Amelie (source) to Samuel (target) accepted
  const proposal = await prisma.matchProposal.create({
    data: {
      sourceUserId: amelie.id,
      targetUserId: samuel.id,
      compatibilityScore: 0.92,
      iaExplanation: "Vos visions de l'avenir s'accordent parfaitement.",
      status: 'acceptee',
      weekNumber: 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    },
  });

  // Create Journey in step "video"
  await prisma.journey.create({
    data: {
      proposalId: proposal.id,
      userAId: amelie.id,
      userBId: samuel.id,
      currentStep: 'video',
      stepStartDate: new Date(),
      result: 'en_cours',
    },
  });

  console.log('✅ Utilisateurs Samuel et Amélie créés en statut "actif".');
  console.log('✅ Crédits ajoutés : 6 chacun.');
  console.log('✅ Proposition acceptée et Journey en phase "video" créés.');
  console.log('\n--- IDENTIFIANTS ---');
  console.log('Compte Samuel : samuel@boligo.com / password123');
  console.log('Compte Amélie : amelie@boligo.com / password123');
  console.log('--------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
