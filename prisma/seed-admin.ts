import { Gender, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@boligo.app';
  const password = process.env.ADMIN_PASSWORD ?? 'AdminBoligo2026!';
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN, passwordHash },
    create: {
      email,
      passwordHash,
      firstName: 'Admin',
      lastName: 'BOLIGO',
      birthDate: new Date('1990-01-01'),
      gender: Gender.AUTRE,
      role: UserRole.ADMIN,
      accountStatus: 'actif',
      isVerified: true,
      profile: { create: {} },
    },
  });

  console.log(`✅ Compte admin prêt : ${admin.email}`);
  console.log('   Mot de passe : celui défini dans ADMIN_PASSWORD (ou défaut du script)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
