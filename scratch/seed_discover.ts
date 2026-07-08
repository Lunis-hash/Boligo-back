import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mockUsers = [
    {
      email: 'amina@test.com',
      firstName: 'Amina',
      lastName: 'Diallo',
      gender: 'F' as any,
      city: 'Dakar',
      profession: 'Designer',
    },
    {
      email: 'moussa@test.com',
      firstName: 'Moussa',
      lastName: 'Sow',
      gender: 'H' as any,
      city: 'Abidjan',
      profession: 'Ingénieur',
    },
    {
      email: 'claire@test.com',
      firstName: 'Claire',
      lastName: 'Boli',
      gender: 'F' as any,
      city: 'Yaoundé',
      profession: 'Avocate',
    }
  ];

  for (const u of mockUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: 'hashed_password',
        gender: u.gender,
        birthDate: new Date(1995, 5, 15),
        city: u.city,
        accountStatus: 'actif',
        profile: {
          create: {
            profession: u.profession,
            displayedCity: u.city,
            profileStatus: 'actif',
          }
        }
      }
    });

    // Create a mental map for them to be discoverable
    const interview = await prisma.interviewIA.create({
      data: {
        userId: user.id,
        status: 'termine',
      }
    });

    await prisma.mentalMap.create({
      data: {
        userId: user.id,
        interviewId: interview.id,
        synthesis: `${u.firstName} est une personne passionnée par son métier et recherchant la stabilité.`,
        bio: `Bonjour, je suis ${u.firstName}. Je cherche quelqu'un de sérieux.`,
        maturityScore: 0.82,
        alchemyScore: 0.75,
      }
    });

    console.log(`User ${u.firstName} created and ready for discovery.`);
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
