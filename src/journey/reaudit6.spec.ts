/**
 * Sixième contre-audit : attribution victime ou auteur, réponses de limite,
 * refus toujours tracés, classement tardif des parcours non payés, filtres
 * de lecture et de question, alertes en plusieurs objets.
 */
import { BadRequestException } from '@nestjs/common';
import { containsSondeurContact } from '../moderation/chat-moderation';
import { isWellFormedQuestion } from './clinical-lens';
import {
  SondeurSafety,
  parseSondeurReport,
  refusalHolds,
} from './journey-insights.service';
import { JourneyService } from './journey.service';
import {
  dangerCategories,
  holdsSafety,
  parseAlert,
  readingText,
} from './sondeur-insights';

describe('Sixième contre-audit : qui est victime, qui est auteur', () => {
  it.each([
    // Celui qui écrit impose le contrôle ou menace : jamais « victime ».
    ['Ma femme ne sortira pas sans ma permission.', 'controle'],
    [
      "Mon mari ne dépensera rien sans mon autorisation, c'est moi qui gère.",
      'controle',
    ],
    ["Elle m'a menti, donc maintenant je garde son passeport.", 'controle'],
    [
      "Ma femme me donnera ses mots de passe, c'est normal dans un couple.",
      'controle',
    ],
    ['Je surveille son téléphone, ça me va comme ça.', 'controle'],
    [
      'Elle ne partira jamais avec mes enfants, je préfère tout brûler.',
      'menace',
    ],
    ['Je jure que celui qui touche à ma femme finira à la morgue.', 'menace'],
    ["Qu'elle essaie de me quitter, elle va voir.", 'menace'],
    // La victime cite son agresseur ou se défend : « violence subie ».
    [
      'Il me menaçait : « tu ne verras plus jamais tes enfants ».',
      'violence_subie',
    ],
    ['Mon ex me disait : « si tu pars, je te tue ».', 'violence_subie'],
    [
      "Mon ex fouillait mon portable ; un jour je l'ai menacé d'appeler la police.",
      'violence_subie',
    ],
    [
      'Il me suivait jusqu’au boulot et appelait mes collègues.',
      'violence_subie',
    ],
  ])('« %s » → %s', (text, expected) => {
    expect(dangerCategories(text)).toContain(expected);
    if (expected !== 'violence_subie')
      expect(dangerCategories(text)).not.toContain('violence_subie');
  });
});

describe('Sixième contre-audit : réponses de limite et phrases saines', () => {
  it.each([
    'Me frapper, même une seule fois.',
    "Si un jour il me gifle, c'est terminé.",
    'Me menacer, même pour rire.',
    "M'empêcher de voir ma famille.",
    'Toute violence physique, même une poussée.',
    "If he ever hits me, I'm gone.",
    "Qu'il prenne mon salaire ou mes papiers.",
    'J’ai pris une claque en voyant les paysages du Cap-Vert.',
    "I'm 17 years into my nursing career.",
    'Je suis avocate en droit de la famille, je défends des victimes de violences conjugales.',
    "Je regarde le téléphone de mon père pour l'aider avec ses applis.",
    'Mon cousin m’a appris la boxe, il me tapait gentiment.',
    'Mes parents m’interdisaient de sortir le soir.',
    'Je trouve malsain de fouiller le téléphone de son conjoint.',
    'J’envoie 100 000 FCFA à ma tante chaque mois pour l’école de ses enfants.',
  ])('« %s » ne retient pas la messagerie', (text) => {
    expect(holdsSafety(dangerCategories(text))).toBe(false);
  });
});

describe('Sixième contre-audit : tournures repérées par le code', () => {
  it.each([
    [
      'Il me balançait contre les murs quand je rentrais tard.',
      'violence_subie',
    ],
    ["J'ai déjà secoué ma copine un peu fort.", 'violence_exercee'],
    ['I slapped my ex once.', 'violence_exercee'],
    ['Si une femme me quitte, je ferai de sa vie un enfer.', 'menace'],
    ['Je vérifie le WhatsApp de ma copine quand elle dort.', 'controle'],
    ["Je ne vois plus l'intérêt de me lever le matin.", 'detresse'],
    ['jveu mourir jsui fatiguée de tt', 'detresse'],
    ['Envoie 50 000 par Orange Money et je te raconte tout.', 'argent'],
    ["Je viens d'avoir seize ans.", 'mineur'],
  ])('« %s » → %s', (text, expected) => {
    expect(dangerCategories(text)).toContain(expected);
  });
});

