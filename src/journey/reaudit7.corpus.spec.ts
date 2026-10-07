/**
 * Septième contre-audit : phrases saines et réponses de limite d'un corpus
 * neuf (aucune ne doit retenir la messagerie), attribution victime ou auteur.
 */
import { BadRequestException } from '@nestjs/common';
import { JourneyService } from './journey.service';
import { dangerCategories, holdsSafety } from './sondeur-insights';

const HEALTHY = [
  'Le dimanche, ma mère et moi on se passe des coups de fil interminables.',
  "J'ai eu des coups de cœur, mais rien de sérieux avant de m'inscrire ici.",
  "J'aimerais en finir avec mes vieilles habitudes de procrastination.",
  "Après une tentative ratée de monter mon restaurant, j'ai appris à demander de l'aide.",
  'Je veux continuer à vivre à Abidjan, près de ma mère et de mes sœurs.',
  "Ma fille est née en 2014, c'est elle ma priorité.",
  "Mon coach sportif va me tuer avec ses séances de cardio, mais j'adore.",
  'Ma sœur me menaçait de tout raconter à maman quand on était petites, on en rit encore.',
  "Je suis au lycée tous les jours : j'y enseigne l'histoire depuis douze ans.",
  "J'ai fêté mes 15 ans au village, c'est mon plus beau souvenir de famille.",
  'Ma mère met 5000 F de côté chaque semaine pour les imprévus, je fais pareil.',
  'Il me faut du temps avant de faire confiance, je ne la donne pas à crédit.',
  'Si je pars vivre en Europe, mes parents vont le regretter : ils comptent sur ma présence.',
  'Je suis bénévole dans une association qui lutte contre les abus sexuels sur les enfants.',
  "J'avais la gorge étranglée par l'émotion le jour du mariage de ma sœur.",
  "Je meurs d'envie de découvrir le Sénégal avec la personne que j'aime.",
  "J'envoie 30 000 F à ma grand-mère chaque fin de mois, c'est sacré.",
  "Mon mari et moi, on gérera nos comptes ensemble, d'un commun accord.",
  "Mes parents m'ont toujours dit : on ne lève jamais la main sur une femme.",
  "Ce qui m'a le plus frappée chez ma grand-mère, c'est sa patience.",
  'Je contrôle mes dépenses avec une appli, ça me rassure.',
  "Je surveille mon alimentation depuis que j'ai couru mon premier marathon.",
  "Mon équipe s'est fait battre en finale, j'étais dégoûté pendant une semaine.",
  'Chez nous, on dit que la patience tue la colère.',
  "Ce film m'a mis une claque, je n'ai pas dormi de la nuit.",
  "Je préfère qu'on partage nos codes Netflix plutôt que nos codes de téléphone, haha.",
  "Ma copine regarde mon téléphone quand elle veut, je n'ai rien à cacher.",
  'Mon fils a 16 ans et il veut déjà se marier, ça me fait rire.',
  "I'm 16 years into my nursing career and still love it.",
  "J'ai 17 ans d'écart avec mon grand frère, il m'a presque élevé.",
  'Je suis en première année de BTS commerce, en alternance.',
  'Je suis en troisième semaine de Carême, la foi me porte.',
  "Je n'ai plus envie de vivre seule, c'est pour ça que je suis ici.",
  "J'ai envie de mourir de rire quand mon neveu imite mon père.",
  'Je suis prête à tout donner pour ma famille, même mon dernier sou.',
  "Chez nous, les enfants demandaient la permission avant de sortir, c'est l'éducation.",
  'Mon père me corrigeait mes devoirs tous les soirs, il était exigeant.',
  'Je garde la carte bancaire de ma mère pour faire ses courses, elle ne marche plus bien.',
  'On a perdu 3-0, ils nous ont battus à plate couture.',
  'Ma grand-mère disait : celui qui frappe sa femme frappe sa propre maison.',
  'Je regarde le portable de mon fils le soir, il a 9 ans.',
  "Je vérifie les messages de ma boîte pro même le dimanche, c'est mon défaut.",
  "Quand j'étais petite, mon grand frère me tapait pour rire, on était inséparables.",
  "Mon ex et moi, on s'est séparés en bons termes, il m'a même aidée à déménager.",
  "Pour moi la jalousie n'est pas une preuve d'amour.",
  'Je travaille comme juriste dans un centre qui accueille des victimes de violences.',
  "Je suis sage-femme et j'accompagne des mamans qui ont subi des violences.",
  'Je donnerais ma vie pour mes enfants.',
  "Ma tante m'a envoyé de l'argent pour mes études, je lui dois beaucoup.",
  'Mon salaire, je le gère seule, et mon futur mari gérera le sien.',
  "Je fais un virement à mes parents tous les mois, c'est normal chez nous.",
  'Ça me tue de voir des couples qui ne se parlent plus.',
  'Je serai toujours là pour celle qui partagera ma vie, même dans les tempêtes.',
  'Je pourrais mourir pour ma foi.',
  "J'ai 45 ans, deux enfants et beaucoup d'amour à donner.",
  "Mon frère m'a menacé de me piquer ma place au foot quand on avait 10 ans.",
  'Mon patron surveille mes horaires de près, ça me stresse un peu.',
  "Vous pouvez me faire confiance sur l'argent : je n'ai jamais emprunté plus de 1000 euros.",
  "Pour moi, prêter 100 000 F à un ami, c'est donner : je n'attends rien en retour.",
  "Ma femme devra me demander avant une grosse dépense, et je ferai pareil avec elle : c'est ça, décider à deux.",
  'Mi ka kouri chak maten pou mwen pa pèdi souf.',
  "Mon grand-père répétait que l'argent ne fait pas le bonheur, mais le travail oui.",
  "I'd die for a good plate of jollof rice, honestly.",
  "Ma mère m'a appris à ne jamais me coucher fâchée.",
  'Kan jsui stressé jsors marcher, ça me calme direct',
  "Je suis encore en deuil de mon père, mais j'avance doucement.",
  "Tu peux me croire, je n'ai jamais demandé un sou à personne.",
  "Mon fils est en 3e au collège, il m'aide à cuisiner le soir.",
];

