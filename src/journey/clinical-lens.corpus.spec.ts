/**
 * Corpus du contre-audit : chaque filtre du code est vérifié sur des phrases
 * réelles (ce qui doit passer, ce qui doit être refusé).
 */
import {
  COMPROMISE,
  LENS_EXAMPLES,
  hasClinicalJargon,
  isIntrusiveQuestion,
  isOpenQuestion,
  isWellFormedQuestion,
  passesFormRules,
} from './clinical-lens';
import { readingText } from './sondeur-insights';

type Case = [string, boolean];

const INTRUSIVE_CASES: Case[] = [
  ['Combien d’argent envoyez-vous à vos parents chaque mois ?', true],
  ['Combien de partenaires avez-vous eus avant ?', true],
  ['À quelle fréquence aimeriez-vous faire l’amour ?', true],
  ['Qu’attendez-vous des relations sexuelles dans le mariage ?', true],
  ['Pourquoi votre dernière relation s’est-elle terminée ?', true],
  ['Qu’avez-vous appris de votre ancien conjoint ?', true],
  ['Comment imaginez-vous l’éducation de vos futurs enfants ?', true],
  ['Combien seriez-vous prêt(e) à verser pour la dot ?', true],
  ['Avec 300 000 francs CFA par mois, comment géreriez-vous le foyer ?', true],
  ['Dans quelle ville habitez-vous exactement ?', true],
  ['Où travaillez-vous en ce moment ?', true],
  ['Quel est votre statut migratoire ou votre visa ?', true],
  [
    'De quelle ethnie êtes-vous, et laquelle vos parents attendent-ils pour votre conjoint ?',
    true,
  ],
  [
    'Quel fantasme aimeriez-vous partager un jour avec votre futur conjoint ?',
    true,
  ],
  // ne doivent pas être bloquées
  ['Dans votre foi, quelle place a le divorce ?', false],
  ['Que représenterait pour vous un conjoint d’une autre nationalité ?', false],
  [
    'Qu’est-ce qui vous ferait sentir chez vous dans un nouveau quartier ?',
    false,
  ],
  ['Dans votre famille, qui s’occupait des papiers de la maison ?', false],
  [
    'Dans votre famille, comment savait-on qu’une dispute était terminée ?',
    false,
  ],
  [
    "Qu'est-ce que votre façon de gérer l'argent vous permet de protéger ?",
    false,
  ],
  [
    'De 0 à 10, à quel point tenez-vous à vivre près des vôtres ? Pourquoi pas un point de moins ?',
    false,
  ],
  [
    'Combien de temps aimeriez-vous passer chaque semaine avec votre famille ?',
    false,
  ],
  ...LENS_EXAMPLES.map((e) => [e, false] as Case),
  ...LENS_EXAMPLES.map((e) => [e, false] as Case),
];

const OPEN_CASES: Case[] = [
  ['Vous diriez que la foi est essentielle ?', false],
  ['Le fait que l’autre ne prie pas vous dérangerait ?', false],
  ['Une personne qui ne prie pas pourrait-elle vous convenir ?', false],
  ['Le pays où vous vivrez sera-t-il celui de vos parents ?', false],
  ['L’argent que vous gagnez doit-il être partagé ?', false],
  ['C’est important pour vous que votre conjoint partage votre foi ?', false],
  ['Est-ce une ligne rouge pour vous ?', false],
  ['Accepteriez-vous de déménager pour l’autre ?', false],
  [
    'Dans votre famille, comment savait-on qu’une dispute était terminée ?',
    true,
  ],
  ['La fidélité, pour vous, c’est quoi concrètement ?', true],
  [
    "Qu'est-ce que votre façon de gérer l'argent vous permet de protéger ?",
    true,
  ],
  [
    'De 0 à 10, à quel point tenez-vous à vivre près des vôtres ? Pourquoi pas un point de moins ?',
    true,
  ],
  [
    'Qui, dans votre entourage, aurait le plus à dire sur la religion de votre futur conjoint ?',
    true,
  ],
  [
    'Si votre famille désapprouvait votre choix, que feriez-vous en premier ?',
    true,
  ],
  ['Que veut dire, très concrètement, « respect » pour vous ?', true],
  ['D’où vous vient cette façon de voir le mariage ?', true],
  [
    "Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ?",
    true,
  ],
  ['Pouvez-vous décrire un dimanche idéal en famille ?', true],
];

