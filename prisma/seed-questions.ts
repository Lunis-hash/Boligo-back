import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SONDEUR_DAYS = [
  {
    day: 1,
    theme: 'Lignes rouges',
    emoji: '🚩',
    questions: [
      {
        question: "L'infidélité est-elle un point de non-retour pour toi ?",
      },
      {
        question: "Quel mensonge ne pardonnerais-tu jamais dans le couple ?",
      },
    ],
  },
  {
    day: 2,
    theme: 'Valeurs profondes',
    emoji: '⚖️',
    questions: [
      {
        question: "Si ton partenaire change de religion ou devient athée, tu fais quoi ?",
      },
      {
        question: "Ta belle-mère / beau-père déteste ton conjoint. Tu choisis qui ?",
      },
    ],
  },
  {
    day: 3,
    theme: 'Futur & Sacrifices',
    emoji: '🔮',
    questions: [
      {
        question: "Ton partenaire te dit qu'il/elle ne veut plus d'enfants après 2 ans de relation. Réaction ?",
      },
      {
        question: "Pour la carrière de ton conjoint, tu dois quitter ton pays, tes amis, ta famille. Tu acceptes ?",
      },
    ],
  },
];

async function main() {
  console.log('🌱 Génération des questions du parcours...');

  const samuel = await prisma.user.findUnique({ where: { email: 'samuel@boligo.com' } });
  const amelie = await prisma.user.findUnique({ where: { email: 'amelie@boligo.com' } });

  if (!samuel || !amelie) {
    console.error('Samuel ou Amélie introuvable');
    return;
  }

  const journey = await prisma.journey.findFirst({
    where: {
      OR: [
        { userAId: samuel.id, userBId: amelie.id },
        { userAId: amelie.id, userBId: samuel.id }
      ]
    },
    include: { harmonyQuestions: true }
  });

  if (!journey) {
    console.error('Aucun parcours trouvé entre Samuel et Amélie');
    return;
  }

  if (journey.harmonyQuestions.length > 0) {
    console.log('Les questions existent déjà pour ce parcours, suppression et recréation...');
    await prisma.harmonyQuestion.deleteMany({
      where: { journeyId: journey.id }
    });
  }

  const questionsToCreate: any[] = [];
  for (const day of SONDEUR_DAYS) {
    for (const q of day.questions) {
      questionsToCreate.push({
        journeyId: journey.id,
        day: day.day,
        theme: day.theme,
        emoji: day.emoji,
        questionText: q.question,
      });
    }
  }

  await prisma.harmonyQuestion.createMany({
    data: questionsToCreate
  });

  console.log('✅ Questions ajoutées avec succès pour Samuel et Amélie !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