const LIMITS = [
  "Les coups, même légers, n'ont jamais leur place, ni les insultes.",
  "Lever la main sur sa femme, c'est non, peu importe la colère.",
  "Aucune menace, même pour rire : on ne fait pas peur à quelqu'un qu'on aime.",
  "Fouiller le téléphone de l'autre : pour moi c'est une trahison de la confiance.",
  "Exiger de savoir où l'autre se trouve à chaque minute, ce n'est pas de l'amour.",
  "Isoler quelqu'un de sa famille, ça n'a pas sa place chez moi.",
  'Le respect : on ne frappe pas la personne avec qui on partage son lit.',
  "Mon père n'a jamais frappé ma mère, et c'est le modèle que je veux suivre.",
  "Crier sur l'autre devant les enfants, jamais.",
  'Personne ne devrait avoir peur de rentrer chez soi.',
  "La dignité : une main levée sur sa compagne, c'est la honte de toute une famille.",
  "Une gifle, c'est déjà une gifle de trop.",
  "Me rabaisser devant les autres, même une seule fois, c'est fini.",
  "Lire les messages de son partenaire en cachette, c'est la fin de la confiance.",
  'Aucune violence, ni physique ni verbale, sous aucun prétexte.',
  "Pour moi, la jalousie qui surveille tout n'est pas de l'amour.",
  "Personne n'a le droit de lever la main sur moi, ni sur mes enfants.",
  "Un désaccord en sécurité, c'est quand chacun peut dire non sans craindre une gifle.",
  'Si mon mari me frappe, je pars le jour même.',
  "Interdire à l'autre de voir ses amis : jamais chez moi.",
  "Garder le passeport de sa femme, c'est de la prison, pas du mariage.",
  "Contrôler l'argent de l'autre, c'est lui retirer sa liberté.",
  "Les insultes. Une fois qu'elles sont dites, on ne peut plus les reprendre.",
  'Pas de menaces, pas de chantage aux enfants, pas de coups.',
  "Never hit, never threaten, never humiliate. That's my rule.",
  "If a man ever raises his hand at me, it's over.",
  "Me forcer à quoi que ce soit au lit, c'est non.",
  "On ne fait jamais peur à quelqu'un qu'on aime : mon grand-père le répétait.",
  'Le droit de dire non, et que ce non soit respecté sans menace ni chantage.',
  'Un ton qui reste calme, même quand je suis blessée par une parole.',
  "Suivre la position de l'autre avec une appli, pour moi c'est de la surveillance, pas de la confiance.",
  "Pour moi, aimer ne donne aucun droit sur le téléphone de l'autre.",
  "Qu'il me menace une seule fois et je ne reste pas une minute de plus.",
  "Même en colère, je ne laisserai jamais quelqu'un me rabaisser ou me crier dessus.",
  'Mwen pa janm ap aksepte yon nonm leve men sou mwen.',
  "Chez moi on a appris qu'on ne bat pas sa femme, point.",
  "La frontière, c'est le téléphone : regarder le portable de son mari, c'est déjà trop.",
  "Avoir à demander l'autorisation pour sortir voir mes copines, ça jamais.",
  'Devoir demander la permission pour voir mes parents : ça, jamais.',
  "Qu'on ne me prenne jamais mon salaire ni mes papiers, c'est ma limite.",
  'Les cris, les claques, les portes qui claquent : rien de tout ça chez moi.',
  'No threats, no checking my phone, no telling me who my friends are.',
];

