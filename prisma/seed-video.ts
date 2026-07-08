const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed pour parcours en phase vidéo...');

  const passwordHash = await bcrypt.hash('Test1234!', 10);

  // 1. Création de Marc
  let marc = await prisma.user.upsert({
    where: { email: 'marc.video@boligo.app' },
    update: {},
    create: {
      email: 'marc.video@boligo.app',
      passwordHash,
      firstName: 'Marc',
      lastName: 'Dupont',
      birthDate: new Date('1990-05-15'),
      gender: 'H',
      city: 'Paris',
      accountStatus: 'actif',
      isVerified: true,
      creditBalance: 150,
      profile: {
        create: {
          description: 'Passionné de technologie et de randonnée.',
          profession: 'Ingénieur IA',
          profileStatus: 'actif',
        }
      }
    }
  });

  const marcInterview = await prisma.interviewIA.create({
    data: {
      userId: marc.id,
      status: 'termine',
      endDate: new Date(),
    }
  });

  await prisma.mentalMap.create({
    data: {
      userId: marc.id,
      interviewId: marcInterview.id,
      synthesis: 'Profil très analytique mais empathique.',
      maturityScore: 0.88,
      needsList: { "amour": "profond", "projets": "voyages" },
      redFlags: { "tabac": "non", "mensonge": "intolérable" },
      keyValues: { "honnêteté": 10, "ambition": 8 },
      signals: { "orange": "travaille beaucoup" }
    }
  });

  // 2. Création de Sophie
  let sophie = await prisma.user.upsert({
    where: { email: 'sophie.video@boligo.app' },
    update: {},
    create: {
      email: 'sophie.video@boligo.app',
      passwordHash,
      firstName: 'Sophie',
      lastName: 'Martin',
      birthDate: new Date('1992-08-22'),
      gender: 'F',
      city: 'Lyon',
      accountStatus: 'actif',
      isVerified: true,
      creditBalance: 120,
      profile: {
        create: {
          description: 'Artiste peintre et amoureuse de la nature.',
          profession: 'Designer',
          profileStatus: 'actif',
        }
      }
    }
  });

  const sophieInterview = await prisma.interviewIA.create({
    data: {
      userId: sophie.id,
      status: 'termine',
      endDate: new Date(),
    }
  });

  await prisma.mentalMap.create({
    data: {
      userId: sophie.id,
      interviewId: sophieInterview.id,
      synthesis: 'Créative, douce, recherche la stabilité.',
      maturityScore: 0.92,
      needsList: { "affection": "quotidienne", "famille": "oui" },
      redFlags: { "arrogance": "rédhibitoire" },
      keyValues: { "créativité": 10, "famille": 9 },
      signals: { "vert": "prête pour l'engagement" }
    }
  });

  // 3. Création du MatchProposal
  const proposal = await prisma.matchProposal.create({
    data: {
      sourceUserId: marc.id,
      targetUserId: sophie.id,
      compatibilityScore: 0.89,
      iaExplanation: 'Marc et Sophie partagent un profond désir de stabilité. L\'esprit analytique de Marc complémente la créativité de Sophie.',
      status: 'acceptee',
      weekNumber: 42,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
  });

  // 4. Création du Journey (étape Vidéo)
  const journey = await prisma.journey.create({
    data: {
      proposalId: proposal.id,
      userAId: marc.id,
      userBId: sophie.id,
      currentStep: 'video', // Ils sont à l'étape vidéo
      result: 'en_cours',
      videoSession: {
        create: {
          status: 'planifiee',
          dailyRoomUrl: 'https://boligo.daily.co/room-marc-sophie',
        }
      }
    }
  });

  // 5. Ajout des questions du sondeur (Phase Harmonie) simulées comme terminées
  await prisma.harmonyQuestion.create({
    data: {
      journeyId: journey.id,
      day: 1,
      theme: 'Valeurs Profondes',
      emoji: '💡',
      questionText: 'Si vous deviez tout quitter demain pour réaliser un rêve, lequel serait-ce ?',
      responses: {
        create: [
          { userId: marc.id, responseText: 'Je partirais créer une startup écologique en Islande.' },
          { userId: sophie.id, responseText: 'J\'ouvrirais une galerie d\'art solidaire en Amérique du Sud.' }
        ]
      }
    }
  });

  // 6. Ajout de quelques messages (Chat Libre)
  await prisma.message.create({
    data: {
      journeyId: journey.id,
      senderId: marc.id,
      content: 'Salut Sophie ! J\'ai adoré ta réponse sur la galerie d\'art. C\'est super inspirant.',
      moderationStatus: 'ok',
    }
  });

  await prisma.message.create({
    data: {
      journeyId: journey.id,
      senderId: sophie.id,
      content: 'Merci Marc ! Ton idée de startup écologique est tout aussi géniale. Tu aimes la nature ?',
      moderationStatus: 'ok',
    }
  });

  console.log('✅ Seed terminé avec succès !');
  console.log(`- Marc : ${marc.email}`);
  console.log(`- Sophie : ${sophie.email}`);
  console.log(`- ID du Parcours : ${journey.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
