const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const proposalId = 'f118eafc-375b-47d7-80ee-f098725de9ff';
  
  // 1. Mettre à jour la proposition de match
  const match = await prisma.matchProposal.update({
    where: { id: proposalId },
    data: {
      status: 'acceptee',
      iaExplanation: 'Match mutuel accepté avec succès !',
    },
  });
  console.log('✅ Proposition acceptée :', match.id);

  // 2. Créer le Journey (Parcours Harmonie) s'il n'existe pas déjà
  const existingJourney = await prisma.journey.findUnique({
    where: { proposalId: match.id },
  });

  let journey = existingJourney;
  if (!existingJourney) {
    journey = await prisma.journey.create({
      data: {
        proposalId: match.id,
        userAId: match.sourceUserId,
        userBId: match.targetUserId,
        currentStep: 'phase_harmonie',
      },
    });
    console.log('✅ Parcours Harmonie (Journey) créé :', journey.id);
  } else {
    console.log('ℹ️ Le parcours existe déjà :', journey.id);
  }

  // 3. Mettre à jour le statut des 2 utilisateurs à "en_parcours"
  await prisma.user.updateMany({
    where: { id: { in: [match.sourceUserId, match.targetUserId] } },
    data: { accountStatus: 'en_parcours' },
  });
  console.log('✅ Statut utilisateurs passé à "en_parcours"');

  console.log('🎉 MATCH VALIDÉ AVEC SUCCÈS ENTRE SAMUEL ET AÏCHA !');
}

main().catch(console.error).finally(() => prisma.$disconnect());
