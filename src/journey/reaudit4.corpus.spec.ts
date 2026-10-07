/**
 * Corpus du quatrième contre-audit : filtres de lecture, de question et
 * d'extrait, sur des phrases nouvelles (sur-blocage et contournements).
 */
import { isWellFormedQuestion } from './clinical-lens';
import { AnsweredItem, parseDayReading, readingText } from './sondeur-insights';

const names: [string, string] = ['Awa', 'Karim'];
const ownA =
  "J'ai peur de manquer d'argent. Le mariage idéal se fait devant Dieu. Je ne suis pas jalouse. Je montre mon affection par des petits plats. Je reste vigilante avec l'argent. Au fond du cœur je veux une grande famille.";
const ownB =
  "Une parole blessante me pousse à me retirer. Ma foi n'est pas compatible avec l'alcool. Mon père était rigide sur les horaires. L'argent est une source de conflits dans ma famille. Un appel le soir est rassurant.";
const own: [string, string] = [ownA, ownB];

type Case = { text: string; good: boolean; note: string };
const READINGS: Case[] = [
  // --- bonnes lectures (doivent passer) ---
  {
    good: true,
    note: 'rapport simple',
    text: "Awa écrit qu'elle aime recevoir sa famille chaque dimanche, Karim parle plutôt d'un dimanche au calme.",
  },
  {
    good: true,
    note: 'vous deux + évoquer',
    text: "Vous évoquez tous deux la prière du matin, l'un seul, l'autre en famille.",
  },
  {
    good: true,
    note: 'l’un / l’autre',
    text: "L'un de vous décrit une dispute réglée le soir même, l'autre écrit qu'il a besoin d'une nuit.",
  },
  {
    good: true,
    note: 'même mot',
    text: 'Vous employez tous les deux le mot « respect » : son sens concret reste à préciser.',
  },
  {
    good: true,
    note: 'non-négociable décrit tel quel',
    text: "Awa écrit vouloir des enfants dans les trois ans, Karim écrit qu'il n'en veut pas.",
  },
  {
    good: true,
    note: 'dot (culture)',
    text: "Karim écrit que la dot compte pour ses parents, Awa dit qu'elle en parlera avec ses oncles.",
  },
  {
    good: true,
    note: 'polygamie décrite',
    text: "Sur la polygamie, Karim écrit qu'il l'envisage et Awa écrit qu'elle la refuse.",
  },
  {
    good: true,
    note: 'émotion écrite par Awa',
    text: "Awa écrit avoir peur de manquer d'argent, Karim parle d'épargne.",
  },
  {
    good: true,
    note: 'émotion écrite par Karim',
    text: "Karim écrit qu'une parole blessante le pousse à se retirer.",
  },
  {
    good: true,
    note: 'point-virgule naturel',
    text: "Awa indique qu'elle aime sortir avec ses amies le samedi ; Karim préfère rester à la maison ce jour-là.",
  },
  {
    good: true,
    note: 'mot du membre : idéal',
    text: "Awa écrit que le mariage idéal se fait devant Dieu, Karim parle d'un mariage civil.",
  },
  {
    good: true,
    note: 'mot du membre : jalouse',
    text: "Awa écrit qu'elle n'est pas jalouse, Karim écrit qu'il aime avoir des nouvelles le soir.",
  },
  {
    good: true,
    note: 'mot du membre : compatible',
    text: "Karim écrit que sa foi n'est pas compatible avec l'alcool, Awa écrit qu'elle boit parfois un verre.",
  },
  {
    good: true,
    note: 'montre son affection (langage de l’amour)',
    text: "Awa écrit qu'elle montre son affection par des petits plats, Karim parle de mots doux.",
  },
  {
    good: true,
    note: 'mot du membre : vigilante',
    text: "Awa écrit qu'elle reste vigilante avec l'argent, Karim écrit qu'il aime se faire plaisir.",
  },
  {
    good: true,
    note: 'mot du membre : rigide',
    text: 'Karim écrit que son père était rigide sur les horaires, Awa décrit des horaires souples chez elle.',
  },
  {
    good: true,
    note: 'mot du membre : source de conflits',
    text: "Karim écrit que l'argent est une source de conflits dans sa famille, Awa n'en parle pas.",
  },
  {
    good: true,
    note: 'mot du membre : rassurant',
    text: "Karim écrit qu'un appel le soir est rassurant, Awa préfère un message court.",
  },
  {
    good: true,
    note: 'mot du membre : au fond du cœur',
    text: "Awa écrit qu'au fond du cœur elle veut une grande famille, Karim parle de deux enfants.",
  },
  {
    good: true,
    note: 'dépendance à Dieu : position',
    text: 'Vous écrivez tous deux que Dieu guidera le choix du conjoint.',
  },
  {
    good: true,
    note: 'famille élargie',
    text: 'Vous décrivez tous les deux la famille élargie comme un soutien au quotidien.',
  },
  {
    good: true,
    note: 'pourquoi pas une question',
    text: "Vous parlez tous deux de l'argent envoyé aux parents, avec des mots différents.",
  },
  {
    good: true,
    note: 'souhaite',
    text: "Karim souhaite vivre à Dakar, Awa écrit qu'elle veut rester à Abidjan.",
  },
  // --- mauvaises lectures (doivent être refusées) ---
  {
    good: false,
    note: 'arrangement NN + verbe de rapport',
    text: 'Vous écrivez tous deux sur la religion, et une solution serait que chacun prie de son côté.',
  },
  {
    good: false,
    note: 'arrangement NN (enfants)',
    text: 'Vous évoquez les enfants : vous pourriez commencer par un seul et voir ensuite.',
  },
  {
    good: false,
    note: 'émotion prêtée (non écrite)',
    text: "Karim écrit qu'il préfère le silence, sans doute par crainte du conflit.",
  },
  {
    good: false,
    note: 'prédiction',
    text: 'Vous évoquez la foi de la même manière, ce qui augure bien de la suite.',
  },
  {
    good: false,
    note: 'évaluation',
    text: 'Vous décrivez tous deux une famille soudée : une base très solide pour vous deux.',
  },
  {
    good: false,
    note: 'étiquette (manipulateur)',
    text: "Karim écrit qu'il garde l'argent, une attitude de manipulateur.",
  },
  {
    good: false,
    note: 'interprétation',
    text: "Awa écrit qu'elle aime le calme, ce qui dénote un besoin de contrôle.",
  },
  {
    good: false,
    note: 'conseil d’avenir',
    text: 'Vous écrivez des choses opposées sur les enfants : réfléchissez bien avant de continuer.',
  },
  {
    good: false,
    note: 'contrôle présenté comme négociable',
    text: "Karim écrit qu'il veut lire les messages d'Awa : à vous de voir jusqu'où chacun peut accepter.",
  },
  {
    good: false,
    note: 'affirmation sans rapport',
    text: 'Karim fuit les disputes et Awa les cherche.',
  },
];

