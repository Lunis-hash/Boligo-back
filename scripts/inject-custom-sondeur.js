const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const journeyId = '661f3dfc-92a7-4ef3-b5b0-9c6464098522';

  // 1. Supprimer les anciennes questions par défaut
  const deletedResp = await prisma.harmonyResponse.deleteMany({
    where: { question: { journeyId } },
  });
  const deletedQs = await prisma.harmonyQuestion.deleteMany({
    where: { journeyId },
  });
  console.log(`🧹 Nettoyé : ${deletedQs.count} questions génériques supprimées.`);

  // 2. Créer les 6 questions HARD MODE ultra-ciblées sur les Red Flags et Désaccords de Samuel & Aïcha
  const tailoredQuestions = [
    // JOUR 1 : LIGNES ROUGES & TRANSPARENCE
    {
      journeyId,
      day: 1,
      theme: 'Lignes rouges',
      emoji: '🚩',
      questionText: "Si après 6 mois de relation tu découvres que ton partenaire a contracté des dettes importantes sans t'en parler pour envoyer de l'argent à des proches, comment réagis-tu ?",
      options: [
        "Rupture immédiate : le manque de transparence financière est un dealbreaker absolu",
        "Je demande des comptes clairs et j'exige un plan de remboursement avant de continuer",
        "Je pardonne si l'intention était sincère, mais on fixe des règles financières strictes",
        "Autre...",
      ],
      sentAt: new Date(Date.now() - 2000),
    },
    {
      journeyId,
      day: 1,
      theme: 'Lignes rouges',
      emoji: '🔥',
      questionText: "Face à une période de crise, ton partenaire s'isole, ne répond plus à tes messages pendant plusieurs jours (ghosting) et fuit la discussion. Quelle est ta limite ?",
      options: [
        "Inacceptable : le silence et la fuite détruisent la confiance, je mets fin à la relation",
        "Je lui laisse 48h pour s'expliquer, puis j'impose un dialogue en face à face",
        "Je comprends qu'il/elle ait besoin d'espace et j'attends qu'il/elle revienne vers moi",
        "Autre...",
      ],
      sentAt: new Date(Date.now() - 1000),
    },

    // JOUR 2 : VALEURS & INGÉRENCE FAMILIALE
    {
      journeyId,
      day: 2,
      theme: 'Valeurs profondes',
      emoji: '⚖️',
      questionText: "Dans le couple, si la femme gagne nettement plus ou finance la majorité des charges du foyer, comment envisagez-vous l'équilibre et la prise de décision ?",
      options: [
        "Équité totale : les décisions et le respect sont égaux quel que soit le salaire de chacun",
        "Celui qui gagne le plus doit avoir le dernier mot sur les grands investissements",
        "Les rôles traditionnels doivent être respectés malgré la différence de revenus",
        "Autre...",
      ],
      sentAt: new Date(),
    },
    {
      journeyId,
      day: 2,
      theme: 'Valeurs profondes',
      emoji: '💔',
      questionText: "La famille de ton conjoint s'immisce dans vos décisions de couple (finances, mariage, choix de vie) et exige d'avoir son mot à dire. Tu choisis quelle posture ?",
      options: [
        "Priorité absolue au couple : les limites avec la belle-famille doivent être fermes et étanches",
        "On écoute les aînés par respect mais on décide seuls en privé",
        "La famille passe toujours en premier dans les décisions importantes",
        "Autre...",
      ],
      sentAt: new Date(Date.now() + 1000),
    },

    // JOUR 3 : FUTUR, INTIMITÉ & AMBITION
    {
      journeyId,
      day: 3,
      theme: 'Futur & Intimité',
      emoji: '🔮',
      questionText: "Si après plusieurs mois l'un de vous ressent une baisse de désir ou une frustration dans l'intimité physique et émotionnelle, comment abordez-vous le sujet ?",
      options: [
        "Discussion directe et bienveillante sans tabou pour réajuster nos attentes mutuelles",
        "On consulte un spécialiste ou conseiller conjugal si le blocage persiste",
        "J'attends que la situation s'améliore d'elle-même avec le temps",
        "Autre...",
      ],
      sentAt: new Date(Date.now() + 2000),
    },
    {
      journeyId,
      day: 3,
      theme: 'Futur & Ambition',
      emoji: '🚀',
      questionText: "Une opportunité professionnelle exceptionnelle se présente pour l'un de vous, mais elle impose de déménager ou de vivre à distance pendant 1 an. Quelle est votre décision ?",
      options: [
        "On soutient l'ambition de l'autre et on part ensemble ou on s'adapte sans hésiter",
        "On privilégie la stabilité de notre vie de couple actuelle à Abidjan",
        "La distance est un risque trop grand pour notre relation : je refuse",
        "Autre...",
      ],
      sentAt: new Date(Date.now() + 3000),
    },
  ];

  for (const q of tailoredQuestions) {
    const created = await prisma.harmonyQuestion.create({ data: q });
    console.log(`✨ Jour ${created.day} : "${created.questionText.slice(0, 50)}..."`);
  }

  console.log('🎉 6 QUESTIONS HARD MODE PERSONNALISÉES IMPLANTÉES DANS LE PARCOURS !');
}

main().catch(console.error).finally(() => prisma.$disconnect());
