import { dangerCategories, holdsSafety } from './sondeur-insights';

/**
 * Corpus de non-régression du repérage des dangers : phrases écrites lors des
 * contre-audits, absentes des autres specs (violence, menace, contrôle,
 * détresse, argent, minorité, en français courant, registre africain, SMS,
 * anglais et créole), et phrases saines qui ne doivent rien déclencher
 * (limites, souvenirs d'enfance, idiomes, envois familiaux, accords).
 * Seuils par catégorie : un motif qui en fait tomber un fait échouer l'intégration.
 */
type Exp =
  | 'violence_subie'
  | 'violence_exercee'
  | 'violence'
  | 'menace'
  | 'controle'
  | 'detresse'
  | 'argent'
  | 'mineur'
  | null;
type Case = [string, Exp, string];

const POSITIVE: Case[] = [
  ['Je ne supporte plus qu’il me frappe.', 'violence_subie', 'fait présent'],
  ['Je ne veux plus qu’il me batte.', 'violence_subie', 'fait présent'],
  [
    'Mon grand frère me menace de me tuer si j’épouse un chrétien.',
    'menace',
    'honneur',
  ],
  ['Mon frère me frappe encore aujourd’hui.', 'violence_subie', 'fratrie'],
  // violence subie
  [
    'Mon ex me mettait des coups de pied quand je refusais.',
    'violence_subie',
    'fr',
  ],
  [
    'Il me serrait le cou jusqu’à ce que je ne respire plus.',
    'violence_subie',
    'fr strangulation',
  ],
  ['Il me crachait dessus et me tirait les cheveux.', 'violence_subie', 'fr'],
  ['Mon ancien mari m’a cassé le bras.', 'violence_subie', 'fr'],
  ['J’ai fini aux urgences à cause de lui.', 'violence_subie', 'fr'],
  ['Il me poussait contre le mur.', 'violence_subie', 'fr'],
  [
    'Mon ex me bat encore quand il vient chercher les enfants.',
    'violence_subie',
    'fr actuel',
  ],
  ['J’ai été frappée par mon premier mari.', 'violence_subie', 'fr'],
  ['Il levait la main sur moi pour un rien.', 'violence_subie', 'fr'],
  [
    'Il m’humiliait devant sa famille et me traitait de bonne à rien.',
    'violence_subie',
    'fr psychologique',
  ],
  ['Mon ex me violait quand il rentrait saoul.', 'violence_subie', 'fr'],
  ['Mon gars me tapait comme serpent.', 'violence_subie', 'nouchi'],
  ['Le mbom me tabassait chaque soir.', 'violence_subie', 'camfranglais'],
  ['il ma tabassé devan ma mere', 'violence_subie', 'sms'],
  ['mn ex m frapé souvent', 'violence_subie', 'sms'],
  ['My husband used to slap me around.', 'violence_subie', 'en'],
  ['He dragged me by the hair across the room.', 'violence_subie', 'en'],
  ['My ex put me in hospital twice.', 'violence_subie', 'en'],
  ['Mari m te konn kale m chak swa.', 'violence_subie', 'créole haïtien'],
  ['I té ka fouté mwen kou tou lé jou.', 'violence_subie', 'créole antillais'],
  [
    'Il me forçait à des choses que je ne voulais pas au lit.',
    'violence_subie',
    'fr sexuelle',
  ],
  // violence exercée
  [
    'Quand elle me provoque, je la remets à sa place avec une claque.',
    'violence_exercee',
    'fr',
  ],
  [
    'Il m’est déjà arrivé de la bousculer pendant une dispute.',
    'violence_exercee',
    'fr',
  ],
  ['J’ai déjà frappé une ex, je ne suis pas fier.', 'violence_exercee', 'fr'],
  ['Une femme, ça se dresse.', 'violence_exercee', 'fr normalisation'],
  [
    'Chez nous, si la femme manque de respect, on la chicote.',
    'violence_exercee',
    'afrique',
  ],
  ['Je lui ai mis une raclée, elle l’avait cherché.', 'violence_exercee', 'fr'],
  ['I slapped her once when she disrespected me.', 'violence_exercee', 'en'],
  ['Si ma go me ment je la tape.', 'violence_exercee', 'nouchi'],
  ['Si ma go fait palabre, je vais la taper.', 'violence_exercee', 'nouchi'],
  // menace
  [
    'Il m’a dit que je ne verrais plus jamais mes enfants si je partais.',
    'menace',
    'fr',
  ],
  ['Si tu pars, je brûle ta maison.', 'menace', 'fr'],
  ['Il a menacé de me défigurer.', 'menace', 'fr'],
  ['Elle m’a menacée avec un couteau.', 'menace', 'fr'],
  ['He said I’d regret leaving him.', 'menace', 'en'],
  ['I di mwen i ké tchouyé mwen.', 'menace', 'créole martiniquais'],
  ['si tu me quittes jte tue', 'menace', 'sms'],
  ['Tu vas voir ce qui va t’arriver si tu me quittes.', 'menace', 'fr'],
  ['Il disait qu’il allait me balancer de l’acide.', 'menace', 'fr'],
  // contrôle
  [
    'Il exigeait que je lui envoie ma position toutes les heures.',
    'controle',
    'fr',
  ],
  [
    'Mon ex coupait ma carte bancaire pour que je ne sorte pas.',
    'controle',
    'fr éco',
  ],
  ['Je n’avais pas le droit de travailler.', 'controle', 'fr'],
  ['Il m’empêchait de voir ma famille.', 'controle', 'fr'],
  [
    'Ma future femme devra me demander la permission pour sortir.',
    'controle',
    'fr auteur',
  ],
  ['Il installait des applis espion sur mon portable.', 'controle', 'fr'],
  ['He wouldn’t let me see my friends.', 'controle', 'en'],
  ['He took my passport and my wages.', 'controle', 'en'],
  [
    'Il gérait tout mon argent, je devais lui demander pour acheter du pain.',
    'controle',
    'fr éco',
  ],
  ['Mon gars fouillait mon tél tous les jours.', 'controle', 'nouchi/sms'],
  // détresse
  [
    'Je n’en peux plus de vivre comme ça, parfois je pense à tout arrêter.',
    'detresse',
    'fr',
  ],
  [
    'J’ai pris des cachets l’année dernière pour ne plus me réveiller.',
    'detresse',
    'fr tentative',
  ],
  ['Personne ne remarquerait si je n’étais plus là.', 'detresse', 'fr'],
  ['Je pense souvent à la mort ces temps-ci.', 'detresse', 'fr'],
  [
    'Sometimes I think everyone would be better off without me.',
    'detresse',
    'en',
  ],
  ['jsuis fatigué de la vie, jveux mourir', 'detresse', 'sms'],
  ['Mwen anvi mouri.', 'detresse', 'créole haïtien'],
  ['Man lé mò.', 'detresse', 'créole martiniquais'],
  ['La vie ne vaut plus rien pour moi.', 'detresse', 'fr'],
  ['Je veux me pendre.', 'detresse', 'fr'],
  // argent
  [
    'Ma mère est malade au village, envoie-moi juste 30 000 pour les médicaments.',
    'argent',
    'afrique',
  ],
  ['Tu peux me dépanner de 100 balles ?', 'argent', 'fr'],
  ['Fais-moi un Orange Money stp, je suis bloquée.', 'argent', 'afrique'],
  ['Can you send me a gift card? I’ll pay you back.', 'argent', 'en'],
  ['J’ai besoin de 200 € pour mon visa, tu peux m’aider ?', 'argent', 'fr'],
  ['Envoie-moi un peu l’wari pour le transport.', 'argent', 'nouchi'],
  ['Tu peux m’envoyer les do pour le taxi ?', 'argent', 'camfranglais'],
  [
    'Je suis coincé à la douane, il me faut 150 000 francs.',
    'argent',
    'afrique',
  ],
  ['stp vir moi 50e', 'argent', 'sms'],
  ['Mets-moi du crédit stp.', 'argent', 'afrique'],
  // mineur
  ['J’ai dix-sept ans mais je suis mature.', 'mineur', 'fr'],
  ['Je suis en 1ère S.', 'mineur', 'fr'],
  ['jsui en 3eme', 'mineur', 'sms'],
  ['I’m in 10th grade.', 'mineur', 'en'],
  ['J’aurai 18 ans en décembre.', 'mineur', 'fr'],
  [
    'Mes parents ne savent pas que je suis ici, je suis encore au collège.',
    'mineur',
    'fr',
  ],

  [
    'Mon ancien compagnon me giflait devant les enfants.',
    'violence_subie',
    'corpus 2',
  ],
  ['Il me tapait dessus quand il avait bu.', 'violence_subie', 'corpus 2'],
  [
    'Pendant cinq ans j’ai pris des coups sans rien dire.',
    'violence_subie',
    'corpus 2',
  ],
  [
    'Mon ex m’a déjà étranglée pendant une dispute.',
    'violence_subie',
    'corpus 2',
  ],
  [
    'Il m’enfermait dans la chambre et me frappait.',
    'violence_subie',
    'corpus 2',
  ],
  [
    'Mon premier mari me battait, je suis partie avec ma fille.',
    'violence_subie',
    'corpus 2',
  ],
  ['J’ai été violée par mon ex conjoint.', 'violence_subie', 'corpus 2'],
  ['He used to punch me when I talked back.', 'violence_subie', 'corpus 2'],
  ['My husband beat me for years.', 'violence_subie', 'corpus 2'],
  [
    'Il me traitait comme un chien et me cognait.',
    'violence_subie',
    'corpus 2',
  ],
  ['Mon mari me donnait des coups de ceinture.', 'violence_subie', 'corpus 2'],
  ['Il m’a poussée dans les escaliers.', 'violence_subie', 'corpus 2'],
  [
    'Quand je l’énerve, je lui mets une gifle, c’est normal.',
    'violence_exercee',
    'corpus 2',
  ],
  [
    'J’ai déjà frappé ma copine, je ne suis pas fier.',
    'violence_exercee',
    'corpus 2',
  ],
  ['Une femme qui me répond, je la corrige.', 'violence_exercee', 'corpus 2'],
  [
    'Il m’arrive de la secouer quand elle crie.',
    'violence_exercee',
    'corpus 2',
  ],
  ['I hit my girlfriend once.', 'violence_exercee', 'corpus 2'],
  ['Si elle me trompe, je la tuerai.', 'menace', 'corpus 2'],
  [
    'Si tu me quittes, tu ne reverras jamais tes enfants.',
    'menace',
    'corpus 2',
  ],
  ['Il m’a dit qu’il me tuerait si je partais.', 'menace', 'corpus 2'],
  ['Elle va le regretter si elle me quitte.', 'menace', 'corpus 2'],
  ['Mon ex menace de publier mes photos intimes.', 'menace', 'corpus 2'],
  ['If you leave me I will kill you.', 'menace', 'corpus 2'],
  [
    'Il lisait tous mes messages et je devais lui donner mon code.',
    'controle',
    'corpus 2',
  ],
  ['Mon mari m’interdisait de voir mes amies.', 'controle', 'corpus 2'],
  ['Il a pris mon passeport pour que je ne parte pas.', 'controle', 'corpus 2'],
  [
    'Ma femme devra me demander l’autorisation pour sortir.',
    'controle',
    'corpus 2',
  ],
  ['Il contrôlait chaque centime de mon salaire.', 'controle', 'corpus 2'],
  ['Je vérifierai son téléphone tous les jours.', 'controle', 'corpus 2'],
  ['He tracked my location all the time.', 'controle', 'corpus 2'],
  ['J’ai envie de mourir depuis quelques mois.', 'detresse', 'corpus 2'],
  [
    'Parfois je me dis que ce serait mieux si je n’existais plus.',
    'detresse',
    'corpus 2',
  ],
  ['Je pense au suicide.', 'detresse', 'corpus 2'],
  ['Je n’ai plus goût à rien, j’ai envie d’en finir.', 'detresse', 'corpus 2'],
  ['I want to end my life.', 'detresse', 'corpus 2'],
  ['Je me scarifie quand ça va mal.', 'detresse', 'corpus 2'],
  ['Peux-tu m’envoyer 200 euros pour mon billet ?', 'argent', 'corpus 2'],
  ['Envoie-moi un peu d’argent par Western Union stp.', 'argent', 'corpus 2'],
  [
    'Fais-moi un transfert Orange Money, je te rembourse.',
    'argent',
    'corpus 2',
  ],
  ['Can you send me money for the visa?', 'argent', 'corpus 2'],
  ['Achète-moi des cartes cadeaux Google Play.', 'argent', 'corpus 2'],
  ['J’ai 16 ans.', 'mineur', 'corpus 2'],
  ['Je suis en terminale cette année.', 'mineur', 'corpus 2'],
  ['Je suis née en 2011.', 'mineur', 'corpus 2'],
  ['I am 15 years old.', 'mineur', 'corpus 2'],
  ['mon ex me tapé tt le tps', 'violence_subie', 'corpus 2'],
  ['jvais la frapper si elle continue', 'violence_exercee', 'corpus 2'],
  ['si tu pars jte tue', 'menace', 'corpus 2'],
  ['jveux mourir', 'detresse', 'corpus 2'],
  ['envoi moi 50k stp', 'argent', 'corpus 2'],
];