const QUESTIONS: Case[] = [
  // bonnes questions
  {
    good: true,
    note: 'origine',
    text: "Qu'est-ce qui, dans votre famille, montrait qu'une dispute était terminée ?",
  },
  {
    good: true,
    note: 'scène',
    text: 'Comment aimeriez-vous partager les dimanches entre famille et moments à deux ?',
  },
  {
    good: true,
    note: 'même mot',
    text: 'Que veut dire, très concrètement, « respect » pour vous dans une journée ordinaire ?',
  },
  {
    good: true,
    note: 'aînés',
    text: 'Quelle place aimeriez-vous donner à vos parents dans les grandes décisions ?',
  },
  {
    good: true,
    note: 'échelle',
    text: 'De 0 à 10, quelle importance donnez-vous à la prière partagée ? Pourquoi pas un point de moins ?',
  },
  {
    good: true,
    note: 'foi',
    text: "Qu'aimeriez-vous que l'autre sache de votre façon de vivre la foi avant de vous rencontrer ?",
  },
  {
    good: true,
    note: 'circulaire',
    text: 'Comment un proche décrirait-il votre manière de faire la paix après une dispute ?',
  },
  {
    good: true,
    note: 'demande d’attention',
    text: "Quel petit geste du quotidien vous fait sentir que quelqu'un tient à vous ?",
  },
  {
    good: true,
    note: 'argent familial',
    text: "Dans votre famille, comment parlait-on de l'argent envoyé aux proches ?",
  },
  {
    good: true,
    note: 'dot',
    text: "Qu'est-ce que la dot représente pour votre famille, et pour vous ?",
  },
  {
    good: true,
    note: 'projection',
    text: 'Comment imaginez-vous un samedi ordinaire, dans trois ans, avec la famille élargie ?',
  },
  {
    good: true,
    note: 'transmission',
    text: 'Quelle tradition familiale aimeriez-vous transmettre, et pourquoi celle-là ?',
  },
  {
    good: true,
    note: 'apaisement',
    text: "Qu'est-ce qui vous aide à garder votre calme quand une discussion devient tendue ?",
  },
  {
    good: true,
    note: 'frontière',
    text: 'Où placez-vous la frontière entre confiance et surveillance ?',
  },
  {
    good: true,
    note: 'famille et religion',
    text: "Comment votre famille accueillerait-elle un conjoint d'une autre religion ?",
  },
  {
    good: true,
    note: 'cadeau',
    text: "Que ressentez-vous quand quelqu'un vous offre un cadeau sans raison ?",
  },
  {
    good: true,
    note: 'promesse',
    text: "D'après vous, qu'est-ce qui rend une promesse sacrée ?",
  },
  {
    good: true,
    note: 'aînés mariage',
    text: 'Quel rôle aimeriez-vous que vos aînés jouent dans votre mariage ?',
  },
  {
    good: true,
    note: 'confiance',
    text: "À quoi reconnaissez-vous qu'une personne est digne de confiance ?",
  },
  {
    good: true,
    note: 'tâches',
    text: 'Comment vos parents se partageaient-ils les tâches de la maison ?',
  },
  {
    good: true,
    note: 'besoin de solitude',
    text: "Comment savez-vous que vous avez besoin d'un moment à vous ?",
  },
  {
    good: true,
    note: 'patience',
    text: "Qu'avez-vous appris de vos grands-parents sur la patience dans un mariage ?",
  },
  // mauvaises
  {
    good: false,
    note: 'fermée',
    text: 'Êtes-vous prêt à vous convertir pour votre futur conjoint ?',
  },
  {
    good: false,
    note: 'montant',
    text: 'Combien envoyez-vous chaque mois à votre famille ?',
  },
  {
    good: false,
    note: 'contrôle mis en scène',
    text: 'Que ressentiriez-vous si quelqu’un lisait vos messages par amour ?',
  },
  {
    good: false,
    note: 'compromis',
    text: "Comment trouver un terrain d'entente sur la religion ?",
  },
  {
    good: false,
    note: 'tutoiement',
    text: "Pourquoi as-tu peur de t'engager ?",
  },
  {
    good: false,
    note: 'passé commun',
    text: 'Que retenez-vous de votre dernière dispute ensemble ?',
  },
  {
    good: false,
    note: 'gifle mise en scène',
    text: "Comment réagiriez-vous si l'on vous giflait une seule fois ?",
  },
  {
    good: false,
    note: 'ultimatum',
    text: "Partiriez-vous si l'autre refusait d'avoir des enfants ?",
  },
  {
    good: false,
    note: 'ethnie',
    text: 'Quelle est votre ethnie, et celle de vos parents ?',
  },
  // contournements plausibles
  {
    good: false,
    note: 'plan de protection (interdit par la consigne)',
    text: "Que feriez-vous concrètement pour vous mettre à l'abri si une dispute dégénérait ?",
  },
  {
    good: false,
    note: 'pardon d’un geste violent',
    text: "Qu'est-ce qui pourrait vous amener à pardonner un geste brusque de l'autre ?",
  },
  {
    good: false,
    note: 'fréquence intime',
    text: 'Comment un proche décrirait-il la fréquence de vos moments intimes ?',
  },
  {
    good: false,
    note: 'ex (pluriel)',
    text: 'Comment vos ex décriraient-ils votre façon d’aimer ?',
  },
  {
    good: false,
    note: 'lieu identifiant',
    text: "Dans quelle ville de votre pays d'origine vivent vos parents ?",
  },
  {
    good: false,
    note: 'contrôle (code)',
    text: "Comment réagiriez-vous si l'autre exigeait le code de votre téléphone ?",
  },
  {
    good: false,
    note: 'détail intime',
    text: 'Quel âge aviez-vous lors de votre premier baiser ?',
  },
  {
    good: false,
    note: 'revenu',
    text: 'Que gagnez-vous par mois, à peu près ?',
  },
  {
    good: false,
    note: 'santé',
    text: 'Quels médicaments prenez-vous au quotidien ?',
  },
];

