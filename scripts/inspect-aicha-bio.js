const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.findFirst({
    where: { firstName: { contains: 'Aïcha', mode: 'insensitive' } },
    include: { profile: true, mentalMaps: true, interviews: true }
  });
  console.log('=== AICHA FULL PROFILE ===');
  console.log(JSON.stringify(u, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
