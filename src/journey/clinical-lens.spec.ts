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
  it('consigne : écarts réels seulement, confrontation à la réalité, sans détour par l’enfance ni un proche', () => {
    expect(CLINICAL_LENS).toMatch(/que sur un ÉCART RÉEL/);
    expect(CLINICAL_LENS).toMatch(/DETECTED_GAP/);
    expect(CLINICAL_LENS).toMatch(/Accord ou sujet neutre : aucune question/);
    expect(CLINICAL_LENS).toMatch(/si cela ne changeait jamais/);
    expect(CLINICAL_LENS).toMatch(
      /Jusqu'à combien d'enfants pourriez-vous réellement aller \?/,
    );
    expect(CLINICAL_LENS).toMatch(/aucun passé commun/);
    // Plus aucune incitation au détour : seulement des interdits.
    expect(CLINICAL_LENS).not.toMatch(/question circulaire|technique.*origine/);
    expect(CLINICAL_LENS).toMatch(/jamais de souvenir d'enfance/);
    expect(CRITIC_RULES).toMatch(/1\. elle ne porte pas sur un écart réel/);
    expect(CRITIC_RULES).toMatch(/famille d'origine, le regard d'un proche/);
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

  it('cadre adapté à deux inconnus, écart détecté puis question', () => {
    expect(CLINICAL_LENS).toMatch(/jamais parlé/);
    expect(CLINICAL_LENS).toMatch(/180 caractères/);
    expect(CLINICAL_LENS).toMatch(
      /EXEMPLES \(écart détecté → plusieurs formulations/,
    );
    expect(CLINICAL_LENS).toMatch(/ne recopie jamais un exemple mot pour mot/);
    expect(CLINICAL_LENS).toMatch(/RÉCIPROCITÉ/);
    expect(CLINICAL_LENS).toMatch(/CONTRE-EXEMPLES/);
    expect(CRITIC_RULES).toMatch(/suppose qu'un membre précis tient une position/);
    expect(CLINICAL_LENS).toMatch(/POINTS NON NÉGOCIABLES/);
    expect(CRITIC_RULES).toMatch(/15\. /);
    expect(CRITIC_RULES).toMatch(/passé commun/);
    expect(READING_LENS).toMatch(/Décris, compare, cite/);
    expect(READING_LENS).toMatch(/même mot/);
  });

  it('confrontation à la réalité : admise pour l’IA, sans ouvrir l’ultimatum ni l’intrusion', () => {
    for (const ok of [
      "Combien d'enfants pourriez-vous accueillir dans votre foyer, au plus ?",
      "Si votre partenaire restait sur son chiffre, pourriez-vous l'accepter ?",
      "Si l'un de vous ne voulait jamais d'enfant, pourriez-vous rester ensemble ?",
      'Sur 3 000 € gagnés à deux, combien garderiez-vous pour les loisirs ?',
      "Si ses enfants passaient toute l'année avec vous, pourriez-vous tenir sur la durée ?",
      'Si votre partenaire travaillait chaque samedi, pourriez-vous vivre ainsi pendant des années ?',
    ])
      expect([ok, isWellFormedQuestion(ok)]).toEqual([ok, true]);
    for (const bad of [
      // Fermée sans hypothèse concrète : toujours refusée.
      'Accepteriez-vous de déménager pour l’autre ?',
      // Ultimatum de rupture, même en hypothèse.
      'Si votre partenaire refusait, le quitteriez-vous ?',
      // Montant réel, pas une somme posée en hypothèse.
      'Combien épargnez-vous chaque mois ?',
      'Quel est votre salaire, en euros ?',
      // Exemple de la consigne recopié : refusé.
      "Jusqu'à combien d'enfants pourriez-vous réellement aller ?",
      // « Votre partenaire » hors hypothèse : ils ne se connaissent pas.
      'Comment votre partenaire décrirait-il votre façon de dépenser ?',
    ])
      expect([bad, isWellFormedQuestion(bad)]).toEqual([bad, false]);
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
      "Avec l'argent, sur quoi ne céderez-vous jamais ?",
      'De 0 à 10, à quel point tenez-vous à vivre près des vôtres ? Pourquoi pas un point de moins ?',
    ]) {
      expect(isWellFormedQuestion(ok)).toBe(true);
    }
    for (const bad of [
      // Franchise : tournures alambiquées et questions trop longues refusées.
      "Qu'est-ce que votre façon de gérer l'argent vous permet de protéger ?",
      "Dans ce souhait, qu'est-ce qui, pour vous, ne se discute pas ?",
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