describe('Sixième contre-audit : coordonnées dans le Sondeur', () => {
  it.each([
    ['Mon mari lisait mes messages Messenger tous les soirs.', false],
    ['On s’est connus sur Facebook il y a longtemps.', false],
    ['Je suis toujours sur Instagram pour mon travail.', false],
    ['Ajoute-moi sur Snap !', true],
    ['Mon insta : awa_93', true],
    ['Écris-moi au 07 12 34 56 78', true],
    ['awa@exemple.fr', true],
  ])('« %s » → %s', (text, expected) => {
    expect(containsSondeurContact(text)).toBe(expected);
  });
});

describe('Sixième contre-audit : circuit à l’envoi', () => {
  const setup = (
    moderation: { allowed: boolean; danger?: string[]; reason?: string },
    paid = true,
  ) => {
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
    return { service, prisma, ai, insights };
  };

  it('une confidence qui nomme une messagerie est enregistrée, pas refusée', async () => {
    const { service, prisma } = setup({ allowed: true, danger: [] });
    await service.respondToQuestion(
      'q1',
      'a',
      'Mon mari lisait mes messages Messenger et me surveillait.',
    );
    expect(prisma.harmonyResponse.create).toHaveBeenCalled();
  });

  it('des coordonnées refusées laissent une trace, avec les dangers vus par le code', async () => {
    const { service, insights } = setup({ allowed: true, danger: [] });
    await expect(
      service.respondToQuestion(
        'q1',
        'b',
        'Envoie 50 000 sur mon Wave au 07 12 34 56 78.',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const call = insights.reportRefusal.mock.calls[0] as unknown as unknown[];
    expect(call[5]).toBe('coordonnées');
    expect(call[6]).toContain('argent');
  });

  it('un refus de la modération locale laisse une trace', async () => {
    const { service, insights, prisma } = setup({ allowed: true, danger: [] });
    await expect(
      service.respondToQuestion('q1', 'b', 'Cette salope, je la défonce.'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(insights.reportRefusal).toHaveBeenCalled();
    expect(prisma.harmonyResponse.create).not.toHaveBeenCalled();
  });

  it('parcours non payé : chaque réponse est relue par l’IA, même courte', async () => {
    const { service, ai, insights } = setup(
      { allowed: true, danger: ['menace'] },
      false,
    );
    const text = 'Elle saura ce qu’il en coûte.';
    await service.respondToQuestion('q1', 'b', text);
    expect(ai.moderateSondeurAnswer).toHaveBeenCalledWith(text, 'j1');
    const [, , , , , categories] = insights.reportAnswer.mock
      .calls[0] as unknown as [
      string,
      number,
      string,
      string,
      string,
      string[],
    ];
    expect(categories).toEqual(['menace']);
  });

  it('parcours non payé : fermé par défaut, le danger trouvé après coup remplace « en attente »', async () => {
    jest.useFakeTimers();
    try {
      const { service, ai, insights } = setup({ allowed: true }, false);
      let answer: (m: unknown) => void = () => undefined;
      ai.moderateSondeurAnswer.mockReturnValueOnce(
        new Promise((r) => {
          answer = r;
        }) as never,
      );
      const text = 'Elle saura ce qu’il en coûte.';
      const sent = service.respondToQuestion('q1', 'b', text);
      await jest.advanceTimersByTimeAsync(10_001);
      await sent;
      const [, , , , , categories] = insights.reportAnswer.mock
        .calls[0] as unknown as [
        string,
        number,
        string,
        string,
        string,
        string[],
      ];
      expect(categories).toEqual(['autre']);
      answer({ allowed: true, danger: ['menace'] });
      await jest.advanceTimersByTimeAsync(1);
      expect(insights.resolveClassification).toHaveBeenCalledWith(
        'j1',
        1,
        'b',
        'Que feriez-vous si… ?',
        text,
        ['menace'],
      );
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Sixième contre-audit : refus et messagerie', () => {
  const report = (
    detail: string,
    categories: string[],
    status = 'en_attente',
  ) =>
    parseSondeurReport({
      reportedId: 'b',
      status,
      description: `Signal automatique BOLIGO · Sondeur · parcours j1 · jour 1 · ${detail} · catégorie : x · catégories=[${categories.join(',')}]\n…`,
    })!;

  it('un refus pour insulte ne retient rien ; un refus qui menace, si', () => {
    expect(refusalHolds(['autre'])).toBe(false);
    expect(refusalHolds(['menace'])).toBe(true);
    expect(
      new SondeurSafety([report('refus 0123456789', ['autre'])]).holds,
    ).toBe(false);
    expect(
      new SondeurSafety([report('refus 0123456789', ['menace'])]).holds,
    ).toBe(true);
    expect(
      new SondeurSafety([report('refus 0123456789', ['menace'], 'rejete')])
        .holds,
    ).toBe(false);
  });
});

describe('Sixième contre-audit : alertes et lectures', () => {
  it('une alerte après un brouillon « aucune » est lue', () => {
    expect(
      parseAlert(
        '{"alerte": "aucune"} puis {"fidele": false, "alerte": "menace", "membre": "b"}',
      ),
    ).toEqual({ categories: ['menace'], member: 1 });
  });

  const names: [string, string] = ['Aïcha', 'Gaël'];
  const own: [string, string] = ['Je prie cinq fois.', 'Je ne prie pas.'];
  it.each([
    'Gaël parle de son père avec rancœur.',
    'Aïcha choisit toujours la fuite.',
    "L'un de vous garde le contrôle, l'autre se soumet.",
    'Vos réponses dessinent un couple solide.',
    'Sur la foi, Aïcha écrit prier cinq fois, Gaël écrit ne pas prier ; chacun garderait sa pratique.',
    'Sur les insultes, vous placez la limite à des endroits différents, selon le contexte.',
    'Sur les enfants, mieux vaut savoir maintenant si vous voulez continuer.',
    'Gaël dit que la dot doit être élevée, Aïcha dit symbolique : vous pourrez trouver un montant entre les deux.',
  ])('lecture refusée : « %s »', (text) => {
    expect(readingText(text, 400, names, own)).toBeNull();
  });
  it('une question d’ouverture adressée aux deux passe', () => {
    const text = 'Quelle place chacun de vous donne-t-il au dimanche ?';
    expect(readingText(text, 400, names, own)).toBe(text);
  });
});

describe('Sixième contre-audit : questions de l’IA', () => {
  it.each([
    'Que ressentiriez-vous si votre conjoint vous empoignait le bras pendant un désaccord ?',
    'Si votre conjoint lisait vos SMS en cachette, que lui diriez-vous ?',
    'Comment vivriez-vous le fait de demander à votre conjoint la permission de sortir ?',
    'Si une dispute dégénérait, chez qui pourriez-vous dormir ce soir-là ?',
    'À partir de combien de cris par semaine diriez-vous qu’une relation devient invivable ?',
    'Sur la polygamie, quelle formule intermédiaire pourrait vous convenir à tous les deux ?',
    'Comment s’est passée la fin de votre mariage précédent ?',
    'Votre famille, qui est très présente, accepterait-elle un conjoint étranger ?',
    'Comment dire : la fidélité est-elle négociable pour vous ?',
    'Imagine un dimanche ordinaire : à quoi ressemblerait-il pour vous ?',
    'Comment gérez-vous la colère et comment la montrez-vous à vos proches ?',
    'Qu’est-ce qui vous empêche encore d’accepter la tradition de la dot ?',
  ])('refusée : « %s »', (text) => {
    expect(isWellFormedQuestion(text)).toBe(false);
  });
  it.each([
    'Pensez à une fois, entre proches, où un désaccord sur l’argent s’est bien réglé : qu’est-ce qui était différent ?',
    'D’où vous vient l’idée qu’un couple doit partager la même foi ?',
    'Où placez-vous la frontière entre confiance et surveillance dans un couple ?',
    'Dans votre famille, qui avait le dernier mot, et comment le saviez-vous ?',
  ])('acceptée : « %s »', (text) => {
    expect(isWellFormedQuestion(text)).toBe(true);
  });
});