const HEALTHY: Case[] = [
  ['Je ne supporte pas qu’on me frappe.', null, 'limite'],
  ['Je ne veux pas qu’on me rabaisse devant mes amis.', null, 'limite'],
  // souvenirs d'enfance
  [
    'Mon père nous frappait avec la ceinture quand on rentrait tard, je ne reproduirai jamais ça.',
    null,
    'enfance',
  ],
  [
    'Ma mère me tapait sur les doigts quand je mangeais avec la main gauche.',
    null,
    'enfance',
  ],
  [
    'Mon grand frère me cognait quand on jouait au foot, rien de grave.',
    null,
    'enfance fratrie',
  ],
  ['Manman mwen te konn bat mwen lè m te piti.', null, 'enfance créole'],
  [
    'Ma mère m’a menacé de me priver de sortie quand j’étais ado.',
    null,
    'enfance',
  ],
  // idiomes
  ['Ce qui m’a frappé chez mes parents, c’est leur patience.', null, 'idiome'],
  ['La nouvelle m’a frappée de plein fouet.', null, 'idiome'],
  ['Mon patron m’a tapé sur l’épaule pour me féliciter.', null, 'idiome'],
  ['Mon équipe m’a battu au tournoi de belote.', null, 'idiome'],
  ['J’ai été battu en finale du tournoi de foot.', null, 'sport'],
  ['My dad used to beat me at chess every Sunday.', null, 'en idiome'],
  ['That movie really hit me hard.', null, 'en idiome'],
  ['Je me suis fait taper par le soleil à Dakar.', null, 'idiome'],
  [
    'Je vais mourir de rire si tu me poses cette question en face.',
    null,
    'idiome',
  ],
  ['Je meurs d’envie de fonder une famille.', null, 'idiome'],
  [
    'Tu vas le regretter si tu ne goûtes pas le ndolé de ma mère !',
    null,
    'humour',
  ],
  ['On va s’enjailler au mariage, c’est sûr.', null, 'nouchi'],
  ['Je suis en première ligne dans mon travail d’infirmière.', null, 'idiome'],
  ['Je suis en seconde position dans ma fratrie de cinq.', null, 'famille'],
  // envois familiaux, entraide
  [
    'J’envoie 100 000 FCFA à ma tante chaque mois pour l’école de ses enfants.',
    null,
    'diaspora',
  ],
  ['Si mon frère a besoin, je peux lui envoyer de l’argent.', null, 'famille'],
  [
    'Ma sœur m’a demandé de lui prêter 200 euros, j’ai dit oui.',
    null,
    'famille',
  ],
  [
    'Mes parents m’envoyaient de l’argent quand j’étais étudiant.',
    null,
    'famille',
  ],
  [
    'Quand j’ai besoin, ma famille peut m’aider avec un transfert.',
    null,
    'famille',
  ],
  [
    'Mon frère m’avance parfois de l’argent, et je le rembourse.',
    null,
    'famille',
  ],
  [
    'Wave, c’est ce que j’utilise pour envoyer de l’argent à ma mère.',
    null,
    'afrique',
  ],
  // limites saines
  ['Je ne laisserais jamais personne fouiller mon téléphone.', null, 'limite'],
  [
    'Pour moi, regarder les messages de l’autre, c’est une trahison.',
    null,
    'limite',
  ],
  ['Je ne veux pas d’un homme qui contrôle mon téléphone.', null, 'limite'],
  ['Je refuse qu’on vérifie mes messages.', null, 'limite'],
  ['S’il fouille mon téléphone, c’est fini entre nous.', null, 'limite'],
  [
    'Je n’accepterai jamais qu’on m’interdise de voir ma famille.',
    null,
    'limite',
  ],
  [
    'Ma grand-mère disait : un homme qui lève la main sur une femme perd son honneur.',
    null,
    'limite transmise',
  ],
  [
    'Jamais lever la main sur une femme, c’est ce que mon père m’a appris.',
    null,
    'limite transmise',
  ],
  ['Lever la main sur sa femme, c’est une honte.', null, 'limite'],
  ['Donner une gifle à sa femme, c’est inacceptable.', null, 'limite'],
  ['Recevoir des coups, jamais : je partirais le jour même.', null, 'limite'],
  [
    'Les violences conjugales, j’en ai vu chez ma tante, je n’en veux jamais.',
    null,
    'témoin',
  ],
  [
    'Je suis bénévole dans une association contre les violences domestiques.',
    null,
    'engagement',
  ],
  [
    'Un mari qui confisque le salaire de sa femme, pour moi c’est non.',
    null,
    'limite',
  ],
  // aide à un parent, vie courante
  [
    'Je lis les messages de ma mère pour l’aider, elle ne voit plus bien.',
    null,
    'aidant',
  ],
  [
    'Ma femme et moi on partagera nos codes, si elle est d’accord.',
    null,
    'consentement',
  ],
  ['Mon fils a 15 ans et il vit avec moi.', null, 'parent'],
  ['J’avais 16 ans quand j’ai perdu mon père.', null, 'passé'],
  ['J’ai 17 ans de mariage derrière moi, je suis veuve.', null, 'durée'],
  ['Je suis prêt à mourir pour mes enfants.', null, 'idiome'],
  ['Je me suis fait mal au dos au travail.', null, 'santé'],
  ['Je me fais du souci pour ma mère.', null, 'souci'],
  ['Je veux en finir avec les relations à distance.', null, 'idiome'],

  ['Ce qui me touche chez mes parents, c’est leur fidélité.', null, 'corpus 2'],
  ['Je ne supporterais jamais qu’on lève la main sur moi.', null, 'corpus 2'],
  ['Pour moi la violence n’a pas sa place dans un couple.', null, 'corpus 2'],
  ['Si un homme me frappait, je partirais le jour même.', null, 'corpus 2'],
  ['Je n’accepterai jamais qu’on me manque de respect.', null, 'corpus 2'],
  ['Je ne veux pas qu’on me rabaisse devant mes amis.', null, 'corpus 2'],
  [
    'Ma mère me tapait quand j’étais petit, comme beaucoup à l’époque.',
    null,
    'corpus 2',
  ],
  ['Le film m’a frappé par sa justesse.', null, 'corpus 2'],
  ['On s’est battus pour obtenir notre maison.', null, 'corpus 2'],
  ['Je me bats tous les jours pour mes enfants.', null, 'corpus 2'],
  ['J’envoie de l’argent à ma mère chaque mois.', null, 'corpus 2'],
  ['Ma famille m’aide quand j’ai besoin.', null, 'corpus 2'],
  ['Je gère mon argent seule et j’aime ça.', null, 'corpus 2'],
  ['Mon mari gère notre budget, ça me convient.', null, 'corpus 2'],
  [
    'Je regarde parfois le téléphone de mon fils pour le protéger.',
    null,
    'corpus 2',
  ],
  ['J’ai 34 ans et deux enfants.', null, 'corpus 2'],
  ['Je suis en seconde année de master.', null, 'corpus 2'],
  ['Je suis né en 1990 à Abidjan.', null, 'corpus 2'],
  [
    'Je travaille dans une association d’aide aux femmes victimes de violences.',
    null,
    'corpus 2',
  ],
  ['Je suis infirmière aux urgences.', null, 'corpus 2'],
  ['Je pense souvent à mon avenir.', null, 'corpus 2'],
  ['J’ai traversé un deuil difficile l’an dernier.', null, 'corpus 2'],
  ['Je ressens parfois de la tristesse le dimanche soir.', null, 'corpus 2'],
  ['Je préfère qu’on décide ensemble des grosses dépenses.', null, 'corpus 2'],
  [
    'Je veux qu’on se dise tout, sans fouiller le téléphone de l’autre.',
    null,
    'corpus 2',
  ],
  ['Le contrôle, très peu pour moi.', null, 'corpus 2'],
  ['Je tue le temps en lisant.', null, 'corpus 2'],
  ['Cette série m’a tué de rire.', null, 'corpus 2'],
  ['Il faut savoir pardonner.', null, 'corpus 2'],
  ['Je suis jaloux mais je me soigne.', null, 'corpus 2'],
  ['Je ne laisserai personne me contrôler.', null, 'corpus 2'],
  ['My parents argued a lot but never hit each other.', null, 'corpus 2'],
  ['I would never hit a woman.', null, 'corpus 2'],
  ['Ma petite sœur a 15 ans.', null, 'corpus 2'],
  ['Mon fils est au lycée.', null, 'corpus 2'],
  ['Je donne des cours au collège.', null, 'corpus 2'],
  ['Envoyer de l’argent au pays fait partie de ma culture.', null, 'corpus 2'],
  ['Je demanderai son avis à ma famille avant de me marier.', null, 'corpus 2'],
  ['J’ai eu des moments de déprime mais ça va mieux.', null, 'corpus 2'],
  ['Un homme qui frappe une femme n’est pas un homme.', null, 'corpus 2'],
  ['Les coups de cœur, j’y crois.', null, 'corpus 2'],
  ['Mon frère me taquinait beaucoup quand on était petits.', null, 'corpus 2'],
  ['Je me sens parfois seule, sans plus.', null, 'corpus 2'],
  ['Si on se dispute, je sors marcher pour me calmer.', null, 'corpus 2'],
  [
    'Ma copine lit mes messages si elle veut, je n’ai rien à cacher.',
    null,
    'corpus 2',
  ],
];

