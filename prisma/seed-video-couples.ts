import {
  PrismaClient,
  Gender,
  AccountStatus,
  ProfileStatus,
  InterviewStatus,
  ProposalStatus,
  JourneyStep,
  JourneyResult,
  VideoStatus,
  MessageType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD_PLAIN = 'Test1234!';

interface CoupleConfig {
  userA: {
    email: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    birthDate: string;
    city: string;
    profession: string;
    description: string;
    photo: string;
  };
  userB: {
    email: string;
    firstName: string;
    lastName: string;
    gender: Gender;
    birthDate: string;
    city: string;
    profession: string;
    description: string;
    photo: string;
  };
  messages: string[];
}

const COUPLES: CoupleConfig[] = [
  {
    userA: {
      email: 'alexandre.video@boligo.test',
      firstName: 'Alexandre',
      lastName: 'Lambert',
      gender: Gender.H,
      birthDate: '1994-04-12',
      city: 'Paris',
      profession: 'Architecte d’intérieur',
      description: 'Passionné de design, d’art contemporain et de cuisine italienne. Je cherche une relation sincère et chaleureuse.',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500',
    },
    userB: {
      email: 'camille.video@boligo.test',
      firstName: 'Camille',
      lastName: 'Moreau',
      gender: Gender.F,
      birthDate: '1996-08-25',
      city: 'Paris',
      profession: 'Directrice Artistique',
      description: 'Créative et dynamique, j’aime voyager, découvrir de nouveaux restaurants et partager des moments vrais.',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500',
    },
    messages: [
      "Bonjour Camille ! Ravi d'être connecté avec toi.",
      "Bonjour Alexandre ! C'est un plaisir partagé.",
      "J'ai vu que tu aimais le design et l'art contemporain, c'est super !",
      "Oui absolument ! On a franchi toutes les étapes de compatibilité.",
      "Prête pour notre appel vidéo de 2 minutes ? C'est le moment de se voir !",
    ],
  },
  {
    userA: {
      email: 'julien.video@boligo.test',
      firstName: 'Julien',
      lastName: 'Rousseau',
      gender: Gender.H,
      birthDate: '1993-11-03',
      city: 'Lyon',
      profession: 'Ingénieur Environnement',
      description: 'Amateur de randonnées alpines, de vélo et de débats passionnés. Prêt pour une belle histoire.',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
    },
    userB: {
      email: 'clara.video@boligo.test',
      firstName: 'Clara',
      lastName: 'Bernard',
      gender: Gender.F,
      birthDate: '1995-02-18',
      city: 'Lyon',
      profession: 'Ostéopathe',
      description: 'Souriante, bienveillante et sportive. En quête d’un partenaire avec qui construire sereinement.',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
    },
    messages: [
      "Salut Clara ! Comment se passe ta journée à Lyon ?",
      "Hello Julien ! Très bien merci, journée bien remplie au cabinet.",
      "Super score de compatibilité entre nous, ça donne envie d'échanger !",
      "Tout à fait d'accord ! On passe à l'étape visio ?",
      "Avec grand plaisir, je lance l'appel dès que tu es prête 😊",
    ],
  },
];

async function seedUser(config: CoupleConfig['userA'], passwordHash: string) {
  // Upsert user
  const user = await prisma.user.upsert({
    where: { email: config.email },
    create: {
      email: config.email,
      passwordHash,
      firstName: config.firstName,
      lastName: config.lastName,
      birthDate: new Date(config.birthDate),
      gender: config.gender,
      city: config.city,
      accountStatus: AccountStatus.en_parcours,
      isVerified: true,
      creditBalance: 100,
    },
    update: {
      passwordHash,
      firstName: config.firstName,
      lastName: config.lastName,
      accountStatus: AccountStatus.en_parcours,
      isVerified: true,
      creditBalance: 100,
    },
  });

  // Upsert profile
  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      mainPhoto: config.photo,
      description: config.description,
      displayedCity: config.city,
      profession: config.profession,
      profileStatus: ProfileStatus.actif,
    },
    update: {
      mainPhoto: config.photo,
      description: config.description,
      displayedCity: config.city,
      profession: config.profession,
      profileStatus: ProfileStatus.actif,
    },
  });

  // Upsert interview & mentalMap
  const interview = await prisma.interviewIA.upsert({
    where: { id: `interview-${user.id}` },
    create: {
      id: `interview-${user.id}`,
      userId: user.id,
      status: InterviewStatus.termine,
      endDate: new Date(),
    },
    update: {
      status: InterviewStatus.termine,
    },
  });

  await prisma.mentalMap.upsert({
    where: { interviewId: interview.id },
    create: {
      userId: user.id,
      interviewId: interview.id,
      synthesis: `Profil mature et bienveillant de ${config.firstName}. Prêt(e) pour un engagement sérieux et authentique.`,
      bio: config.description,
      maturityScore: 0.95,
      alchemyScore: 0.92,
    },
    update: {
      synthesis: `Profil mature et bienveillant de ${config.firstName}. Prêt(e) pour un engagement sérieux et authentique.`,
      bio: config.description,
    },
  });

  return user;
}

