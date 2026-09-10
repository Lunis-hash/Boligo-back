const { PrismaClient } = require('@prisma/client');

async function test() {
  const url = 'postgresql://postgres.hhnnsevawhhtzdffnomv:Aw8oXGc9Anegw8lL@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });

  try {
    console.log('Connexion en cours à Supabase (ccwtriabponsbansvzls)...');
    await prisma.$connect();
    console.log('✅ CONNEXION RÉUSSIE ! La base de données est bien active et accessible.');
    const count = await prisma.user.count();
    console.log(`Nombre d'utilisateurs en base: ${count}`);
  } catch (error) {
    console.error('❌ Échec de connexion:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
