import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const proposalId = '7226ab5f-1f10-43c4-bc8e-275508f2db24';
  
  const journey = await prisma.journey.findUnique({
    where: { proposalId },
    include: {
      harmonyQuestions: { include: { responses: true } },
      messages: true,
      videoSession: true,
      contactExchange: true,
    },
  });

  if (!journey) {
    console.log('No journey found for this proposal');
    return;
  }

  console.log('Deleting journey data for:', journey.id);

  // 1. Delete HarmonyResponses
  for (const q of journey.harmonyQuestions) {
    await prisma.harmonyResponse.deleteMany({ where: { questionId: q.id } });
  }
  
  // 2. Delete HarmonyQuestions
  await prisma.harmonyQuestion.deleteMany({ where: { journeyId: journey.id } });

  // 3. Delete Messages
  await prisma.message.deleteMany({ where: { journeyId: journey.id } });

  // 4. Delete VideoSession
  if (journey.videoSession) {
    await prisma.videoSession.delete({ where: { id: journey.videoSession.id } });
  }

  // 5. Delete ContactExchange
  if (journey.contactExchange) {
    await prisma.contactExchange.delete({ where: { id: journey.contactExchange.id } });
  }

  // 6. Delete Journey
  await prisma.journey.delete({ where: { id: journey.id } });

  // 7. Reset MatchProposal
  await prisma.matchProposal.update({
    where: { id: proposalId },
    data: {
      status: 'en_attente',
      iaExplanation: 'Parcours réinitialisé par l\'administrateur',
    },
  });

  console.log('Parcours reinitialized successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