const JARGON_CASES: Case[] = [
  ['Êtes-vous plutôt évitant dans vos relations ?', true],
  ['Votre partenaire a-t-il un profil anxieux ?', true],
  ['Ce traumatisme vous a-t-il marqué ?', true],
  ['Une relation toxique', true],
  ['Une dispute est-elle inévitable selon vous ?', false],
  ['Une décision complexe d’abord à deux ?', false],
  ['Qui, dans votre famille, décidait des dépenses importantes ?', false],
  ['Votre style d’attachement vous pousse-t-il à fuir ?', true],
  ['Comment vivez-vous votre attachement anxieux ?', true],
  ['Êtes-vous plutôt sécure ou insécure en amour ?', true],
  ['Comment se manifeste votre dépendance émotionnelle ?', true],
  ['Quel est votre mécanisme de défense en dispute ?', true],
  ['Comment gérez-vous votre comportement d’évitement ?', true],
  ['Comment vivez-vous votre hypersensibilité dans le couple ?', true],
  ['Comment votre ambivalence se manifeste-t-elle ?', true],
  ['Cet attachement à votre pays, d’où vient-il ?', false],
  ['Cet attachement, d’où vient-il selon vous ?', false],
  ['Quel est votre besoin de réassurance quand l’autre s’éloigne ?', false],
  ['En évitant les disputes, que cherchez-vous à protéger ?', false],
];

/** true = la lecture est refusée. */
const READING_CASES: Case[] = [
  ['Vous êtes sur la même longueur d’onde sur la famille.', true],
  ['Votre couple a de l’avenir sur ce point.', true],
  ['Cette différence risque de devenir une source de conflit.', true],
  ['Cet écart pourrait être rédhibitoire.', true],
  ['Vous vous complétez très bien.', true],
  ['Une vraie complicité se dessine entre vous.', true],
  [
    'Si cette différence sur la foi vous semble insurmontable, il est plus sage de ne pas aller plus loin.',
    true,
  ],
  [
    'Ne laissez pas cette différence vous décourager : continuez à échanger, tout se travaille.',
    true,
  ],
  [
    'Avec un peu de bonne volonté de part et d’autre, vous trouverez un chemin sur la religion.',
    true,
  ],
  ['Sur la foi, chacun pourrait faire un pas vers l’autre.', true],
  ['Vous pourriez chercher ensemble une voie médiane sur la religion.', true],
  ['Une conversion progressive pourrait rapprocher vos positions.', true],
  ['Sur la religion, vous pourriez trouver un terrain d’entente.', true],
  ['Il faudra rendre vivable cette différence de foi.', true],
  // lectures neutres à garder
  [
    'L’un pose la conversion comme condition, l’autre écrit qu’il ne changera jamais de religion.',
    false,
  ],
  [
    'L’un décrit des désaccords réglés autour de la table, l’autre des conflits évités.',
    false,
  ],
  [
    'Vous employez tous deux le mot « confiance » : ce qu’il recouvre reste à préciser.',
    false,
  ],
  [
    'Prenez le temps de relire vos réponses avant votre premier message.',
    false,
  ],
];

const own: [string, string] = [
  'Je suis de la région, on parlait peu de la famille. J’ai peur de la trahison.',
  'Je suis de la ville et chez moi on parlait de la paix.',
];
/** true = refusée (émotion prêtée sans avoir été écrite). */
const FEELING_CASES: Case[] = [
  ['Pour Karim, la fidélité semble avant tout une affaire de peur.', true],
  ['Karim exprime une peur de perdre son identité.', true],
  ['Karim a très peur de la trahison.', true],
  ['Karim, de son côté, a besoin d’être rassuré.', true],
  ['Karim est inquiet à l’idée de perdre sa liberté.', true],
  ['Inès souffre encore de sa dernière relation.', true],
  ['Inès écrit qu’elle a peur de la trahison.', false],
  ['Karim parle de paix, Inès de famille.', false],
];