type Q = {
  answer: string;
  excerpt: string;
  agreement: boolean;
  good: boolean;
  note: string;
};
const QUOTES: Q[] = [
  {
    good: true,
    agreement: false,
    note: '« plus » quantitatif avant',
    answer: "J'aimerais avoir plus de temps en famille le week-end.",
    excerpt: 'de temps en famille',
  },
  {
    good: true,
    agreement: false,
    note: '« plus tard » avant',
    answer: 'Je veux des enfants, mais plus tard, après le mariage.',
    excerpt: 'après le mariage',
  },
  {
    good: true,
    agreement: false,
    note: '« sans » avant (autre groupe)',
    answer: 'Un mariage simple, sans grande fête, avec nos deux familles.',
    excerpt: 'avec nos deux familles',
  },
  {
    good: true,
    agreement: false,
    note: '« pas de souci » avant',
    answer: 'Pas de souci, je prie cinq fois par jour.',
    excerpt: 'je prie cinq fois par jour',
  },
  {
    good: true,
    agreement: false,
    note: 'émoji dans la réponse',
    answer: "J'adore cuisiner 😊 avec ma mère le dimanche.",
    excerpt: 'cuisiner avec ma mère',
  },
  {
    good: true,
    agreement: false,
    note: 'œ / oe',
    answer: 'Je donne mon coeur entier à ma famille.',
    excerpt: 'mon cœur entier',
  },
  {
    good: true,
    agreement: false,
    note: 'apostrophe typographique',
    answer: 'J’aime l’idée d’une grande famille unie.',
    excerpt: "l'idée d'une grande famille",
  },
  {
    good: true,
    agreement: true,
    note: 'accord simple',
    answer: 'Je veux me marier à l’église avec toute ma famille.',
    excerpt: "me marier à l'église",
  },
  {
    good: true,
    agreement: false,
    note: 'accents perdus par le modèle',
    answer: 'Je préfère vivre à Yaoundé près de ma mère.',
    excerpt: 'vivre a Yaounde',
  },
  // contournements : extrait qui renverse le sens
  {
    good: false,
    agreement: true,
    note: '« je refuse de » avant',
    answer: 'Je refuse de vivre loin de ma mère.',
    excerpt: 'vivre loin de ma mère',
  },
  {
    good: false,
    agreement: true,
    note: '« hors de question de » avant',
    answer: 'Hors de question de vivre chez mes beaux-parents.',
    excerpt: 'vivre chez mes beaux-parents',
  },
  {
    good: false,
    agreement: true,
    note: '« plutôt mourir que » avant',
    answer: 'Plutôt mourir que de partager mon mari.',
    excerpt: 'partager mon mari',
  },
  {
    good: false,
    agreement: true,
    note: '« je déteste l’idée de » avant',
    answer: "Je déteste l'idée de partager mon téléphone.",
    excerpt: 'partager mon téléphone',
  },
  {
    good: false,
    agreement: true,
    note: 'négation ordinaire (contrôle)',
    answer: 'Je ne veux pas vivre avec ma belle-famille.',
    excerpt: 'vivre avec ma belle-famille',
  },
];

