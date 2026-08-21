import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fatou = await prisma.user.findUnique({
    where: { email: 'fatou.kone@gmail.com' },
  });

  if (!fatou) {
    console.error('Fatou introuvable.');
    return;
  }

  // Trouver la proposition reçue par Fatou
  const proposal = await prisma.matchProposal.findFirst({
    where: {
      targetUserId: fatou.id,
      status: 'en_attente',
    },
    orderBy: { proposedAt: 'desc' },
  });

  if (!proposal) {
    console.log('Aucune proposition en attente pour Fatou.');
    const allProposals = await prisma.matchProposal.findMany({});
    console.log('Toutes les propositions :', allProposals);
    return;
  }

  const sourceUser = await prisma.user.findUnique({
    where: { id: proposal.sourceUserId },
  });

  console.log(`💕 Proposition trouvée de ${sourceUser?.firstName || 'Utilisateur'} (${sourceUser?.email}) pour Fatou !`);

  // Accepter la proposition
  await prisma.matchProposal.update({
    where: { id: proposal.id },
    data: {
      status: 'acceptee',
      iaExplanation: 'Match mutuel accepté',
    },
  });

  // Créer ou récupérer le journey
  let journey = await prisma.journey.findFirst({
    where: { proposalId: proposal.id },
  });

  if (!journey) {
    journey = await prisma.journey.create({
      data: {
        proposalId: proposal.id,
        userAId: proposal.sourceUserId,
        userBId: proposal.targetUserId,
        currentStep: 'phase_harmonie',
      },
    });
  }

  console.log(`🎉 Match accepté ! Journey créé avec l'ID : ${journey.id} (Étape : ${journey.currentStep})`);
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
