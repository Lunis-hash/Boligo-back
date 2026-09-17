import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Recherche du parcours actif...');
  
  const journey = await prisma.journey.findFirst({
    where: { currentStep: 'phase_harmonie' },
    include: {
      harmonyQuestions: true,
      userA: true,
      userB: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!journey) {
    console.log('Aucun parcours actif en phase_harmonie trouvé.');
    return;
  }

  console.log(`Parcours trouvé entre ${journey.userA.firstName} et ${journey.userB.firstName}`);

  // Si pas de questions, on ne peut pas les remplir facilement sans appeler l'IA, 
  // mais on peut juste avancer le parcours pour forcer le passage.
  if (journey.harmonyQuestions.length === 0) {
    console.log('Aucune question générée pour le moment, passage en force à chat_libre...');
    await prisma.journey.update({
      where: { id: journey.id },
      data: { currentStep: 'chat_libre', stepStartDate: new Date() },
    });
    console.log('✅ Parcours avancé au Chat Libre !');
    return;
  }

  console.log(`Remplissage de ${journey.harmonyQuestions.length} questions...`);

  // Pour chaque question, créer une réponse pour userA et userB
  let count = 0;
  for (const q of journey.harmonyQuestions) {
    // Reponse userA
    const existingA = await prisma.harmonyResponse.findFirst({
      where: { questionId: q.id, userId: journey.userAId }
    });
    if (!existingA) {
      await prisma.harmonyResponse.create({
        data: {
          questionId: q.id,
          userId: journey.userAId,
          responseText: 'Réponse générée automatiquement pour tester.',
        }
      });
      count++;
    }

    // Reponse userB
    const existingB = await prisma.harmonyResponse.findFirst({
      where: { questionId: q.id, userId: journey.userBId }
    });
    if (!existingB) {
      await prisma.harmonyResponse.create({
        data: {
          questionId: q.id,
          userId: journey.userBId,
          responseText: 'Réponse automatique du partenaire.',
        }
      });
      count++;
    }
  }

  console.log(`${count} réponses ajoutées.`);

  console.log('Mise à jour du statut vers chat_libre...');
  await prisma.journey.update({
    where: { id: journey.id },
    data: { currentStep: 'chat_libre', stepStartDate: new Date() },
  });

  console.log('✅ Terminé ! Le parcours est maintenant en Chat Libre (3 jours) !');
}

main().finally(() => prisma.$disconnect());
