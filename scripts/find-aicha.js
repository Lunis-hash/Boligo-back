const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      gender: true,
      creditBalance: true,
      accountStatus: true,
    }
  });
  console.log('=== TOUS LES UTILISATEURS ===');
  console.log(users);

  const proposals = await prisma.matchProposal.findMany({
    include: {
      sourceUser: { select: { id: true, firstName: true, email: true } },
      targetUser: { select: { id: true, firstName: true, email: true } },
    }
  });
  console.log('=== TOUTES LES PROPOSITIONS / LIKES ===');
  console.log(proposals);
}

main().finally(() => prisma.$disconnect());
