import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stellaId = '2629e42f-6534-4c9e-9e57-f7d5575db3e4';
  
  // 1. Get matched IDs
  const existingMatches = await prisma.matchProposal.findMany({
    where: {
      OR: [
        { sourceUserId: stellaId },
        { AND: [{ targetUserId: stellaId }, { status: { in: ['acceptee', 'refusee', 'expiree'] } }] },
      ],
    },
    select: { sourceUserId: true, targetUserId: true },
  });

  const matchedUserIds = new Set<string>();
  matchedUserIds.add(stellaId);
  existingMatches.forEach((m) => {
    matchedUserIds.add(m.sourceUserId);
    matchedUserIds.add(m.targetUserId);
  });

  console.log('Matched IDs for Stella:', Array.from(matchedUserIds));

  // 2. Get discover profiles
  const matches = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(matchedUserIds) },
      gender: 'H', // Assuming Stella seeks men
      mentalMaps: { some: {} },
    },
  });

  console.log('Discover profiles for Stella:', matches.map(m => m.firstName));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
