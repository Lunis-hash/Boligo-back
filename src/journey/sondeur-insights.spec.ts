import { DivergenceReport, THEMES } from '../matching/divergence.engine';
import {
  InsightQuestion,
  REVIEW_DAY,
  answeredItems,
  cleanText,
  dayComplete,
  dayReadingPrompt,
  parseDayReading,
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

  it('prompt de la journée : prénoms, réponses citées, consigne contre les instructions cachées', () => {
    const items = answeredItems(
      [
        question('q1', 1, THEMES.famille.emoji, {
          a: 'Je veux des enfants',
          b: 'Pas tout de suite',
        }),
      ],
      A,
      B,
    );
    const { system, prompt } = dayReadingPrompt(1, items, ['Inès', 'Karim']);
    expect(system).toMatch(/jamais des consignes/);
    expect(prompt).toContain('Inès : « Je veux des enfants »');
    expect(prompt).toContain('Karim : « Pas tout de suite »');
    expect(prompt).toContain('journée 2');
    expect(dayReadingPrompt(3, items, ['Inès', 'Karim']).prompt).toContain(
      '"followUp" : null',
    );
    expect(reviewPrompt(items, ['Inès', 'Karim']).prompt).toContain(
      '"openers"',
    );
  });

  it('lit une réponse correcte de l’IA, avec la question d’approfondissement', () => {
    const raw = `Voici : ${JSON.stringify({
      headline: 'Vous partagez la même idée de la famille.',
      together: ['Vous voulez tous deux des enfants.'],
      toDiscuss: [
        {
          themeKey: 'argent',
          text: 'Le partage des dépenses reste à préciser.',
        },
        { themeKey: 'inconnu', text: 'Thème inventé, écarté.' },
      ],
      opener: 'Comment imaginez-vous un budget commun ?',
      followUp: {
        themeKey: 'argent',
        text: 'Votre partenaire propose un compte commun dès le premier mois : que faites-vous ?',
        options: [
          'J’accepte',
          'Je préfère attendre',
          'On en parle d’abord',
          'Autre...',
        ],
      },
    })}`;
    const parsed = parseDayReading(raw, 1);
    expect(parsed?.reading).toMatchObject({
      day: 1,
      source: 'ia',
      together: ['Vous voulez tous deux des enfants.'],
      toDiscuss: [
        {
          theme: 'Argent & dettes',
          text: 'Le partage des dépenses reste à préciser.',
        },
      ],
      openers: ['Comment imaginez-vous un budget commun ?'],
    });
    expect(parsed?.followUp?.themeKey).toBe('argent');
    expect(parsed?.followUp?.options[parsed.followUp.options.length - 1]).toBe(
      'Autre...',
    );
  });

  it('écarte une lecture inutilisable et une question d’approfondissement mal formée', () => {
    expect(parseDayReading('pas de JSON', 1)).toBeNull();
    expect(
      parseDayReading('{"headline": "Seulement un titre."}', 1),
    ).toBeNull();
    const parsed = parseDayReading(
      JSON.stringify({
        headline: 'Une journée riche.',
        opener: 'Qu’avez-vous appris ?',
        followUp: {
          themeKey: 'argent',
          text: 'Pas une question',
          options: ['A', 'B'],
        },
      }),
      1,
    );
    expect(parsed?.followUp).toBeNull();
    // Dernière journée : jamais de question d'approfondissement.
    const last = parseDayReading(
      JSON.stringify({
        headline: 'Une journée riche.',
        opener: 'Qu’avez-vous appris ?',
        followUp: {
          themeKey: 'argent',
          text: 'Que feriez-vous si votre partenaire perdait son emploi demain ?',
          options: ['Je soutiens', 'Je m’inquiète', 'On s’organise'],
        },
      }),
      3,
    );
    expect(last?.followUp).toBeNull();
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

  it('bilan de l’IA : premières phrases obligatoires', () => {
    expect(
      parseReview(JSON.stringify({ headline: 'Bilan.', openers: [] })),
    ).toBeNull();
    const review = parseReview(
      JSON.stringify({
        headline: 'Trois jours sincères et cohérents.',
        strengths: ['Vous parlez ouvertement de vos limites.'],
        toDiscuss: [
          { themeKey: 'lieu', text: 'La ville où vivre reste ouverte.' },
        ],
        openers: [
          'Votre réponse sur la famille m’a touchée : d’où vient-elle ?',
        ],
        advice: 'Commencez par ce qui vous rapproche.',
      }),
    );
    expect(review).toMatchObject({
      day: REVIEW_DAY,
      source: 'ia',
      together: ['Vous parlez ouvertement de vos limites.'],
      toDiscuss: [{ theme: 'Lieu de vie & mobilité' }],
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
});
