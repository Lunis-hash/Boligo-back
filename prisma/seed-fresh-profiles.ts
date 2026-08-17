import { PrismaClient, Gender } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface ProfileSeedData {
  email: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: Date;
  city: string;
  profession: string;
  bio: string;
  synthesis: string;
  keyValues: string[];
  needsList: string[];
  redFlags: string[];
  maturityScore: number;
  alchemyScore: number;
}

async function main() {
  console.log('🧹 1. Nettoyage des anciennes propositions de match et journeys...');
  
  await prisma.harmonyResponse.deleteMany({}).catch(() => {});
  await prisma.harmonyQuestion.deleteMany({}).catch(() => {});
  await prisma.message.deleteMany({}).catch(() => {});
  await prisma.journey.deleteMany({}).catch(() => {});
  await prisma.matchProposal.deleteMany({}).catch(() => {});

  console.log('✅ Anciennes interactions supprimées.');

  const passwordHash = await bcrypt.hash('password123', 10);

  const femaleProfilesData: ProfileSeedData[] = [
    {
      email: 'lea@test.com',
      firstName: 'Léa',
      lastName: 'Martin',
      gender: Gender.F,
      birthDate: new Date('1997-04-12'),
      city: 'Lyon',
      profession: 'Médecin Généraliste',
      bio: 'Passionnée de médecine et de randonnée. Je recherche un partenaire équilibré pour construire un foyer chaleureux et sincère.',
      synthesis: 'Léa est une femme dévouée, structurée et profondément humaine. Elle valorise le respect, la communication transparente et le soutien mutuel au quotidien.',
      keyValues: ['Bienveillance', 'Engagement', 'Écoute'],
      needsList: ['Communication fluide', 'Stabilité émotionnelle', 'Projet de famille'],
      redFlags: ['Infidélité', 'Manque d\'écoute'],
      maturityScore: 0.92,
      alchemyScore: 0.88,
    },
    {
      email: 'amina.diop@gmail.com',
      firstName: 'Amina',
      lastName: 'Diop',
      gender: Gender.F,
      birthDate: new Date('1998-09-25'),
      city: 'Dakar',
      profession: 'Journaliste & Rédactrice',
      bio: 'Curieuse de nature, passionnée par les voyages, la culture et l\'écriture. Je recherche une belle connexion intellectuelle et de l\'authenticité.',
      synthesis: 'Amina est une personne vive, communicative et sincère. Elle cherche un égal capable de partager ses passions tout en respectant son autonomie.',
      keyValues: ['Sincérité', 'Culture', 'Famille'],
      needsList: ['Partage d\'idées', 'Voyages à deux', 'Honnêteté'],
      redFlags: ['Jalousie excessive', 'Hypocrisie'],
      maturityScore: 0.89,
      alchemyScore: 0.85,
    },
    {
      email: 'fatou.kone@gmail.com',
      firstName: 'Fatou',
      lastName: 'Koné',
      gender: Gender.F,
      birthDate: new Date('2000-02-14'),
      city: 'Abidjan',
      profession: 'Interne en Chirurgie',
      bio: 'Déterminée et attentionnée. J\'aime les moments simples en famille, la bonne cuisine et les discussions profondes au calme.',
      synthesis: 'Fatou est posée, mature et orientée vers un avenir stable. Elle place la loyauté et la bienveillance au cœur de son idéal amoureux.',
      keyValues: ['Foi & Spiritualité', 'Famille', 'Loyauté'],
      needsList: ['Soutien dans les études/carrière', 'Calme au foyer', 'Transparence'],
      redFlags: ['Superficialité', 'Instabilité'],
      maturityScore: 0.94,
      alchemyScore: 0.90,
    },
    {
      email: 'chloe.b@test.com',
      firstName: 'Chloé',
      lastName: 'Bernard',
      gender: Gender.F,
      birthDate: new Date('1995-11-05'),
      city: 'Bordeaux',
      profession: 'Designer UX / UI',
      bio: 'Formatrice et designer créative. J\'adore l\'art, l\'architecture et les projets à deux. Je cherche quelqu\'un d\'ambitieux et de chaleureux.',
      synthesis: 'Chloé allie esprit créatif et sens de l\'organisation. Elle cherche un partenaire inspirant avec qui construire un projet de vie stimulant.',
      keyValues: ['Créativité', 'Ambition', 'Transparence'],
      needsList: ['Projets communs', 'Liberté d\'expression', 'Voyages'],
      redFlags: ['Pessimisme', 'Fermeture d\'esprit'],
      maturityScore: 0.87,
      alchemyScore: 0.84,
    },
    {
      email: 'mariam.t@gmail.com',
      firstName: 'Mariam',
      lastName: 'Traoré',
      gender: Gender.F,
      birthDate: new Date('1996-07-18'),
      city: 'Bamako',
      profession: 'Entrepreneuse Tech',
      bio: 'Fondatrice d\'entreprise et passionnée d\'innovation. Je cherche un partenaire confiant, respectueux et prêt pour un engagement sérieux.',
      synthesis: 'Mariam est une leader visionnaire avec un grand cœur. Elle recherche un équilibre entre réussite professionnelle et complicité de couple.',
      keyValues: ['Leadership', 'Respect', 'Équité'],
      needsList: ['Compréhension du rythme', 'Confiance mutuelle', 'Partage d\'ambition'],
      redFlags: ['Machisme', 'Manque d\'ambition'],
      maturityScore: 0.95,
      alchemyScore: 0.91,
    },
    {
      email: 'sophie.d@test.com',
      firstName: 'Sophie',
      lastName: 'Dubois',
      gender: Gender.F,
      birthDate: new Date('1997-01-30'),
      city: 'Paris',
      profession: 'Avocate au Barreau',
      bio: 'Passionnée par le droit, la musique classique et la gastronomie. Je recherche un homme sincère, cultivé et engagé.',
      synthesis: 'Sophie est élégante, structurée et à l\'écoute. Elle valorise le dialogue constructif et la loyauté inconditionnelle.',
      keyValues: ['Justice', 'Élégance', 'Loyauté'],
      needsList: ['Dialogue intellectuel', 'Honnêteté stricte', 'Projet familial'],
      redFlags: ['Mensonge', 'Manque de parole'],
      maturityScore: 0.91,
      alchemyScore: 0.86,
    },
    {
      email: 'elena.r@test.com',
      firstName: 'Elena',
      lastName: 'Rossi',
      gender: Gender.F,
      birthDate: new Date('1996-06-08'),
      city: 'Nice',
      profession: 'Ingénieure Data & IA',
      bio: 'Esprit scientifique passionnée de mer et de photographie. Je cherche une belle rencontre authentique sans prise de tête.',
      synthesis: 'Elena allie rigueur intellectuelle et douceur de vivre. Elle cherche un partenaire bienveillant avec qui explorer le monde.',
      keyValues: ['Curiosité', 'Sérénité', 'Nature'],
      needsList: ['Équilibre vie pro/perso', 'Rires et légèreté', 'Réciprocité'],
      redFlags: ['Prise de tête inutile', 'Possessivité'],
      maturityScore: 0.88,
      alchemyScore: 0.85,
    },
  ];

  const maleProfilesData: ProfileSeedData[] = [
    {
      email: 'thomas@test.com',
      firstName: 'Thomas',
      lastName: 'Dupont',
      gender: Gender.H,
      birthDate: new Date('1997-05-15'),
      city: 'Paris',
      profession: 'Architecte DPLG',
      bio: 'Bâtir ensemble sur des fondations solides. Passionné de design, de voyages et de sport. Je cherche une relation vraie et durable.',
      synthesis: 'Thomas est un profil très orienté projet. Il aime structurer son avenir tout en gardant une place importante pour la spontanéité et la découverte.',
      keyValues: ['Loyauté', 'Créativité', 'Partage'],
      needsList: ['Équilibre vie pro/perso', 'Voyages à deux', 'Confiance mutuelle'],
      redFlags: ['Tromperie', 'Fermeture d\'esprit'],
      maturityScore: 0.90,
      alchemyScore: 0.86,
    },
    {
      email: 'sam.kouassi@gmail.com',
      firstName: 'Sam',
      lastName: 'Kouassi',
      gender: Gender.H,
      birthDate: new Date('1995-08-20'),
      city: 'Abidjan',
      profession: 'Développeur & Entrepreneur',
      bio: 'Passionné de technologie et de musique. Je cherche une femme sincère, ambitieuse et ouverte d\'esprit pour fonder un foyer.',
      synthesis: 'Sam est un homme ambitieux et bienveillant. Il valorise la communication directe, l\'entraide et la construction d\'un foyer solide.',
      keyValues: ['Ambition', 'Technologie', 'Famille'],
      needsList: ['Sincérité', 'Soutien mutuel', 'Projet de famille'],
      redFlags: ['Hypocrisie', 'Manipulations'],
      maturityScore: 0.93,
      alchemyScore: 0.89,
    },
    {
      email: 'alexandre.m@test.com',
      firstName: 'Alexandre',
      lastName: 'Moreau',
      gender: Gender.H,
      birthDate: new Date('1994-03-11'),
      city: 'Lyon',
      profession: 'Chef d\'Entreprise',
      bio: 'Écurie de passionnés et d\'aventures. J\'aime la gastronomie, le tennis et la sérénité du foyer. Je cherche une partenaire de vie.',
      synthesis: 'Alexandre est posé, structuré et très protecteur. Il recherche une relation équilibrée fondée sur le respect et l\'élégance.',
      keyValues: ['Respect', 'Équilibre', 'Générosité'],
      needsList: ['Communication sereine', 'Moments complices', 'Confiance'],
      redFlags: ['Désinvolture', 'Superficialité'],
      maturityScore: 0.91,
      alchemyScore: 0.87,
    },
    {
      email: 'lucas.p@test.com',
      firstName: 'Lucas',
      lastName: 'Petit',
      gender: Gender.H,
      birthDate: new Date('1998-10-04'),
      city: 'Bordeaux',
      profession: 'Designer Produit',
      bio: 'Amoureux d\'art, d\'océan et de gastronomie. Je cherche une compagne dynamique et curieuse pour écrire une belle histoire.',
      synthesis: 'Lucas est spontané, créatif et très à l\'écoute. Il apporte de la légèreté et un soutien indéfectible au quotidien.',
      keyValues: ['Spontanéité', 'Écoute', 'Authenticité'],
      needsList: ['Rires partagés', 'Espaces de liberté', 'Honnêteté'],
      redFlags: ['Rigidité', 'Prise de tête'],
      maturityScore: 0.87,
      alchemyScore: 0.84,
    },
    {
      email: 'david.b@gmail.com',
      firstName: 'David',
      lastName: 'Benali',
      gender: Gender.H,
      birthDate: new Date('1995-12-19'),
      city: 'Dakar',
      profession: 'Ingénieur Financier',
      bio: 'Esprit analytique mais cœur généreux. J\'aime les voyages, la lecture et la cuisine du monde. En quête d\'un amour sincère.',
      synthesis: 'David est un homme fiable et réfléchi. Il cherche une relation solide avec une partenaire ambitieuse et bienveillante.',
      keyValues: ['Rigueur', 'Famille', 'Loyauté'],
      needsList: ['Projets à deux', 'Transparence', 'Stabilité'],
      redFlags: ['Infidélité', 'Lâcheté'],
      maturityScore: 0.92,
      alchemyScore: 0.88,
    },
    {
      email: 'kevin.d@gmail.com',
      firstName: 'Kevin',
      lastName: 'Diallo',
      gender: Gender.H,
      birthDate: new Date('1999-07-22'),
      city: 'Abidjan',
      profession: 'Consultant Management',
      bio: 'Dynamique et optimiste. J\'aime le basket, la musique et le développement personnel. Prêt pour un engagement vrai.',
      synthesis: 'Kevin est énergique, positif et orienté solution. Il cherche une compagne complice avec qui avancer main dans la main.',
      keyValues: ['Énergie', 'Complicité', 'Sincérité'],
      needsList: ['Partage d\'énergie', 'Communication', 'Soutien'],
      redFlags: ['Pessimisme', 'Discrédit'],
      maturityScore: 0.88,
      alchemyScore: 0.85,
    },
    {
      email: 'julien.m@test.com',
      firstName: 'Julien',
      lastName: 'Mercier',
      gender: Gender.H,
      birthDate: new Date('1993-01-14'),
      city: 'Paris',
      profession: 'Avocat d\'Affaires',
      bio: 'Passionné de culture, d\'histoire et d\'œnologie. Je recherche une femme cultivée, élégante et sincère pour un projet durable.',
      synthesis: 'Julien est cultivé, posé et très exigeant sur ses valeurs. Il offre une stabilité et une profondeur relationnelle rares.',
      keyValues: ['Profondeur', 'Stabilité', 'Élégance'],
      needsList: ['Échanges intellectuels', 'Foyer serein', 'Fidélité'],
      redFlags: ['Mensonge', 'Volatilité'],
      maturityScore: 0.95,
      alchemyScore: 0.90,
    },
  ];

  const allProfiles = [...femaleProfilesData, ...maleProfilesData];

  console.log(`🌱 2. Création de ${allProfiles.length} profils uniques (${femaleProfilesData.length} femmes, ${maleProfilesData.length} hommes)...`);

  for (const item of allProfiles) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        accountStatus: 'actif',
        city: item.city,
        gender: item.gender,
      },
      create: {
        email: item.email,
        passwordHash,
        firstName: item.firstName,
        lastName: item.lastName,
        birthDate: item.birthDate,
        gender: item.gender,
        city: item.city,
        accountStatus: 'actif',
        isVerified: true,
        creditBalance: 50,
      },
    });

    await prisma.profile.upsert({
      where: { userId: user.id },
      update: {
        description: item.bio,
        displayedCity: item.city,
        profession: item.profession,
        profileStatus: 'complet',
      },
      create: {
        userId: user.id,
        description: item.bio,
        displayedCity: item.city,
        profession: item.profession,
        profileStatus: 'complet',
      },
    });

    const interview = await prisma.interviewIA.create({
      data: {
        userId: user.id,
        status: 'termine',
        version: 1,
      },
    });

    await prisma.mentalMap.create({
      data: {
        userId: user.id,
        interviewId: interview.id,
        synthesis: item.synthesis,
        bio: item.bio,
        needsList: item.needsList,
        redFlags: item.redFlags,
        keyValues: item.keyValues,
        maturityScore: item.maturityScore,
        alchemyScore: item.alchemyScore,
        version: 1,
      },
    });

    console.log(` ✨ Profil ${item.gender === Gender.F ? 'Femme' : 'Homme'} créé/mis à jour : ${item.firstName} (${item.profession} à ${item.city})`);
  }

  console.log(`🎉 Seed terminé avec succès ! ${femaleProfilesData.length} profils femmes et ${maleProfilesData.length} profils hommes sont prêts.`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