describe('Filtres du code sur le corpus du contre-audit', () => {
  it.each(INTRUSIVE_CASES)('intrusive : « %s » → %s', (text, expected) => {
    expect(isIntrusiveQuestion(text)).toBe(expected);
  });
  it.each(OPEN_CASES)('ouverte : « %s » → %s', (text, expected) => {
    expect(isOpenQuestion(text)).toBe(expected);
  });
  it.each(JARGON_CASES)('jargon : « %s » → %s', (text, expected) => {
    expect(hasClinicalJargon(text)).toBe(expected);
  });
  it.each(READING_CASES)('lecture refusée : « %s » → %s', (text, expected) => {
    expect(readingText(text, 300, ['Inès', 'Karim'], own) === null).toBe(
      expected,
    );
  });
  it.each(FEELING_CASES)('émotion prêtée : « %s » → %s', (text, expected) => {
    expect(readingText(text, 300, ['Inès', 'Karim'], own) === null).toBe(
      expected,
    );
  });
  it('compromis sur un point non négociable : repéré', () => {
    expect(
      COMPROMISE.test(
        'Sur la foi, quel pas chacun pourrait-il faire vers l’autre ?',
      ),
    ).toBe(true);
    expect(
      COMPROMISE.test(
        'Qu’est-ce qui vous aide à faire le premier pas après une dispute ?',
      ),
    ).toBe(false);
  });
});

describe('Second contre-audit : lectures et questions', () => {
  const ownBelle: [string, string] = [
    'Je ne suis pas d’accord pour vivre avec ma belle-famille, même au début.',
    'J’aimerais vivre avec ma belle-famille au début du mariage.',
  ];
  it.each([
    'L’un de vous redoute la trahison, l’autre cherche la paix.',
    'Vous avez tous les deux peur de l’engagement.',
    'Inès est plutôt jalouse, Karim plus détaché.',
    'Karim est immature sur la question de l’argent.',
    'Inès a raison de vouloir un compte commun.',
    'Karim ne semble pas prêt à s’engager.',
    'Votre réponse laisse penser que vous craignez l’abandon.',
    'Sur la foi, chacun devra mettre de l’eau dans son vin.',
    'Un équilibre reste à trouver sur la foi.',
    'Vous vous rejoignez sur l’essentiel.',
    'Votre entente sur la famille est solide.',
    'Ces réponses sont rassurantes pour la suite.',
    'Cet écart mérite toute votre vigilance avant de vous engager.',
  ])('lecture refusée : « %s »', (text) => {
    expect(readingText(text, 300, ['Inès', 'Karim'], ownBelle)).toBeNull();
  });
  it.each([
    'Un point commun se dégage : la place de la famille.',
    'L’un ferme la discussion pour se calmer, l’autre préfère parler.',
    'L’un pose la conversion comme condition, l’autre écrit qu’il ne changera jamais de religion.',
  ])('lecture neutre gardée : « %s »', (text) => {
    expect(readingText(text, 300, ['Inès', 'Karim'], ownBelle)).not.toBeNull();
  });
  it.each([
    ['Quelle somme enverriez-vous chaque mois à vos parents ?', false],
    ['Dans quel quartier vivez-vous en ce moment ?', false],
    ['De quel village votre famille est-elle originaire ?', false],
    ['Comment votre jalousie se manifeste-t-elle au quotidien ?', false],
    ['Pourquoi avez-vous du mal à faire confiance aux autres ?', false],
    [
      'Après une gifle, qu’est-ce qui vous permettrait de vous réconcilier ?',
      false,
    ],
    [
      'Dans votre famille, comment se passait votre relation avec votre mère ?',
      true,
    ],
    ['Quelle taille de famille aimeriez-vous avoir autour de vous ?', true],
  ])('grille de forme : « %s » → %s', (text, expected) => {
    expect(passesFormRules(text)).toBe(expected);
  });
});

describe('Troisième contre-audit : questions de l’IA', () => {
  it.each<Case>([
    [
      'Que ressentiriez-vous si votre conjoint vous giflait une seule fois ?',
      false,
    ],
    [
      'Que penseriez-vous si votre conjoint lisait vos messages par amour ?',
      false,
    ],
    ['Comment réagiriez-vous si votre conjoint contrôle vos dépenses ?', false],
    ['Qu’est-ce qui vous a le plus blessé(e) dans votre enfance ?', false],
    [
      'Qu’est-ce qui vous blesse le plus dans une remarque sur votre famille ?',
      true,
    ],
    ['Quel a été votre dernier coup de cœur pour un lieu ?', true],
    [
      'Comment aimeriez-vous que l’autre vous rassure après une dispute ?',
      true,
    ],
    ['Où placez-vous la frontière entre confiance et surveillance ?', true],
  ])(
    'jamais de scène de violence ou de contrôle : « %s » → %s',
    (text, expected) => {
      expect(isWellFormedQuestion(text)).toBe(expected);
    },
  );
});