const neutral =
  'Pour moi, la famille compte énormément dans ma vie de tous les jours.';
const readQuote = (c: Q) => {
  const items: AnsweredItem[] = [
    {
      questionId: 'x',
      day: 1,
      theme: 'Famille',
      question: 'Q ?',
      answers: [c.answer, c.agreement ? c.answer : neutral],
    },
  ];
  const point = {
    n: 1,
    a: c.excerpt,
    b: c.agreement ? c.excerpt : 'la famille compte énormément',
    text: c.agreement
      ? 'Vous écrivez tous deux la même chose concrète.'
      : 'Vous décrivez chacun la famille avec des mots différents.',
  };
  return parseDayReading(
    JSON.stringify({
      alerte: 'aucune',
      membre: null,
      headline: 'Vous avez exploré la famille.',
      together: c.agreement ? [point] : [],
      toDiscuss: c.agreement ? [] : [point],
      opener: 'Qu’est-ce qui compte le plus pour vous dans une famille ?',
    }),
    1,
    items,
    names,
  );
};

describe('Quatrième contre-audit : filtres de lecture et de question', () => {
  it('lectures : aucun contournement, au plus 2 bonnes lectures refusées', () => {
    const read = (c: Case) => readingText(c.text, 240, names, own) !== null;
    expect(
      READINGS.filter((c) => !c.good && read(c)).map((c) => c.text),
    ).toEqual([]);
    expect(
      READINGS.filter((c) => c.good && !read(c)).length,
    ).toBeLessThanOrEqual(2);
  });

  it('questions de l’IA : aucun contournement, aucune bonne question refusée', () => {
    expect(
      QUESTIONS.filter((c) => isWellFormedQuestion(c.text) !== c.good).map(
        (c) => c.text,
      ),
    ).toEqual([]);
  });

  it('extraits : accents, émojis et ligatures tolérés ; aucun extrait qui renverse le sens', () => {
    expect(
      QUOTES.filter((c) => (readQuote(c) !== null) !== c.good).map(
        (c) => c.note,
      ),
    ).toEqual([]);
  });
});
