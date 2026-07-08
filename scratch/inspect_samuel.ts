import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '4823fd63-e959-44c5-ba53-b3fd1889e057';
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      receivedProposals: true,
      targetedProposals: true,
    },
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User found:', user.firstName, user.lastName);
  
  // Find active journey
  const proposals = await prisma.matchProposal.findMany({
    where: {
      OR: [
        { sourceUserId: userId },
        { targetUserId: userId },
      ],
      journey: { isNot: null },
    },
    include: {
      journey: {
        include: {
          harmonyQuestions: true,
          messages: true,
        }
      },
    },
  });

  console.log('Found', proposals.length, 'proposals with journeys');

  for (const p of proposals) {
    console.log(`Proposal ${p.id} - Status: ${p.status}`);
    if (p.journey) {
      console.log(`  Journey ${p.journey.id} - Step: ${p.journey.currentStep}`);
      console.log(`  Questions: ${p.journey.harmonyQuestions.length}, Messages: ${p.journey.messages.length}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
