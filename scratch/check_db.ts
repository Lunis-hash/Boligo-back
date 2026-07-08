import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const pendingCount = await (prisma.matchProposal as any).count({
    where: { status: 'pending' },
  }).catch(() => 0);

  console.log(`Found ${pendingCount} proposals with status 'pending'`);

  if (pendingCount > 0) {
    const result = await (prisma.matchProposal as any).updateMany({
      where: { status: 'pending' },
      data: { status: 'en_attente' },
    });
    console.log(`Updated ${result.count} proposals to 'en_attente'`);
  }

  const enAttenteCount = await (prisma.matchProposal as any).count({
    where: { status: 'en_attente' },
  });
  console.log(`Found ${enAttenteCount} proposals with status 'en_attente'`);
  
  const allProposals = await (prisma.matchProposal as any).findMany();
  console.log('Sample proposals:', JSON.stringify(allProposals.slice(0, 5), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