/** Menace ou contrôle racontés : « victim » (jamais auteur) ou « author ». */
const ROLES: Array<[string, 'victim' | 'author']> = [
  ['Celle qui me trompe, je lui fais payer, crois-moi.', 'author'],
  ['Si elle me quitte, elle ne verra plus jamais ses enfants.', 'author'],
  ['Je connais des gens, si tu me trahis tu le paieras.', 'author'],
  ["Une femme qui me quitte, je la retrouve où qu'elle aille.", 'author'],
  ['Si un jour tu me fais honte, tu vas comprendre ta douleur.', 'author'],
  ['Je préviens : celle qui part avec mes enfants, je la tue.', 'author'],
  ["If she ever leaves me, I'll make her life hell.", 'author'],
  ["Je garde des photos d'elle nue, au cas où elle voudrait partir.", 'author'],
  [
    "Qu'elle essaie de me quitter, elle va voir ce qui va lui arriver.",
    'author',
  ],
  ['Si tu me quittes je me jette sous un train, je te préviens.', 'author'],
  [
    'Je vais lui pourrir la vie si elle me fait un enfant dans le dos.',
    'author',
  ],
  ['Ma future femme a intérêt à filer droit, sinon gare à elle.', 'author'],
  ['Quiconque touche à ma femme, je lui casse les dents.', 'author'],
  ["I'll find you wherever you go, remember that.", 'author'],
  [
    "Pour moi celui qui me trompe, je publie tout ce que j'ai sur lui.",
    'author',
  ],
  ['Je ferai de sa vie un enfer si elle me ment.', 'author'],
  [
    "Mon ex sait qu'il ne doit plus croiser ma route, sinon je le tue.",
    'author',
  ],
  ['si tu m trompes jte jure tu vas le regretter', 'author'],
  ['Elle sait que si elle part, je me tue et ce sera sa faute.', 'author'],
  [
    "Moi je règle mes problèmes à la machette, au village c'est comme ça.",
    'author',
  ],
  [
    'Une infidélité et je disparais avec nos enfants au pays, elle ne les reverra jamais.',
    'author',
  ],
  ["If you ever cheat on me, you won't live to tell it.", 'author'],
  ['Si ou kite mwen, m ap touye w.', 'author'],
  ["Mon ex m'a quitté, je sais où elle habite et elle le sait.", 'author'],
  [
    "Ma femme me donnera ses codes, c'est normal entre mari et femme.",
    'author',
  ],
  [
    'Je veux savoir à tout moment où elle se trouve, je lui installerai une appli.',
    'author',
  ],
  [
    "Ma femme n'aura pas le droit de travailler, je ne veux pas qu'elle voie d'autres hommes.",
    'author',
  ],
  [
    "Je lis les SMS de ma copine chaque soir pendant qu'elle se douche.",
    'author',
  ],
  [
    "C'est moi qui garderai la carte bancaire de ma femme, elle dépense trop.",
    'author',
  ],
  ['Ses copines, je les choisis moi-même, les autres dehors.', 'author'],
  [
    "J'ai mis un traceur dans la voiture de ma femme pour savoir où elle va.",
    'author',
  ],
  ["Elle devra me demander avant d'aller chez sa mère.", 'author'],
  [
    "I check my wife's phone every night, she has nothing to hide anyway.",
    'author',
  ],
  ["Je fouille son sac quand elle rentre tard, c'est mon droit.", 'author'],
  ['Ma femme sortira seulement avec moi ou avec ma mère.', 'author'],
  [
    'Je coupe le wifi à ma copine quand elle passe trop de temps à parler aux autres.',
    'author',
  ],
  ["Une épouse n'a pas à avoir d'argent à elle, tout passe par moi.", 'author'],
  [
    "Je contrôle tout ce qu'elle poste sur Facebook avant publication.",
    'author',
  ],
  [
    'Elle ne verra plus ses copines une fois mariée, ce sont elles qui mettent des idées dans sa tête.',
    'author',
  ],
  ['Je veux le mot de passe de son téléphone dès le premier mois.', 'author'],
  [
    "Chez moi, la femme demande la permission pour sortir, c'est comme ça.",
    'author',
  ],
  ['jveu savoir ki elle parle tt le tps, jregard son tel', 'author'],
  ['Je surveille les dépenses de ma femme au centime près.', 'author'],
  ["I don't let my girlfriend go out without me.", 'author'],
  [
    'Sa paie sera versée sur mon compte, je lui donnerai ce dont elle a besoin.',
    'author',
  ],
  [
    "J'exige sa localisation en permanence, sinon c'est qu'elle cache quelque chose.",
    'author',
  ],
  [
    "Ma femme me dit souvent que je suis jaloux, c'est vrai que je lis ses messages.",
    'author',
  ],
  [
    "Elle m'a trompé, alors maintenant je contrôle son téléphone tous les jours.",
    'author',
  ],
  [
    "Mon ex disait que j'étais possessif ; je surveillais juste ses sorties, comme tout homme.",
    'author',
  ],
  [
    'Mon ex-mari fouillait mon téléphone tous les soirs et me demandait des comptes.',
    'victim',
  ],
  [
    'Il me menaçait de partir avec les enfants au pays si je le quittais.',
    'victim',
  ],
  ["Mon ancien compagnon m'interdisait de voir mes sœurs.", 'victim'],
  [
    'Pendant notre mariage, il gardait mon salaire et me donnait de quoi acheter le pain.',
    'victim',
  ],
  ['She tracked my location 24/7 and called me twenty times a day.', 'victim'],
  ['Mon ex me disait : « Si tu me quittes, je te retrouverai. »', 'victim'],
  [
    "Il m'a dit que si je partais, je ne reverrais jamais mes enfants.",
    'victim',
  ],
  ['Mon mari me surveillait avec une appli sur mon portable.', 'victim'],
  [
    "Quand j'étais avec lui, je devais lui rendre compte de chaque centime.",
    'victim',
  ],
  [
    "Mon ex-copain m'a menacée de mettre nos photos intimes en ligne.",
    'victim',
  ],
  ['My ex threatened to kill me if I ever dated again.', 'victim'],
  [
    "Mon copain d'avant lisait tous mes messages et cassait mon téléphone.",
    'victim',
  ],
  [
    "Avec lui, impossible de sortir sans sa permission, même pour aller à l'église.",
    'victim',
  ],
  ['Mon ex-femme me faisait suivre par son frère.', 'victim'],
  [
    "Le père de mes enfants m'a pris mon passeport pour que je ne parte pas.",
    'victim',
  ],
  [
    "Il me répétait que j'étais à lui et qu'aucun autre homme ne me toucherait vivant.",
    'victim',
  ],
  [
    "Mon premier mari m'appelait vingt fois par jour pour savoir où j'étais.",
    'victim',
  ],
  [
    "Elle m'a menacé de dire à tout le monde que je l'avais frappée si je partais.",
    'victim',
  ],
  ['kan jété avc lui il control tt mon argent é mon tel', 'victim'],
  ['Li te konn menase m ak yon kouto.', 'victim'],
  ['Mon fiancé exigeait mes codes et vérifiait mes appels.', 'victim'],
  ["Il me criait : « Tu ne sortiras pas d'ici sans moi ! »", 'victim'],
  [
    "Mon ex me hurlait dessus en disant tu vas voir ce qui va t'arriver si tu pars.",
    'victim',
  ],
];

