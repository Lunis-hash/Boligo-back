import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current Users:', JSON.stringify(users.map(u => ({ id: u.id, name: u.firstName })), null, 2));

  const proposals = await prisma.matchProposal.findMany({
    include: {
      sourceUser: true,
      targetUser: true,
    }
  });
  console.log('Current Proposals:', JSON.stringify(proposals.map(p => ({
    id: p.id,
    from: p.sourceUser.firstName,
    to: p.targetUser.firstName,
    status: p.status
  })), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
