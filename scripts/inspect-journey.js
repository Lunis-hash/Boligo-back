const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const j = await prisma.journey.findUnique({
    where: { id: '661f3dfc-92a7-4ef3-b5b0-9c6464098522' },
    include: {
      harmonyQuestions: true,
      userA: { include: { mentalMaps: true } },
      userB: { include: { mentalMaps: true } },
    }
  });

  console.log('=== USER A (' + j.userA.firstName + ') ===');
  console.log(j.userA.mentalMaps);

  console.log('=== USER B (' + j.userB.firstName + ') ===');
  console.log(j.userB.mentalMaps);

  console.log('=== QUESTIONS ACTUELLES DU PARCOURS ===');
  console.log(j.harmonyQuestions);
}

main().catch(console.error).finally(() => prisma.$disconnect());
