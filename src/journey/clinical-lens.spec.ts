import {
  CLINICAL_LENS,
  CRITIC_RULES,
  READING_LENS,
  contentWords,
  hasClinicalJargon,
  hasInterpretation,
  isWellFormedQuestion,
  similarQuestions,
} from './clinical-lens';

describe('Regard clinique du Sondeur', () => {
  it('donne à l’IA plusieurs écoles, des techniques de questionnement et la neutralité', () => {
    for (const school of [
      'Attachement',
      'Gottman',
      'Sue Johnson',
      'psychanalytique',
      'systémique',
      'schémas',
      'solutions',
      'Esther Perel',
    ]) {
      expect(CLINICAL_LENS).toContain(school);
    }
    expect(CLINICAL_LENS).toMatch(/question circulaire/);
    expect(CLINICAL_LENS).toMatch(/ne se seraient jamais posée/);
    expect(CLINICAL_LENS).toMatch(/aucun diagnostic/);
    expect(CRITIC_RULES).toMatch(/banale/);
    expect(CRITIC_RULES).toMatch(/répète/);
  });

  it('repère le jargon clinique, y compris avec des accents, sans faux positif', () => {
    expect(
      hasClinicalJargon('Êtes-vous plutôt évitant dans vos relations ?'),
    ).toBe(true);
    expect(
      hasClinicalJargon('Votre partenaire a-t-il un profil anxieux ?'),
    ).toBe(true);
    expect(hasClinicalJargon('Ce traumatisme vous a-t-il marqué ?')).toBe(true);
    expect(hasClinicalJargon('Une relation toxique')).toBe(true);
    expect(
      hasClinicalJargon('Une dispute est-elle inévitable selon vous ?'),
    ).toBe(false);
    expect(hasClinicalJargon('Une décision complexe d’abord à deux ?')).toBe(
      false,
    );
    expect(
      hasClinicalJargon(
        'Qui, dans votre famille, décidait des dépenses importantes ?',
      ),
    ).toBe(false);
  });

  it('ne garde que les mots porteurs de sens', () => {
    expect([
      ...contentWords(
        'Votre partenaire boude pendant toute une soirée : que faites-vous ?',
      ),
    ]).toEqual(['boude', 'pendant', 'soirée']);
  });

  it('reconnaît une reformulation proche et laisse passer une autre question', () => {
    expect(
      similarQuestions(
        'Votre partenaire règle seul une grosse dépense commune sans vous prévenir : que faites-vous ?',
        'Votre partenaire paie seul une grosse dépense commune sans vous en parler : comment réagissez-vous ?',
      ),
    ).toBe(true);
    expect(
      similarQuestions(
        'Au premier rendez-vous, le serveur pose l’addition sur la table : que faites-vous ?',
        'Votre partenaire veut s’installer près de ses parents : qu’en pensez-vous ?',
      ),
    ).toBe(false);
    // Trop peu de mots porteurs de sens : on ne conclut pas.
    expect(similarQuestions('Et vous ?', 'Et vous ?')).toBe(false);
  });

  it('cadre adapté à deux inconnus, technique choisie selon le signal, exemples contrastés', () => {
    expect(CLINICAL_LENS).toMatch(/jamais parlé/);
    expect(CLINICAL_LENS).toMatch(/CHOIX DE LA TECHNIQUE SELON LE SIGNAL/);
    expect(CLINICAL_LENS).toMatch(/180 caractères/);
    expect(CLINICAL_LENS).toMatch(/Mauvais : .* Bon : /);
    expect(CLINICAL_LENS).toMatch(/un proche qui vous connaît bien/);
    expect(CRITIC_RULES).toMatch(/14\. /);
    expect(CRITIC_RULES).toMatch(/oui ou par non/);
    expect(CRITIC_RULES).toMatch(/passé commun/);
    expect(READING_LENS).toMatch(/Décris, compare, cite/);
    expect(READING_LENS).toMatch(/même mot/);
  });

  it('repère une interprétation présentée comme un fait', () => {
    expect(hasInterpretation('Au fond, vous cherchez la sécurité.')).toBe(true);
    expect(hasInterpretation('Cette réponse révèle une peur ancienne.')).toBe(
      true,
    );
    expect(hasInterpretation('Vous avez tendance à fuir le conflit.')).toBe(
      true,
    );
    expect(hasInterpretation('Une vieille blessure se rejoue ici.')).toBe(true);
    expect(
      hasInterpretation('Vous parlez tous deux de la famille le dimanche.'),
    ).toBe(false);
  });

  it('contrôle de forme : question ouverte, courte, sans citation ni interprétation', () => {
    for (const ok of [
      'Dans votre famille, comment savait-on qu’une dispute était terminée ?',
      "Qu'est-ce que votre façon de gérer l'argent vous permet de protéger ?",
      'De 0 à 10, à quel point tenez-vous à vivre près des vôtres ? Pourquoi pas un point de moins ?',
    ]) {
      expect(isWellFormedQuestion(ok)).toBe(true);
    }
    for (const bad of [
      'Est-ce une ligne rouge pour vous ?',
      'Accepteriez-vous de déménager pour l’autre ?',
      'Vous avez répondu « jamais » : pourquoi ?',
      'Que pensez-vous de la famille.',
      `Comment ${'vivez-vous ce moment très particulier '.repeat(6)}?`,
      'Votre style d’attachement vous pousse-t-il à fuir ?',
      'Au fond, que cherchez-vous vraiment dans le couple ?',
    ]) {
      expect(isWellFormedQuestion(bad)).toBe(false);
    }
  });
});
