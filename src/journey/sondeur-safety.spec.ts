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

/** Second corpus du contre-audit : phrases nouvelles (registres africain, SMS, créole, anglais). */
const DANGER_CASES_2: Case[] = [
  // ── Vrais positifs attendus : violence
  ["Mon ancien compagnon m'a étranglée une nuit.", true, 'fr'],
  ['Il m’a giflée devant ses amis.', true, 'fr'],
  ['Mon mari me forçait à coucher avec lui.', true, 'fr viol conjugal'],
  [
    "Il m'obligeait à avoir des rapports alors que je ne voulais pas.",
    true,
    'fr viol conjugal',
  ],
  ["J'ai porté plainte contre mon ex pour violences.", true, 'fr'],
  ["J'ai vécu six mois dans un foyer pour femmes battues.", true, 'fr'],
  ['Il m’a jetée dans les escaliers.', true, 'fr'],
  ['Il m’a brûlée avec sa cigarette.', true, 'fr'],
  ['Mon ex-mari me fouettait avec sa ceinture.', true, 'afrique'],
  ['mon ex me frapait qd il avait bu', true, 'sms faute'],
  ['Le gars me bastonnait chaque fois qu’il était soûl.', true, 'camfranglais'],
  ['He punched me and broke my nose.', true, 'en'],
  ['He would choke me when he was angry.', true, 'en'],
  ['I was raped by my ex.', true, 'en'],
  ['Nonm-la té ka bat mwen chak jou.', true, 'créole martiniquais'],
  ['Li te konn bat mwen lè l te sou.', true, 'créole haïtien'],
  [
    'Si ma femme me manque de respect, je la corrige.',
    true,
    'fr auteur conditionnel',
  ],
  [
    'Si elle me répond mal, elle prend une gifle.',
    true,
    'fr auteur conditionnel',
  ],
  ['S’il me trompe je lui casse la gueule.', true, 'fr auteur conditionnel'],
  // ── menace
  ['Il disait qu’il allait me tuer si je partais.', true, 'fr menace subie'],
  [
    'Mon ex m’a dit que si je le quittais il me retrouverait partout.',
    true,
    'fr menace subie',
  ],
  ['He said he would kill me.', true, 'en menace'],
  // ── contrôle
  [
    'Il lisait tous mes messages et je devais lui donner mon code.',
    true,
    'fr contrôle',
  ],
  ['Ma femme devra me donner ses mots de passe.', true, 'fr contrôle auteur'],
  ['Je lui interdirai de voir ses copines.', true, 'fr contrôle auteur'],
  [
    'Il m’appelait trente fois par jour pour savoir où j’étais.',
    true,
    'fr contrôle',
  ],
  ['My ex used to check my phone every night.', true, 'en contrôle'],
  ['Mon mari prenait toute ma paie à la fin du mois.', true, 'fr contrôle éco'],
  // ── détresse
  ['Je pense parfois à mettre fin à mes jours.', true, 'fr'],
  ['Des fois je me dis que tout le monde serait mieux sans moi.', true, 'fr'],
  ['Je veux m’ôter la vie.', true, 'fr'],
  ['I don’t want to live anymore.', true, 'en'],
  ['Mwen pa vle viv ankò.', true, 'créole haïtien'],
  ['mwen vlé mouri', true, 'créole'],
  // ── argent / arnaque
  [
    'Mon frère est à l’hôpital, il me faut 500 € pour l’opération, tu peux m’aider ?',
    true,
    'arnaque',
  ],
  ['Fais-moi un dépôt Wave, je te rembourse lundi.', true, 'afrique wave'],
  [
    'Tu peux m’envoyer un peu de crédit pour mon téléphone ?',
    true,
    'afrique crédit',
  ],
  ['Envoi moi 20000f stp', true, 'sms'],
  ['Tu peux me faire un virement de 300 ?', true, 'fr'],
  // ── minorité
  ['Je suis en seconde au lycée Lumière.', true, 'mineur'],
  ['Je suis née en 2010.', true, 'mineur'],
  ['jai 16 an', true, 'sms'],
  ['im 15yo', true, 'en sms'],
  ['I’m sixteen.', true, 'en'],
  // ── Faux positifs à éviter : limites saines, idiomes, transferts familiaux
  ['Jamais je ne laisserai un homme me frapper.', false, 'limite saine'],
  ['Personne n’a le droit de me frapper.', false, 'limite saine'],
  ['Le jour où il me frappe, je pars.', false, 'limite saine'],
  ['Quand on me menace, je coupe les ponts.', false, 'limite saine'],
  ['Celui qui me menace ne me reverra jamais.', false, 'limite saine'],
  [
    'Je trouve malsain de fouiller le téléphone de son conjoint.',
    false,
    'limite saine contrôle',
  ],
  [
    'Surveiller le portable de l’autre, c’est déjà ne plus avoir confiance.',
    false,
    'limite saine contrôle',
  ],
  [
    'Ma mère envoie de l’argent au pays par Western Union chaque mois.',
    false,
    'diaspora transfert',
  ],
  ['Je soutiens mes parents par mobile money.', false, 'diaspora transfert'],
  ['J’ai placé un peu d’épargne en bitcoin.', false, 'épargne'],
  ['Je suis fatiguée de vivre seule.', false, 'célibat'],
  ['Je veux mourir vieux à côté de ma femme.', false, 'futur'],
  ['Si on mange aussi tard, je vais mourir de faim.', false, 'idiome'],
  ['Je suis au lycée Descartes comme professeure de maths.', false, 'métier'],
  [
    'Quand je ramenais une mauvaise note, mon père me chicotait.',
    false,
    'éducation (catégorie à part)',
  ],
  [
    'Chez nous, les parents tapaient les enfants désobéissants.',
    false,
    'éducation',
  ],
];