describe('Septième contre-audit : corpus neuf', () => {
  it('aucune phrase saine ne retient la messagerie', () => {
    expect(HEALTHY.filter((t) => holdsSafety(dangerCategories(t)))).toEqual([]);
  });
  it('aucune réponse de limite ne retient la messagerie', () => {
    expect(LIMITS.filter((t) => holdsSafety(dangerCategories(t)))).toEqual([]);
  });
  it('une victime repérée n’est jamais classée auteur, un auteur jamais victime', () => {
    const wrong = ROLES.filter(([t, role]) => {
      const found = dangerCategories(t);
      if (!found.length) return false;
      return role === 'victim'
        ? holdsSafety(found)
        : found.length > 0 && !holdsSafety(found);
    }).map(([t]) => t);
    expect(wrong).toEqual([]);
  });
});

describe('Septième contre-audit : circuit à l’envoi', () => {
  const setup = (moderation: Record<string, unknown>, paid = true) => {
    const prisma = {
      harmonyQuestion: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: 'q1',
            day: 1,
            questionText: 'Que feriez-vous si… ?',
            journeyId: 'j1',
            journey: {
              id: 'j1',
              userAId: 'a',
              userBId: 'b',
              currentStep: 'phase_harmonie',
              stepStartDate: new Date(),
            },
            responses: [],
          }),
        ),
      },
      harmonyResponse: { create: jest.fn(() => Promise.resolve({ id: 'r1' })) },
      journey: { findUnique: jest.fn(() => Promise.resolve(null)) },
    };
    const ai = {
      journeyAiEligible: jest.fn(() => Promise.resolve(paid)),
      moderateSondeurAnswer: jest.fn(() => Promise.resolve(moderation)),
    };
    const insights = {
      reportAnswer: jest.fn(() => Promise.resolve()),
      reportRefusal: jest.fn(() => Promise.resolve()),
      resolveClassification: jest.fn(() => Promise.resolve()),
      refresh: jest.fn(() => Promise.resolve()),
      holdsChat: jest.fn(() => Promise.resolve(true)),
    };
    const service = new JourneyService(
      prisma as never,
      ai as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      insights as never,
    );
    return { service, prisma, insights };
  };

  it('parcours non payé et IA indisponible : réponse cachée, « en attente de classement »', async () => {
    const { service, insights } = setup(
      { allowed: true, danger: [], unavailable: true },
      false,
    );
    await service.respondToQuestion('q1', 'b', 'Elle saura ce qu’il en coûte.');
    const call = insights.reportAnswer.mock.calls[0] as unknown as unknown[];
    expect(call[5]).toEqual(['autre']);
    expect(String(call[6])).toMatch(/Classement de l'IA en attente/);
  });

  it('confidence jointe à une insulte refusée par l’IA : enregistrée mais cachée', async () => {
    const { service, insights } = setup({
      allowed: true,
      refused: true,
      category: 'harassment',
      danger: ['violence_subie'],
    });
    await service.respondToQuestion(
      'q1',
      'a',
      'Mon ex me frappait. Et toi tu dois être pareil.',
    );
    const call = insights.reportAnswer.mock.calls[0] as unknown as unknown[];
    expect(call[5]).toEqual(
      expect.arrayContaining(['violence_subie', 'autre']),
    );
  });

  it('refus de la modération locale : relu par l’IA, ses dangers vont au signalement', async () => {
    const { service, insights } = setup({ allowed: true, danger: ['menace'] });
    await expect(
      service.respondToQuestion('q1', 'b', 'Cette salope, je la retrouve.'),
    ).rejects.toBeInstanceOf(BadRequestException);
    const call = insights.reportRefusal.mock.calls[0] as unknown as unknown[];
    expect(call[6]).toEqual(['menace']);
  });
});
