import {
  dangerCategories,
  hasDangerSignal,
  isReservedAnswer,
} from './sondeur-insights';

/** [phrase, attendu, note] : corpus du contre-audit (français, Afrique, SMS, anglais). */
type Case = [string, boolean, string];

const DANGER_CASES: Case[] = [
  ['Mon ex me frappait.', true, ''],
  ['Il me tapait quand il avait bu.', true, ''],
  ['J’ai été battue pendant des années.', true, ''],
  ['J’ai subi des violences conjugales avec mon ex-mari.', true, ''],
  ['Mon ex était violent avec moi.', true, ''],
  ['Il me cognait.', true, ''],
  ['Il m’a tabassée devant les enfants.', true, ''],
  ['Il m’a donné des coups.', true, ''],
  ['J’ai été violée à 15 ans.', true, ''],
  ['il ma frappé plusieurs fois', true, ''],
  ['Mon mari me chicotait.', true, ''],
  ['He used to hit me.', true, ''],
  ['Je l’ai déjà giflée une fois.', true, ''],
  ['Une bonne gifle n’a jamais tué personne.', true, ''],
  [
    'Chez nous, un homme corrige sa femme quand elle manque de respect.',
    true,
    '',
  ],
  ['Une femme qui désobéit mérite une correction.', true, ''],
  ['Si tu me quittes je te tue.', true, ''],
  ['Je vais la tuer si elle me trompe.', true, ''],
  ['Si elle me trompe, elle va le regretter.', true, ''],
  ['Il fouillait mon téléphone tous les soirs.', true, ''],
  ['Je vérifie le téléphone de ma femme, c’est normal.', true, ''],
  ['Il m’interdisait de voir mes amies et ma famille.', true, ''],
  ['Il gardait tout mon salaire et me donnait de l’argent de poche.', true, ''],
  ['Il avait confisqué mon passeport.', true, ''],
  ['Ma femme ne sortira pas sans ma permission.', true, ''],
  ['Il m’enfermait à la maison.', true, ''],
  ['Il me géolocalisait en permanence.', true, ''],
  ['J’ai envie de mourir.', true, ''],
  ['Je veux en finir.', true, ''],
  ['J’ai déjà pensé à me tuer.', true, ''],
  ['Parfois je voudrais disparaître pour toujours.', true, ''],
  ['Je me fais du mal quand ça ne va pas.', true, ''],
  ['Je ne vois plus de raison de vivre.', true, ''],
  ['I want to die.', true, ''],
  ['Peux-tu m’envoyer de l’argent pour mon billet ?', true, ''],
  ['Envoie-moi 50 000 FCFA par Orange Money.', true, ''],
  ['Fais-moi un transfert MoneyGram, je te rembourse.', true, ''],
  ['Achète-moi des coupons PCS ou Transcash.', true, ''],
  ['Tu peux me prêter 300 euros ?', true, ''],
  ['send me money please', true, ''],
  ['J’ai seize ans.', true, ''],
  ['j’ai 16ans', true, ''],
  ['Je suis mineure.', true, ''],
  // spec existant (positifs)
  ['Si on me pousse à bout, il peut m’arriver de lever la main.', true, 'spec'],
  ['Mon ex m’a frappée plusieurs fois.', true, 'spec'],
  ['Je n’ai plus envie de vivre en ce moment.', true, 'spec'],
  ['Envoie-moi de l’argent par Western Union.', true, 'spec'],
  // faux positifs à éviter
  [
    'S’il venait à lever la main sur moi, je partirais immédiatement.',
    false,
    '',
  ],
  ['Lever la main', false, ''],
  ['Si jamais il me frappe une seule fois, c’est fini.', false, ''],
  ['Je ne supporte pas qu’on me menace.', false, ''],
  ['J’ai 15 ans d’expérience dans la banque.', false, ''],
  ['J’ai 12 ans de différence avec mon petit frère.', false, ''],
  [
    'Je veux en finir avec tout ce qui est relations sans lendemain.',
    false,
    '',
  ],
  ['Ma mère m’a forcé à faire du droit.', false, ''],
  ['Au village, on bat le tam-tam pour célébrer un mariage.', false, ''],
  ['Il m’a tapé dans l’œil dès le premier regard.', false, 'idiome'],
  [
    'J’envoie de l’argent à ma mère chaque mois.',
    false,
    'transferts familiaux légitimes',
  ],
  ['Je regarde mon téléphone pendant les repas, je le reconnais.', false, ''],
  ['Je ne prendrais aucune décision importante sans son accord.', false, ''],
  ['La violence est inacceptable, je partirais aussitôt.', false, 'spec'],
  ['Je ne supporterais pas qu’on lève la voix sur moi.', false, 'spec'],
  ['Ma limite : aucune insulte, jamais.', false, 'spec'],
  ['Mon père levait la voix mais jamais la main.', false, ''],
  ['C’est l’homme qui va payer la dot, chez nous.', false, 'dot'],
  [
    'Dans ma famille, on recevait de l’argent de poche chaque semaine.',
    false,
    'enfance',
  ],
  ['Je m’enferme dans ma chambre quand je suis en colère.', false, 'retrait'],
  ['On partage notre géolocalisation, c’est pratique.', false, 'consentement'],
  ['Mes parents m’interdisaient de sortir le soir.', false, 'éducation'],
  ['Je pense qu’il va regretter son choix de carrière.', false, ''],
  ['Chez moi on corrigeait les devoirs ensemble le soir.', false, ''],
];

