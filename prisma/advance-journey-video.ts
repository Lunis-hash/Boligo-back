import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fatou = await prisma.user.findUnique({
    where: { email: 'fatou.kone@gmail.com' },
  });
  const sam = await prisma.user.findUnique({
    where: { email: 'sam.kouassi@gmail.com' },
  });

  if (!fatou || !sam) {
    console.error('Utilisateurs introuvables.');
    return;
  }

  const journey = await prisma.journey.findFirst({
    where: {
      OR: [
        { userAId: fatou.id, userBId: sam.id },
        { userAId: sam.id, userBId: fatou.id },
      ],
    },
    include: {
      harmonyQuestions: {
        include: { responses: true },
        orderBy: { day: 'asc' },
      },
    },
  });

  if (!journey) {
    console.error('Aucun journey trouvé entre Sam et Fatou.');
    return;
  }

  console.log(`📍 Statut actuel du Journey : ${journey.currentStep}`);

  // Enregistrer également les réponses de Sam pour que le Sondeur soit 100% complété des 2 côtés
  const samAnswersMap: Record<number, string[]> = {
    1: [
      'Jamais pardonnable, c\'est terminé. La confiance est le trésor le plus précieux.',
      'Cacher des dettes ou des secrets sur son passé. L\'honnêteté avant tout.',
    ],
    2: [
      'C\'est difficile mais on peut discuter en adulte avec bienveillance.',
      'Mon conjoint, toujours. On protège son couple et son intimité.',
    ],
    3: [
      'C\'est un dealbreaker, la famille et les enfants sont ma priorité de vie.',
      'Seulement si on en discute et qu\'on avance ensemble main dans la main.',
    ],
  };

  for (const q of journey.harmonyQuestions) {
    const existingResponse = q.responses.find(r => r.userId === sam.id);
    if (!existingResponse) {
      const dayAnswers = samAnswersMap[q.day] || ['Je privilégie l\'écoute et la clarté.'];
      const qIndexForDay = journey.harmonyQuestions.filter(item => item.day === q.day).findIndex(item => item.id === q.id);
      const answerText = dayAnswers[qIndexForDay] || dayAnswers[0];

      await prisma.harmonyResponse.create({
        data: {
          questionId: q.id,
          userId: sam.id,
          responseText: answerText,
        },
      });
      console.log(`✅ [Jour ${q.day}] Réponse de Sam enregistrée : « ${answerText} »`);
    }
  }

  // Faire avancer le Journey à l'étape video (Appel Vidéo débloqué)
  const updatedJourney = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      currentStep: 'video',
      stepStartDate: new Date(),
    },
  });

  // Créer ou s'assurer que la session vidéo existe
  let videoSession = await prisma.videoSession.findUnique({
    where: { journeyId: journey.id },
  });

  if (!videoSession) {
    videoSession = await prisma.videoSession.create({
      data: {
        journeyId: journey.id,
        durationMinutes: 7,
        status: 'planifiee',
        consentA: true,
        consentB: true,
      },
    });
  } else {
    videoSession = await prisma.videoSession.update({
      where: { id: videoSession.id },
      data: {
        status: 'planifiee',
        consentA: true,
        consentB: true,
      },
    });
  }

  console.log(`🎉 Parcours avancé avec succès à l'étape : ${updatedJourney.currentStep} !`);
  console.log(`📹 Session d'Appel Vidéo (7 min WebRTC) débloquée avec l'ID : ${videoSession.id}`);
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