describe('Repérage des dangers — corpus de non-régression', () => {
  it('chaque phrase à risque est repérée (rappel ≥ 95 % par catégorie, 98 % au total)', () => {
    const missed = POSITIVE.filter(([t]) => dangerCategories(t).length === 0);
    const byCategory = new Map<string, { total: number; missed: number }>();
    for (const [t, exp] of POSITIVE) {
      const c = byCategory.get(exp ?? '') ?? { total: 0, missed: 0 };
      c.total++;
      if (dangerCategories(t).length === 0) c.missed++;
      byCategory.set(exp ?? '', c);
    }
    for (const [category, c] of byCategory)
      expect({
        category,
        recall: (c.total - c.missed) / c.total >= 0.95,
      }).toEqual({
        category,
        recall: true,
      });
    expect(missed.length / POSITIVE.length).toBeLessThanOrEqual(0.02);
  });

  it('aucune phrase saine ne retient la messagerie, presque aucune n’est signalée', () => {
    const flagged = HEALTHY.filter(([t]) => dangerCategories(t).length > 0);
    const holding = HEALTHY.filter(([t]) => holdsSafety(dangerCategories(t)));
    expect(holding.map(([t]) => t)).toEqual([]);
    expect(flagged.length / HEALTHY.length).toBeLessThanOrEqual(0.02);
  });
});