const RESERVED_CASES: Case[] = [
  ['J’aimerais en parler de vive voix.', true, ''],
  ['Je préfère ne pas y répondre.', true, ''],
  ['Je préfère pas répondre.', true, ''],
  ['Je préférerais ne pas répondre.', true, ''],
  ['Je ne souhaite pas répondre à cette question.', true, ''],
  ['Je garde ça pour notre rencontre.', true, ''],
  ['On en parlera en face.', true, ''],
  ['Joker.', true, ''],
  ['Rather not say.', true, ''],
  ['Je préfère ne pas répondre ici.', true, 'spec'],
  ['On en parlera quand on se verra.', true, 'spec'],
  [
    'Je préfère régler les conflits de vive voix, jamais par message.',
    false,
    '',
  ],
  ['De vive voix, j’aime qu’on commence par rire un peu.', false, ''],
  ['Je ne me vois pas ici toute ma vie, je veux rentrer au pays.', false, ''],
  ['Mes parents ne sont pas ici, ils vivent à Abidjan.', false, ''],
];

describe('Signaux de danger dans les réponses du Sondeur', () => {
  it.each(DANGER_CASES)('« %s » → %s', (text, expected) => {
    expect(hasDangerSignal(text)).toBe(expected);
  });

  it('nomme la catégorie transmise à la modération', () => {
    expect(
      dangerCategories('Il fouillait mon téléphone tous les soirs.'),
    ).toEqual(['controle']);
    expect(dangerCategories('Si tu me quittes je te tue.')).toEqual(['menace']);
    expect(dangerCategories('Je ne vois plus de raison de vivre.')).toEqual([
      'detresse',
    ]);
    expect(
      dangerCategories('Envoie-moi 50 000 FCFA par Orange Money.'),
    ).toEqual(['argent']);
    expect(dangerCategories('J’ai seize ans.')).toEqual(['mineur']);
    expect(dangerCategories('Mon ex me frappait.')).toEqual(['violence']);
    expect(
      dangerCategories('S’il venait à lever la main sur moi, je partirais.'),
    ).toEqual([]);
  });
});

describe('Réponses gardées pour la rencontre', () => {
  it.each(RESERVED_CASES)('« %s » → %s', (text, expected) => {
    expect(isReservedAnswer(text)).toBe(expected);
  });
});
