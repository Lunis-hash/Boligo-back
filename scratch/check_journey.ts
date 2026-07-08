import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 [Debug] Checking current journeys and questions...');
  
  const journeys = await prisma.journey.findMany({
    include: {
      harmonyQuestions: {
        include: { responses: true }
      },
      userA: true,
      userB: true
    }
  });

  console.log(JSON.stringify(journeys, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
