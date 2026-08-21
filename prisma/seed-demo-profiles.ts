import { PrismaClient, Gender, UserRole, AccountStatus, ProfileStatus, InterviewStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Nettoyage complet de la base de données...');

  await prisma.harmonyResponse.deleteMany({}).catch(() => {});
  await prisma.notification.deleteMany({}).catch(() => {});
  await prisma.report.deleteMany({}).catch(() => {});
  await prisma.message.deleteMany({}).catch(() => {});
  await prisma.creditTransaction.deleteMany({}).catch(() => {});
  await prisma.journey.deleteMany({}).catch(() => {});
  await prisma.matchProposal.deleteMany({}).catch(() => {});
  await prisma.mentalMap.deleteMany({}).catch(() => {});
  await prisma.moduleResponse.deleteMany({}).catch(() => {});
  await prisma.interviewIA.deleteMany({}).catch(() => {});
  await prisma.profile.deleteMany({}).catch(() => {});
  await prisma.user.deleteMany({}).catch(() => {});

  console.log('✅ Base de données nettoyée avec succès.');
  console.log('🌱 Création des 4 profils de démonstration ultra-réalistes avec leurs Cartes Mentales IA...');

  const defaultPassword = await bcrypt.hash('Boligo2026!', 10);

  // ─── 1. Aïcha Diallo (Femme, 28 ans - Paris) ───────────────────
  await prisma.user.create({
    data: {
      email: 'aicha.diallo@boligo.demo',
      passwordHash: defaultPassword,
      firstName: 'Aïcha',
      lastName: 'Diallo',
      birthDate: new Date('1998-03-14'),
      gender: Gender.F,
      city: 'Paris, France',
      telephone: '+33612345678',
      role: UserRole.USER,
      accountStatus: AccountStatus.actif,
      isVerified: true,
      creditBalance: 100,
      profile: {
        create: {
          displayedCity: 'Paris 8e',
          profession: 'Consultante en Stratégie',
          description: "Ambitieuse et profondément attachée à l'authenticité. Je cherche un homme avec de la conversation, des valeurs solides et l'envie de construire un foyer épanoui.",
          mainPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
          secondaryPhotos: [
            'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
          ],
          profileStatus: ProfileStatus.complet,
        },
      },
      interviews: {
        create: {
          status: InterviewStatus.termine,
          mentalMap: {
            create: {
              userId: 'placeholder', // Overwritten by nested relation or handled below
              synthesis: "Aïcha allie une grande maturité professionnelle et une sensibilité relationnelle exigeante. Elle privilégie la transparence financière, le respect mutuel et le dialogue continu.",
              needsList: ['Respect de son autonomie intellectuelle', 'Projet familial clair', 'Communication sans détour', 'Affection et présence'],
              keyValues: ['Honnêteté', 'Ambition partagée', 'Équité financière', 'Spiritualité'],
              redFlags: ['Ghosting et passivité', 'Manque d\'ambition', 'Infidélité', 'Ingérence excessive'],
              maturityScore: 0.92,
              alchemyScore: 0.88,
              version: 1,
            },
          },
        },
      },
    },
  }).catch(async () => {
    // Si la création imbriquée user-interview-mentalMap a besoin du userId explicite :
    const u = await prisma.user.create({
      data: {
        email: 'aicha.diallo@boligo.demo',
        passwordHash: defaultPassword,
        firstName: 'Aïcha',
        lastName: 'Diallo',
        birthDate: new Date('1998-03-14'),
        gender: Gender.F,
        city: 'Paris, France',
        telephone: '+33612345678',
        role: UserRole.USER,
        accountStatus: AccountStatus.actif,
        isVerified: true,
        creditBalance: 100,
        profile: {
          create: {
            displayedCity: 'Paris 8e',
            profession: 'Consultante en Stratégie',
            description: "Ambitieuse et profondément attachée à l'authenticité. Je cherche un homme avec de la conversation, des valeurs solides et l'envie de construire un foyer épanoui.",
            mainPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
            profileStatus: ProfileStatus.complet,
          },
        },
      },
    });

    const itw = await prisma.interviewIA.create({
      data: {
        userId: u.id,
        status: InterviewStatus.termine,
      },
    });

    await prisma.mentalMap.create({
      data: {
        userId: u.id,
        interviewId: itw.id,
        synthesis: "Aïcha allie une grande maturité professionnelle et une sensibilité relationnelle exigeante. Elle privilégie la transparence financière, le respect mutuel et le dialogue continu.",
        needsList: ['Respect de son autonomie intellectuelle', 'Projet familial clair', 'Communication sans détour', 'Affection et présence'],
        keyValues: ['Honnêteté', 'Ambition partagée', 'Équité financière', 'Spiritualité'],
        redFlags: ['Ghosting et passivité', 'Manque d\'ambition', 'Infidélité', 'Ingérence excessive'],
        maturityScore: 0.92,
        alchemyScore: 0.88,
      },
    });
  });

  // ─── 2. Grace Kouassi (Femme, 27 ans - Abidjan) ─────────────────
  const grace = await prisma.user.create({
    data: {
      email: 'grace.kouassi@boligo.demo',
      passwordHash: defaultPassword,
      firstName: 'Grace',
      lastName: 'Kouassi',
      birthDate: new Date('1999-07-22'),
      gender: Gender.F,
      city: 'Abidjan, Côte d\'Ivoire',
      telephone: '+2250701020304',
      role: UserRole.USER,
      accountStatus: AccountStatus.actif,
      isVerified: true,
      creditBalance: 100,
      profile: {
        create: {
          displayedCity: 'Cocody, Abidjan',
          profession: 'Architecte d’Intérieur',
          description: "Créative et solaire, j'aime les projets stimulants, les voyages et les dîners en tête-à-tête. Je crois au mariage basé sur la complicité et la confiance totale.",
          mainPhoto: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=800&q=80',
          profileStatus: ProfileStatus.complet,
        },
      },
    },
  });

  const itwGrace = await prisma.interviewIA.create({
    data: { userId: grace.id, status: InterviewStatus.termine },
  });

  await prisma.mentalMap.create({
    data: {
      userId: grace.id,
      interviewId: itwGrace.id,
      synthesis: "Grace recherche un partenaire protecteur, bienveillant et résolument orienté vers l'avenir. Elle attache une grande importance à l'harmonie familiale et aux projets créatifs.",
      needsList: ['Soutien dans ses projets', 'Temps de qualité partagé', 'Sécurité affective', 'Humour et légèreté'],
      keyValues: ['Bienveillance', 'Famille', 'Créativité', 'Loyauté'],
      redFlags: ['Agressivité verbale', 'Égoïsme', 'Fermeture d\'esprit', 'Manque de projets'],
      maturityScore: 0.89,
      alchemyScore: 0.94,
    },
  });

  // ─── 3. Malik Traoré (Homme, 31 ans - Lyon) ────────────────────
  const malik = await prisma.user.create({
    data: {
      email: 'malik.traore@boligo.demo',
      passwordHash: defaultPassword,
      firstName: 'Malik',
      lastName: 'Traoré',
      birthDate: new Date('1995-11-05'),
      gender: Gender.H,
      city: 'Lyon, France',
      telephone: '+33698765432',
      role: UserRole.USER,
      accountStatus: AccountStatus.actif,
      isVerified: true,
      creditBalance: 100,
      profile: {
        create: {
          displayedCity: 'Lyon 6e',
          profession: 'Lead Tech / Ingénieur Logiciel',
          description: "Posé, curieux et sportif. J'apprécie les échanges profonds, la bonne gastronomie et les relations saines où chacun tire l'autre vers le haut.",
          mainPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
          profileStatus: ProfileStatus.complet,
        },
      },
    },
  });

  const itwMalik = await prisma.interviewIA.create({
    data: { userId: malik.id, status: InterviewStatus.termine },
  });

  await prisma.mentalMap.create({
    data: {
      userId: malik.id,
      interviewId: itwMalik.id,
      synthesis: "Malik se distingue par un tempérament réfléchi, une écoute active et une volonté ferme de co-construire. Son approche relationnelle est basée sur le partenariat d'égal à égal.",
      needsList: ['Stabilité émotionnelle', 'Stimulation intellectuelle', 'Respect de ses engagements', 'Sport et hygiène de vie'],
      keyValues: ['Intégrité', 'Partage équitable', 'Esprit d\'équipe', 'Évolution personnelle'],
      redFlags: ['Jeux psychologiques', 'Instabilité chronique', 'Manque de clarté', 'Trahison'],
      maturityScore: 0.95,
      alchemyScore: 0.86,
    },
  });

  // ─── 4. Ibrahima Ndiaye (Homme, 30 ans - Dakar) ────────────────
  const ibrahima = await prisma.user.create({
    data: {
      email: 'ibrahima.ndiaye@boligo.demo',
      passwordHash: defaultPassword,
      firstName: 'Ibrahima',
      lastName: 'Ndiaye',
      birthDate: new Date('1996-05-18'),
      gender: Gender.H,
      city: 'Dakar, Sénégal',
      telephone: '+221771234567',
      role: UserRole.USER,
      accountStatus: AccountStatus.actif,
      isVerified: true,
      creditBalance: 100,
      profile: {
        create: {
          displayedCity: 'Almadies, Dakar',
          profession: 'Entrepreneur Export & Agri-Tech',
          description: "Passionné par le développement de l'Afrique et les relations vraies. Je cherche une femme d'esprit, élégante et investie pour fonder une belle famille.",
          mainPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
          profileStatus: ProfileStatus.complet,
        },
      },
    },
  });

  const itwIbrahima = await prisma.interviewIA.create({
    data: { userId: ibrahima.id, status: InterviewStatus.termine },
  });

  await prisma.mentalMap.create({
    data: {
      userId: ibrahima.id,
      interviewId: itwIbrahima.id,
      synthesis: "Ibrahima a une vision claire du leadership partagé au sein du couple. Il valorise l'élégance du dialogue, la fidélité et la vision à long terme.",
      needsList: ['Complicité dans le projet de vie', 'Soutien mutuel', 'Transmission et éducation', 'Valeurs spirituelles'],
      keyValues: ['Honneur', 'Générosité', 'Spiritualité', 'Vision long terme'],
      redFlags: ['Matérialisme excessif', 'Manque de respect de la famille', 'Mensonge', 'Inconstance'],
      maturityScore: 0.91,
      alchemyScore: 0.90,
    },
  });

  console.log('🎉 4 Profils de démonstration ultra-réalistes créés :');
  console.log('1. Aïcha Diallo (Femme, 28 ans - Paris - Consultante en Stratégie)');
  console.log('2. Grace Kouassi (Femme, 27 ans - Abidjan - Architecte d’Intérieur)');
  console.log('3. Malik Traoré (Homme, 31 ans - Lyon - Lead Tech / Ingénieur Logiciel)');
  console.log('4. Ibrahima Ndiaye (Homme, 30 ans - Dakar - Entrepreneur)');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed :', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