async function main() {
  console.log('🚀 Seeding 2 couples avec parcours en étape VIDÉO activée...');
  const passwordHash = await bcrypt.hash(PASSWORD_PLAIN, 12);

  for (let i = 0; i < COUPLES.length; i++) {
    const couple = COUPLES[i];
    console.log(`\n── Couple ${i + 1} : ${couple.userA.firstName} & ${couple.userB.firstName} ──`);

    const userA = await seedUser(couple.userA, passwordHash);
    const userB = await seedUser(couple.userB, passwordHash);

    // Supprimer d'éventuels anciens matchs entre ces deux users pour repartir sur du propre
    const oldProposals = await prisma.matchProposal.findMany({
      where: {
        OR: [
          { sourceUserId: userA.id, targetUserId: userB.id },
          { sourceUserId: userB.id, targetUserId: userA.id },
        ],
      },
      include: { journey: true },
    });

    for (const p of oldProposals) {
      if (p.journey) {
        await prisma.message.deleteMany({ where: { journeyId: p.journey.id } });
        await prisma.videoSession.deleteMany({ where: { journeyId: p.journey.id } });
        await prisma.contactExchange.deleteMany({ where: { journeyId: p.journey.id } });
        await prisma.harmonyQuestion.deleteMany({ where: { journeyId: p.journey.id } });
        await prisma.journey.delete({ where: { id: p.journey.id } });
      }
      await prisma.matchProposal.delete({ where: { id: p.id } });
    }

    // Créer la proposition de match acceptée
    const proposal = await prisma.matchProposal.create({
      data: {
        sourceUserId: userA.id,
        targetUserId: userB.id,
        status: ProposalStatus.acceptee,
        compatibilityScore: 0.93 + i * 0.03,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        weekNumber: 1,
        iaExplanation: `Excellente affinité de valeurs, projets de vie alignés et communication fluide entre ${userA.firstName} et ${userB.firstName}.`,
      },
    });

    // Créer le Journey directement à l'étape VIDEO
    const journey = await prisma.journey.create({
      data: {
        proposalId: proposal.id,
        userAId: userA.id,
        userBId: userB.id,
        currentStep: JourneyStep.video,
        stepStartDate: new Date(),
        result: JourneyResult.en_cours,
      },
    });

    // Créer la session vidéo prête
    const roomName = `boligo-${journey.id.replace(/-/g, '')}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    await prisma.videoSession.create({
      data: {
        journeyId: journey.id,
        status: VideoStatus.planifiee,
        dailyRoomName: roomName,
        dailyRoomUrl: roomUrl,
      },
    });

    // Ajouter des messages de chat antérieurs
    let sentAt = new Date(Date.now() - 3600 * 1000 * 5);
    for (let mIdx = 0; mIdx < couple.messages.length; mIdx++) {
      const isA = mIdx % 2 === 0;
      sentAt = new Date(sentAt.getTime() + 15 * 60 * 1000);
      await prisma.message.create({
        data: {
          journeyId: journey.id,
          senderId: isA ? userA.id : userB.id,
          content: couple.messages[mIdx],
          type: MessageType.texte,
          sentAt,
          isRead: true,
        },
      });
    }

    console.log(`✅ Couple ${i + 1} créé avec succès :`);
    console.log(`   - Compte 1 : ${userA.email} (${couple.userA.firstName})`);
    console.log(`   - Compte 2 : ${userB.email} (${couple.userB.firstName})`);
    console.log(`   - Étape : VIDEO (currentStep = video, videoEnabled = true)`);
    console.log(`   - Journey ID : ${journey.id}`);
  }

  console.log('\n✨ Mot de passe unique pour tous les comptes de test : ' + PASSWORD_PLAIN);
}

main()
  .catch((e) => {
    console.error('❌ Erreur de seed :', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