const RESERVED_CASES: Case[] = [
  ['J’aimerais en parler de vive voix.', true, ''],
  ['Je réserve ma réponse pour notre rencontre.', true, ''],
  ['Mieux vaut en parler face à face.', true, ''],
  ['Je passe mon tour sur celle-ci.', true, ''],
  ['Pas maintenant, plus tard peut-être.', true, ''],
  ['I’d rather talk about it in person.', true, ''],
  // Un retrait décrit n'est pas une réserve : la lecture doit le voir.
  [
    'Je préfère ne pas répondre quand je suis en colère, j’attends d’être calme.',
    false,
    '',
  ],
  [
    'Quand on me crie dessus, je préfère ne pas répondre et je sors marcher.',
    false,
    '',
  ],
  ['J’aime en parler de vive voix avec ma mère chaque dimanche.', false, ''],
  ['Pas maintenant, je veux d’abord finir mes études.', false, ''],
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
  ['Ça, je le garde pour quand on se verra.', true, 'contre-audit 2'],
  ['Je n’ai pas envie de répondre à ça.', true, 'contre-audit 2'],
  [
    'J’aime discuter de vive voix des sujets importants.',
    false,
    'contre-audit 2',
  ],
  ['J’aime parler en face, pas par écrit.', false, 'contre-audit 2'],
];

describe('Signaux de danger dans les réponses du Sondeur', () => {
  it.each(DANGER_CASES)('« %s » → %s', (text, expected) => {
    expect(hasDangerSignal(text)).toBe(expected);
  });

  it.each(DANGER_CASES_2)('second corpus : « %s » → %s', (text, expected) => {
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
    expect(dangerCategories('Mon ex me frappait.')).toEqual(['violence_subie']);
    expect(dangerCategories('Je l’ai déjà giflée une fois.')).toEqual([
      'violence_exercee',
    ]);
    expect(
      dangerCategories('Si elle me manque de respect je la gifle.'),
    ).toEqual(['violence_exercee']);
    expect(
      dangerCategories(
        'Quand je ramenais une mauvaise note, mon père me chicotait.',
      ),
    ).toEqual([]);
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
