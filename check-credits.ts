import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { not: { contains: 'boligo.demo' } } },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (users.length > 0) {
    const me = users[0];
    console.log(`Email: ${me.email}`);
    console.log(`Vies en BDD: ${me.creditBalance}`);
  }
}

main().finally(() => prisma.$disconnect());
