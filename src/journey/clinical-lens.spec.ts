import {
  CLINICAL_LENS,
  CRITIC_RULES,
  contentWords,
  hasClinicalJargon,
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
});
