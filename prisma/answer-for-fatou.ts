import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const fatou = await prisma.user.findUnique({
    where: { email: 'fatou.kone@gmail.com' },
  });

  if (!fatou) {
    console.error('Fatou introuvable.');
    return;
  }

  // Trouver le journey actif de Fatou
  const journey = await prisma.journey.findFirst({
    where: {
      OR: [
        { userAId: fatou.id },
        { userBId: fatou.id },
      ],
    },
    include: {
      harmonyQuestions: {
        include: {
          responses: true,
        },
        orderBy: { day: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!journey) {
    console.error('Aucun journey trouvé pour Fatou.');
    return;
  }

  console.log(`📍 Journey trouvé : ${journey.id} (Étape : ${journey.currentStep})`);

  // Si aucune question n'est créée dans le journey, créons les questions des 3 jours
  if (journey.harmonyQuestions.length === 0) {
    console.log('🌱 Création des questions du Sondeur pour ce journey...');
    const defaultQuestions = [
      {
        day: 1,
        theme: 'Lignes rouges',
        emoji: '🚩',
        questionText: 'L\'infidélité est-elle un point de non-retour pour toi ?',
        options: ['Jamais pardonnable, c\'est terminé', 'Une seule erreur peut être comprise', 'Ça dépend du contexte et de la sincérité', 'Autre...'],
      },
      {
        day: 1,
        theme: 'Lignes rouges',
        emoji: '🚩',
        questionText: 'Quel mensonge ne pardonnerais-tu jamais dans le couple ?',
        options: ['Mentir sur ses sentiments', 'Cacher des dettes / mensonges financiers', 'Mentir sur son passé (enfants, mariage)', 'Autre...'],
      },
      {
        day: 2,
        theme: 'Valeurs profondes',
        emoji: '⚖️',
        questionText: 'Si ton partenaire change de religion ou devient athée, tu fais quoi ?',
        options: ['Ça ne change rien, je l\'aime pour qui il/elle est', 'C\'est difficile mais on peut discuter', 'C\'est un problème grave pour notre avenir', 'Autre...'],
      },
      {
        day: 2,
        theme: 'Valeurs profondes',
        emoji: '⚖️',
        questionText: 'Ta belle-mère / beau-père déteste ton conjoint. Tu choisis qui ?',
        options: ['Mon conjoint, toujours. On construit notre vie ensemble', 'J\'essaie de concilier les deux sans trahir personne', 'La famille avant tout, même si ça fait mal', 'Autre...'],
      },
      {
        day: 3,
        theme: 'Futur & Sacrifices',
        emoji: '🔮',
        questionText: 'Ton partenaire te dit qu\'il/elle ne veut plus d\'enfants après 2 ans de relation. Réaction ?',
        options: ['C\'est un dealbreaker, je veux fonder une famille', 'On discute pour comprendre le pourquoi', 'L\'amour passe avant tout, même sans enfants', 'Autre...'],
      },
      {
        day: 3,
        theme: 'Futur & Sacrifices',
        emoji: '🔮',
        questionText: 'Pour la carrière de ton conjoint, tu dois quitter ton pays, tes amis, ta famille. Tu acceptes ?',
        options: ['Sans hésiter, l\'amour est plus fort', 'Seulement si on en discute et que c\'est réciproque', 'Non, je ne sacrifierai jamais ma vie pour quelqu\'un', 'Autre...'],
      },
    ];

    for (const q of defaultQuestions) {
      await prisma.harmonyQuestion.create({
        data: {
          journeyId: journey.id,
          day: q.day,
          theme: q.theme,
          emoji: q.emoji,
          questionText: q.questionText,
          options: q.options,
        },
      });
    }
  }

  // Recharger les questions
  const refreshedJourney = await prisma.journey.findUnique({
    where: { id: journey.id },
    include: {
      harmonyQuestions: {
        include: {
          responses: true,
        },
        orderBy: { day: 'asc' },
      },
    },
  });

  if (!refreshedJourney) return;

  // Réponses sincères et profondes préparées pour Fatou
  const fatouAnswersMap: Record<number, string[]> = {
    1: [
      'Jamais pardonnable, c\'est terminé. La fidélité et la loyauté sont le socle absolu d\'une relation durable.',
      'Cacher des dettes ou des engagements passés. La transparence financière et morale est non-négociable.',
    ],
    2: [
      'C\'est difficile mais on peut discuter. Le respect des convictions de chacun est essentiel.',
      'Mon conjoint, toujours. Quand on fonde son foyer, la priorité absolue va au couple.',
    ],
    3: [
      'C\'est un dealbreaker, je veux fonder une famille et transmettre nos valeurs à des enfants.',
      'Seulement si on en discute et que c\'est un projet commun mûrement réfléchi.',
    ],
  };

  for (const q of refreshedJourney.harmonyQuestions) {
    const existingResponse = q.responses.find(r => r.userId === fatou.id);
    if (!existingResponse) {
      const dayAnswers = fatouAnswersMap[q.day] || ['Je privilégie le dialogue et le respect mutuel.'];
      // Trouver l'index de la question du jour
      const qIndexForDay = refreshedJourney.harmonyQuestions.filter(item => item.day === q.day).findIndex(item => item.id === q.id);
      const answerText = dayAnswers[qIndexForDay] || dayAnswers[0];

      await prisma.harmonyResponse.create({
        data: {
          questionId: q.id,
          userId: fatou.id,
          responseText: answerText,
        },
      });
      console.log(`✅ [Jour ${q.day}] Réponse de Fatou enregistrée : « ${answerText} »`);
    } else {
      console.log(`ℹ️ [Jour ${q.day}] Fatou a déjà répondu : « ${existingResponse.responseText} »`);
    }
  }

  console.log('🎉 Toutes les réponses de Fatou ont été enregistrées avec succès !');
}

main()
  .catch((e) => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
