import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trouver le dernier utilisateur inscrit (qui n'est pas un bot demo)
  const users = await prisma.user.findMany({
    where: { email: { not: { contains: 'boligo.demo' } } },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  if (users.length === 0) {
    console.log('Aucun utilisateur réel trouvé.');
    return;
  }

  const me = users[0];
  console.log(`Utilisateur trouvé : ${me.firstName} (${me.email})`);

  // Trouver un profil demo de sexe opposé
  const targetGender = me.gender === 'H' ? 'F' : 'H';
  const demoUsers = await prisma.user.findMany({
    where: { email: { contains: 'boligo.demo' }, gender: targetGender },
    take: 1
  });

  if (demoUsers.length === 0) {
    console.log('Aucun profil de demo de sexe opposé trouvé.');
    return;
  }

  const partner = demoUsers[0];
  console.log(`Partenaire de match trouvé : ${partner.firstName}`);

  // Vérifier si un match existe déjà
  const existingMatch = await prisma.matchProposal.findFirst({
    where: {
      OR: [
        { sourceUserId: me.id, targetUserId: partner.id },
        { sourceUserId: partner.id, targetUserId: me.id }
      ]
    }
  });

  if (existingMatch) {
    console.log('Match déjà existant, mise à jour à acceptee...');
    await prisma.matchProposal.update({
      where: { id: existingMatch.id },
      data: { status: 'acceptee' }
    });
  } else {
    console.log('Création du match...');
    const match = await prisma.matchProposal.create({
      data: {
        sourceUserId: me.id,
        targetUserId: partner.id,
        status: 'acceptee',
        compatibilityScore: 0.85,
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        weekNumber: 1
      }
    });

    console.log('Création du parcours (Journey)...');
    await prisma.journey.create({
      data: {
        userAId: me.id,
        userBId: partner.id,
        currentStep: 'phase_harmonie',
        proposalId: match.id
      }
    });
    console.log('✅ Parcours créé avec succès. Retournez sur l\'application !');
  }
}

main().finally(() => prisma.$disconnect());
