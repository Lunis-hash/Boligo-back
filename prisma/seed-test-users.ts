import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  console.log('🌱 Début du seed...');

  // 1. Thomas
  const thomas = await prisma.user.upsert({
    where: { email: 'thomas@test.com' },
    update: {},
    create: {
      email: 'thomas@test.com',
      passwordHash,
      firstName: 'Thomas',
      lastName: 'Dupont',
      birthDate: new Date('1997-05-15'),
      gender: 'H',
      city: 'Paris',
      accountStatus: 'actif',
    },
  });

  const thomasProfile = await prisma.profile.upsert({
    where: { userId: thomas.id },
    update: {},
    create: {
      userId: thomas.id,
      displayedCity: 'Architecte',
      profileStatus: 'actif',
    },
  });

  const thomasInterview = await prisma.interviewIA.create({
    data: {
      userId: thomas.id,
      status: 'termine',
    },
  });

  await prisma.mentalMap.create({
    data: {
      userId: thomas.id,
      interviewId: thomasInterview.id,
      synthesis: "Thomas est un jeune architecte passionné.",
      bio: "Bâtir ensemble sur des fondations solides. 🏗️",
      maturityScore: 0.88,
      alchemyScore: 0.82,
      keyValues: ['Loyauté', 'Créativité'],
    },
  });

  // 2. Léa
  const lea = await prisma.user.upsert({
    where: { email: 'lea@test.com' },
    update: {},
    create: {
      email: 'lea@test.com',
      passwordHash,
      firstName: 'Léa',
      lastName: 'Martin',
      birthDate: new Date('1998-11-20'),
      gender: 'F',
      city: 'Lyon',
      accountStatus: 'actif',
    },
  });

  await prisma.profile.upsert({
    where: { userId: lea.id },
    update: {},
    create: {
      userId: lea.id,
      displayedCity: 'Médecin',
      profileStatus: 'actif',
    },
  });

  const leaInterview = await prisma.interviewIA.create({
    data: {
      userId: lea.id,
      status: 'termine',
    },
  });

  await prisma.mentalMap.create({
    data: {
      userId: lea.id,
      interviewId: leaInterview.id,
      synthesis: "Léa est une jeune femme dévouée.",
      bio: "Prendre soin de nous, comme un projet de vie. 🩺",
      maturityScore: 0.92,
      alchemyScore: 0.85,
      keyValues: ['Bienveillance', 'Engagement'],
    },
  });

  console.log('✅ Thomas et Léa ont été créés avec succès !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
