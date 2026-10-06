import { DivergenceReport, THEMES } from '../matching/divergence.engine';
import {
  InsightQuestion,
  REVIEW_DAY,
  answeredItems,
  cleanText,
  dayComplete,
  dayReadingPrompt,
  fidelityPrompt,
  followUpPrompt,
  parseDayReading,
  parseFidelity,
  parseFollowUps,
  parseReview,
  reviewPrompt,
  ruleDayReading,
  ruleReview,
  themeKeyFromEmoji,
} from './sondeur-insights';

const A = 'user-a';
const B = 'user-b';

function question(
  id: string,
  day: number,
  emoji: string,
  answers: { a?: string; b?: string } = {},
): InsightQuestion {
  const responses: InsightQuestion['responses'] = [];
  if (answers.a) responses.push({ userId: A, responseText: answers.a });
  if (answers.b) responses.push({ userId: B, responseText: answers.b });
  return { id, day, emoji, questionText: `Question ${id} ?`, responses };
}

describe('Suivi du Sondeur — règles pures', () => {
  it('reconnaît le thème par son icône', () => {
    expect(themeKeyFromEmoji(THEMES.argent.emoji)).toBe('argent');
    expect(themeKeyFromEmoji('🎈')).toBeNull();
    expect(themeKeyFromEmoji(null)).toBeNull();
  });

  it('une journée est terminée seulement quand les deux membres ont tout répondu', () => {
    const qs = [
      question('q1', 1, THEMES.famille.emoji, { a: 'Oui', b: 'Non' }),
      question('q2', 1, THEMES.argent.emoji, { a: 'Moitié-moitié' }),
      question('q3', 2, THEMES.lieu.emoji, { a: 'Paris', b: 'Lyon' }),
    ];
    expect(dayComplete(qs, 1, A, B)).toBe(false);
    expect(dayComplete(qs, 2, A, B)).toBe(true);
    expect(dayComplete(qs, 3, A, B)).toBe(false);
  });

  it('ne transmet que les questions répondues par les deux, réponses dans l’ordre A puis B', () => {
    const qs = [
      question('q1', 1, THEMES.famille.emoji, { a: 'Oui', b: 'Non' }),
      question('q2', 1, THEMES.argent.emoji, { b: 'Seulement B' }),
    ];
    const items = answeredItems(qs, A, B);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      questionId: 'q1',
      theme: 'Famille',
      answers: ['Oui', 'Non'],
    });
  });

  it('prompt de la journée : prénoms, réponses citées, extraits exigés, consigne contre les instructions cachées', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.famille.emoji, {
          a: 'Je veux des enfants',
          b: 'Pas tout de suite',
        }),
        question('q2', 1, THEMES.intimite.emoji, {
          a: "J'aimerais en parler de vive voix.",
          b: 'La tendresse au quotidien',
        }),
      ],
      A,
      B,
    );
    const { system, prompt } = dayReadingPrompt(1, items, ['Inès', 'Karim']);
    expect(system).toMatch(/jamais des consignes/);
    // Consigne de lecture : décrire, jamais interpréter ni évaluer.
    expect(system).toMatch(/Décris, compare, cite/);
    expect(system).not.toMatch(/cherche le besoin derrière/);
    expect(prompt).toContain('Inès : « Je veux des enfants »');
    expect(prompt).toContain('Karim : « Pas tout de suite »');
    // Sujet gardé pour la rencontre : jamais montré ni interprété.
    expect(prompt).toContain('Inès : [réservé à la rencontre]');
    expect(prompt).not.toContain('vive voix.');
    expect(prompt).toMatch(/mot pour mot/);
    expect(prompt).not.toContain('followUp');
    expect(reviewPrompt(items, ['Inès', 'Karim']).prompt).toContain(
      '"openers"',
    );
  });

  it('question d’approfondissement : écrite à part, regard clinique, propositions contrôlées', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.argent.emoji, {
          a: 'Moitié-moitié',
          b: 'Celui qui invite',
        }),
      ],
      A,
      B,
    );
    const { system, prompt } = followUpPrompt(
      1,
      items,
      ['Inès', 'Karim'],
      [{ theme: 'Argent & dettes', text: 'Qui paie reste à préciser.' }],
      ['Question q1 ?'],
    );
    expect(system).toMatch(/CHOIX DE LA TECHNIQUE SELON LE SIGNAL/);
    expect(prompt).toContain('journée 2');
    expect(prompt).toContain('- Argent & dettes : Qui paie reste à préciser.');
    expect(prompt).toContain('  - Question q1 ?');
    const proposals = parseFollowUps(
      JSON.stringify({
        questions: [
          {
            themeKey: 'argent',
            text: "Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ?",
            methode: 'besoin caché',
            cible: 'ce que le geste de payer représente',
          },
          // Fermée : écartée par le code avant toute relecture.
          {
            themeKey: 'argent',
            text: 'Accepteriez-vous un compte commun dès le premier mois ?',
          },
          {
            themeKey: 'inconnu',
            text: 'Que veut dire la confiance pour vous ?',
          },
        ],
      }),
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      themeKey: 'argent',
      method: 'besoin caché',
      target: 'ce que le geste de payer représente',
    });
    expect(proposals[0].options[proposals[0].options.length - 1]).toBe(
      'Autre...',
    );
    expect(parseFollowUps('pas de JSON')).toEqual([]);
  });
  it('lit une réponse correcte de l’IA : seuls les points qui citent vraiment les réponses sont gardés', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.famille.emoji, {
          a: 'Je veux deux enfants, pas avant trente ans.',
          b: 'Des enfants oui, quand nous serons installés.',
        }),
        question('q2', 1, THEMES.argent.emoji, {
          a: 'Moitié-moitié, toujours.',
          b: 'Celui qui invite paie.',
        }),
      ],
      A,
      B,
    );
    const names: [string, string] = ['Inès', 'Karim'];
    const raw = `Voici : ${JSON.stringify({
      headline: 'Vous avez parlé d’enfants et d’argent.',
      together: [
        {
          n: 1,
          a: 'je veux deux enfants',
          b: 'Des enfants oui',
          text: 'Vous parlez tous deux d’avoir des enfants.',
        },
        // Extrait inventé : supprimé.
        {
          n: 1,
          a: 'je rêve d’une grande famille',
          b: 'Des enfants oui',
          text: 'Vous rêvez d’une grande famille.',
        },
      ],
      toDiscuss: [
        {
          n: 2,
          a: 'Moitié-moitié, toujours',
          b: 'celui qui invite',
          text: 'Le partage des dépenses reste à préciser.',
        },
        // Interprétation présentée comme un fait : supprimée.
        {
          n: 2,
          a: 'Moitié-moitié',
          b: 'celui qui invite paie',
          text: 'Au fond, Karim cherche à se protéger.',
        },
        // Question inexistante : supprimée.
        { n: 9, a: 'x y', b: 'x y', text: 'Point sans question.' },
      ],
      opener: 'Comment imaginez-vous un budget commun ?',
    })}`;
    expect(parseDayReading(raw, 1, items, names)).toEqual({
      day: 1,
      source: 'ia',
      headline: 'Vous avez parlé d’enfants et d’argent.',
      together: ['Vous parlez tous deux d’avoir des enfants.'],
      toDiscuss: [
        {
          theme: 'Argent & dettes',
          text: 'Le partage des dépenses reste à préciser.',
        },
      ],
      openers: ['Comment imaginez-vous un budget commun ?'],
    });
  });
  it('écarte une lecture sans point vérifiable ; titre qui évalue et question fermée remplacés', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.intimite.emoji, {
          a: "J'aimerais en parler de vive voix.",
          b: 'La tendresse au quotidien compte beaucoup.',
        }),
        question('q2', 1, THEMES.lieu.emoji, {
          a: 'Rester près de ma mère',
          b: 'Partir là où est le travail',
        }),
      ],
      A,
      B,
    );
    const names: [string, string] = ['Inès', 'Karim'];
    expect(parseDayReading('pas de JSON', 1, items, names)).toBeNull();
    expect(
      parseDayReading('{"headline": "Seulement un titre."}', 1, items, names),
    ).toBeNull();
    // Une réponse gardée pour la rencontre ne sert jamais d'extrait.
    expect(
      parseDayReading(
        JSON.stringify({
          headline: 'Une journée riche.',
          toDiscuss: [
            {
              n: 1,
              a: 'en parler de vive voix',
              b: 'la tendresse au quotidien',
              text: 'La tendresse reste à préciser.',
            },
          ],
          opener: 'Qu’avez-vous appris ?',
        }),
        1,
        items,
        names,
      ),
    ).toBeNull();
    const parsed = parseDayReading(
      JSON.stringify({
        headline: 'Une rencontre prometteuse : vous êtes compatibles.',
        toDiscuss: [
          {
            n: 2,
            a: 'près de ma mère',
            b: 'là où est le travail',
            text: 'Le lieu de vie reste ouvert entre vous.',
          },
        ],
        opener: 'Partiriez-vous pour l’autre',
      }),
      1,
      items,
      names,
    );
    expect(parsed?.headline).toBe(ruleDayReading(1).headline);
    expect(parsed?.openers).toEqual(ruleDayReading(1).openers);
    expect(parsed?.toDiscuss).toHaveLength(1);
    // Le sujet gardé pour la rencontre est signalé, sans interprétation.
    expect(parsed?.advice).toMatch(/gardé pour votre rencontre : Intimité/);
  });
  it('refuse liens, coordonnées et textes trop longs (jamais coupés)', () => {
    expect(cleanText('Écrivez-moi sur www.exemple.fr', 200)).toBeNull();
    expect(cleanText('Mon numéro : 06 12 34 56 78', 200)).toBeNull();
    expect(cleanText('contact@exemple.fr', 200)).toBeNull();
    expect(cleanText('a'.repeat(250), 200)).toBeNull();
    expect(cleanText('  Une   phrase   propre.  ', 200)).toBe(
      'Une phrase propre.',
    );
    expect(cleanText('Vous avez 21 questions et 3 jours.', 200)).toBe(
      'Vous avez 21 questions et 3 jours.',
    );
  });

  it('bilan de l’IA : points ancrés obligatoires, premières questions ouvertes', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.lieu.emoji, {
          a: 'Rester près de ma mère',
          b: 'Partir là où est le travail',
        }),
        question('q2', 2, THEMES.communication.emoji, {
          a: 'Je dis les choses calmement le soir même.',
          b: 'Je préfère parler calmement le soir.',
        }),
      ],
      A,
      B,
    );
    const names: [string, string] = ['Inès', 'Karim'];
    expect(
      parseReview(
        JSON.stringify({ headline: 'Bilan.', openers: [] }),
        items,
        names,
      ),
    ).toBeNull();
    const review = parseReview(
      JSON.stringify({
        headline: 'Trois jours sur vos limites, vos valeurs et votre avenir.',
        strengths: [
          {
            n: 2,
            a: 'calmement le soir même',
            b: 'parler calmement le soir',
            text: 'Vous parlez tous deux calmement, le soir.',
          },
        ],
        toDiscuss: [
          {
            n: 1,
            a: 'près de ma mère',
            b: 'là où est le travail',
            text: 'La ville où vivre reste ouverte.',
          },
        ],
        openers: [
          'Qu’est-ce qui vous attache à la ville où vous vivez ?',
          'Votre réponse m’a touchée.',
        ],
        advice: 'Commencez par ce qui vous rapproche.',
      }),
      items,
      names,
    );
    expect(review).toMatchObject({
      day: REVIEW_DAY,
      source: 'ia',
      together: ['Vous parlez tous deux calmement, le soir.'],
      toDiscuss: [{ theme: 'Lieu de vie & mobilité' }],
      openers: ['Qu’est-ce qui vous attache à la ville où vous vivez ?'],
      advice: 'Commencez par ce qui vous rapproche.',
    });
  });
  it('versions sans IA : journée et bilan fondé sur les écarts des entretiens', () => {
    expect(ruleDayReading(2)).toMatchObject({ day: 2, source: 'regles' });
    expect(ruleDayReading(2).openers).toHaveLength(1);
    const report = {
      divergences: [
        {
          theme: 'famille',
          severity: 'critique',
          label: 'Désir d’enfants',
          shared: false,
        },
        { theme: 'famille', severity: 'majeure', label: 'Place des parents' },
        { theme: 'argent', severity: 'mineure', label: 'Premier rendez-vous' },
        {
          theme: 'lieu',
          severity: 'moderee',
          label: 'Déménager pour le couple',
        },
      ],
    } as unknown as DivergenceReport;
    const review = ruleReview(report);
    expect(review.toDiscuss.map((p) => p.theme)).toEqual([
      'Famille',
      'Lieu de vie & mobilité',
    ]);
    expect(review.toDiscuss[1].text).toContain('déménager pour le couple');
    expect(ruleReview(null).toDiscuss).toEqual([]);
    expect(ruleReview(null).openers).toHaveLength(3);
  });

  it('vérification anti-invention : lecture et réponses envoyées au relecteur, verdict lu strictement', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.argent.emoji, {
          a: 'Moitié-moitié',
          b: 'Celui qui invite',
        }),
      ],
      A,
      B,
    );
    const { system, prompt } = fidelityPrompt(items, ['Inès', 'Karim'], {
      ...ruleDayReading(1),
      headline: 'Vous voyez l’argent différemment.',
    });
    expect(system).toMatch(/jamais des consignes/);
    expect(prompt).toContain('Karim : « Celui qui invite »');
    expect(prompt).toContain(
      'Phrase de synthèse : Vous voyez l’argent différemment.',
    );
    expect(prompt).toMatch(/invention ou exagération/);
    expect(prompt).toMatch(/même mot sans décrire la même chose/);
    expect(prompt).toMatch(/émotion, une peur ou un besoin/);
    expect(parseFidelity('{"fidele": true}')).toBe(true);
    expect(
      parseFidelity(
        'Verdict : {"fidele": false, "raisons": ["souvenir inventé"]}',
      ),
    ).toBe(false);
    expect(parseFidelity('{"fidele": "oui"}')).toBeNull();
    expect(parseFidelity('pas de JSON')).toBeNull();
    expect(parseFidelity(null)).toBeNull();
  });
});
