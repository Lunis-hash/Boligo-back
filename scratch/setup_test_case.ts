import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const estelleId = 'd1a3da73-390b-4d2f-8415-02aea1f9dd33';
  const samuelId = '4823fd63-e959-44c5-ba53-b3fd1889e057';
  
  const estelle = await prisma.user.findUnique({ where: { id: estelleId } });
  const samuel = await prisma.user.findUnique({ where: { id: samuelId } });

  console.log('Estelle:', estelle?.firstName);
  console.log('Samuel:', samuel?.firstName);

  const existingLike = await prisma.matchProposal.findFirst({
    where: {
      sourceUserId: estelleId,
      targetUserId: samuelId,
    },
  });

  if (existingLike) {
    console.log('Like exists from Estelle to Samuel. Status:', existingLike.status);
    if (existingLike.status !== 'en_attente') {
      await prisma.matchProposal.update({
        where: { id: existingLike.id },
        data: { status: 'en_attente' },
      });
      console.log('Reset status to en_attente');
    }
  } else {
    console.log('No like from Estelle to Samuel. Creating one...');
    await prisma.matchProposal.create({
      data: {
        sourceUserId: estelleId,
        targetUserId: samuelId,
        status: 'en_attente',
        compatibilityScore: 0.92,
        iaExplanation: 'Estelle est très attirée par le profil de Samuel.',
        proposedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        weekNumber: 1,
      },
    });
    console.log('Like created.');
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
