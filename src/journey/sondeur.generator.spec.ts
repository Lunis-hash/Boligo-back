import {
  buildDivergenceReport,
  THEME_LIST,
} from '../matching/divergence.engine';
import {
  SAFETY_TEMPLATES,
  assembleSondeur,
  describeReportForAi,
  questionSignature,
  validateSondeurGrid,
} from './sondeur.generator';
import { AGREEMENTS } from './sondeur.pool';

describe('Générateur du Sondeur (3 jours × 7 thèmes)', () => {
  const report = buildDivergenceReport(
    {
      M0_Q06: 'A',
      M6_Q10: 'A',
      M4_Q01: 'A',
      M7_Q07: 'A',
      M5_Q01: 'A',
      M8_Q01: 'A',
    },
    {
      M0_Q06: 'D',
      M6_Q10: 'C',
      M4_Q01: 'D',
      M7_Q07: 'C',
      M5_Q01: 'D',
      M8_Q01: 'A',
    },
  );

  it('produit toujours 21 questions couvrant les 7 thèmes chaque jour', () => {
    const qs = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    expect(qs).toHaveLength(21);
    expect(validateSondeurGrid(qs)).toBe(true);
    expect(qs.filter((q) => q.day === 1).map((q) => q.themeKey)).toEqual(
      THEME_LIST,
    );
    qs.forEach((q) => {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options[q.options.length - 1]).toMatch(/^Autre/);
      expect(q.text.length).toBeGreaterThan(30);
    });
  });

  it('cible les divergences réelles avant tout gabarit, sans jamais citer les réponses', () => {
    const qs = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    const famille = qs.find((q) => q.day === 1 && q.themeKey === 'famille');
    expect(famille?.source).toBe('divergence');
    expect(famille?.text).toMatch(/enfants/i);
    // Le sujet est nommé, jamais ce que chacun a répondu.
    const answers = report.divergences.flatMap((d) => [d.a.text, d.b.text]);
    for (const q of qs) {
      expect(q.text).not.toMatch(/[«»]/);
      for (const answer of answers) expect(q.text).not.toContain(answer);
    }
    const intimite = qs.filter(
      (q) => q.themeKey === 'intimite' && q.source === 'divergence',
    );
    expect(intimite).toHaveLength(1);
    expect(intimite[0].text).toMatch(/fidélité/i);
    // aucun écart détecté sur la spiritualité → gabarit du thème
    expect(qs.find((q) => q.themeKey === 'spiritualite')?.source).toBe(
      'gabarit',
    );
  });

  it('ne pose jamais deux fois le même texte et évite les questions déjà posées au couple', () => {
    const first = assembleSondeur({ report, firstNames: ['Steve', 'Nadia'] });
    const texts = first.map((q) => q.text);
    expect(new Set(texts).size).toBe(21);
    const second = assembleSondeur({
      report,
      firstNames: ['Steve', 'Nadia'],
      avoidTexts: texts,
    });
    second.forEach((q) => expect(texts).not.toContain(q.text));
    expect(validateSondeurGrid(second)).toBe(true);
  });

  it("retient les questions de l'IA seulement si elles respectent la grille", () => {
    const ai = [
      {
        day: 2,
        theme: 'x',
        emoji: '💬',
        text: 'Question IA conforme sur la spiritualité au quotidien, assez longue ?',
        options: ['A', 'B', 'C'],
        themeKey: 'spiritualite' as const,
      },
      {
        day: 9,
        theme: 'x',
        emoji: '💬',
        text: 'Question IA hors grille qui ne doit pas apparaître dans le parcours',
        options: ['A', 'B'],
        themeKey: 'argent' as const,
      },
    ];
    const qs = assembleSondeur({
      report,
      firstNames: ['Steve', 'Nadia'],
      aiQuestions: ai,
    });
    expect(
      qs.find((q) => q.day === 2 && q.themeKey === 'spiritualite')?.source,
    ).toBe('ia');
    expect(qs.some((q) => q.text.startsWith('Question IA hors grille'))).toBe(
      false,
    );
    expect(validateSondeurGrid(qs)).toBe(true);
  });

  it('questions de l’IA (toujours relues) : elles passent avant les gabarits, sauf jargon ou redite', () => {
    const aiFor = (
      day: number,
      themeKey: (typeof THEME_LIST)[number],
      text: string,
    ) => ({
      day,
      theme: 'x',
      emoji: '💬',
      text,
      options: ['A', 'B', 'C'],
      themeKey,
    });
    const ai = [
      aiFor(
        1,
        'famille',
        'Qui, dans votre famille, décidait du nombre d’enfants, et l’avez-vous déjà remis en question ?',
      ),
      aiFor(
        1,
        'argent',
        'Êtes-vous plutôt évitant quand votre compte en banque baisse en fin de mois ?',
      ),
      aiFor(
        1,
        'spiritualite',
        'Votre partenaire règle seul une grosse dépense commune sans vous prévenir : que faites-vous ?',
      ),
    ];
    const history = [
      'Votre partenaire paie seul une grosse dépense commune sans vous en parler : comment réagissez-vous ?',
    ];
    const base = {
      report,
      firstNames: ['Steve', 'Nadia'] as [string, string],
      aiQuestions: ai,
      history,
    };

    // Une question de l'IA transmise a toujours été relue en amont : elle
    // passe avant le gabarit ciblé, que preferAi soit posé ou non.
    const plain = assembleSondeur(base);
    expect(
      plain.find((q) => q.day === 1 && q.themeKey === 'famille')?.source,
    ).toBe('ia');

    const reviewed = assembleSondeur({ ...base, preferAi: true });
    const famille = reviewed.find(
      (q) => q.day === 1 && q.themeKey === 'famille',
    );
    expect(famille?.source).toBe('ia');
    expect(famille?.text).toMatch(/Qui, dans votre famille/);
    // Jargon clinique : écartée. Redite d'une question déjà posée : écartée.
    expect(reviewed.some((q) => /évitant/.test(q.text))).toBe(false);
    expect(reviewed.some((q) => /grosse dépense commune/.test(q.text))).toBe(
      false,
    );
    expect(validateSondeurGrid(reviewed)).toBe(true);
  });

  it('sécurité : jamais de compromis sur la violence, seulement des questions de limite', () => {
    // L'un : rupture immédiate ; l'autre : « ça dépend des circonstances ».
    const violent = buildDivergenceReport({ M6_Q04: 'A' }, { M6_Q04: 'C' });
    expect(violent.divergences.some((d) => d.questionId === 'M6_Q04')).toBe(
      true,
    );
    const qs = assembleSondeur({
      report: violent,
      firstNames: ['A', 'B'],
      seed: 'v',
    });
    const texts = qs.map((q) => q.text).join(' | ');
    expect(texts).not.toMatch(/violence physique/i);
    expect(texts).not.toMatch(/vivable/i);
    const comm = qs.filter((q) => q.themeKey === 'communication');
    expect(comm.every((q) => !/«/.test(q.text))).toBe(true);
    expect(comm.map((q) => q.subject)).toEqual([
      'securite',
      'securite',
      'securite',
    ]);
    // Une question de limite écrite à l'avance : une norme partagée ou une
    // valeur, jamais le seuil personnel de chacun.
    for (const q of comm)
      expect(SAFETY_TEMPLATES[q.day].map((t) => t.text)).toContain(q.text);
    expect(comm.map((q) => q.text).join(' ')).not.toMatch(
      /à quel moment|une seule fois|plus en sécurité/i,
    );
    // Jamais un plan de mise en sécurité : l'autre lit la réponse.
    expect(texts).not.toMatch(/vous protéger|où iriez|refuge|fuir/i);
    // Jamais de réconciliation ni de « reprendre plus tard » après la violence.
    expect(texts).not.toMatch(
      /baisser les armes|reprendre plus tard|réconcili|revenir vers/i,
    );
    const ai = describeReportForAi(violent, ['A', 'B']);
    expect(ai).toMatch(/LIMITE DE SÉCURITÉ/);
    expect(ai).not.toMatch(/Ça dépend/);
    // Même réponse sur la violence : pas de question d'accord non plus.
    const same = buildDivergenceReport({ M6_Q04: 'D' }, { M6_Q04: 'D' });
    const sameTexts = assembleSondeur({ report: same, firstNames: ['A', 'B'] })
      .map((q) => q.text)
      .join(' | ');
    expect(sameTexts).not.toMatch(/violence/i);
  });

  it('accords : le sujet de la règle, jamais « sur « même réponse sur « … » » »', () => {
    for (let i = 0; i < 30; i++) {
      for (const q of assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: `c${i}`,
      })) {
        expect(q.text).not.toMatch(/«[^»]*«/);
      }
    }
  });

  it('résume le rapport pour le prompt IA sans coordonnées', () => {
    const text = describeReportForAi(report, ['Steve', 'Nadia']);
    expect(text).toMatch(/DIVERGENCES/);
    expect(text).toMatch(/\[critique\] Famille/);
    expect(text).toMatch(/CONVERGENCES/);
    expect(text).not.toMatch(/@|\+33/);
  });

  it('couvre la grille même sans aucune divergence (gabarits personnalisables)', () => {
    const empty = buildDivergenceReport({}, {});
    const qs = assembleSondeur({ report: empty, firstNames: ['A', 'B'] });
    expect(validateSondeurGrid(qs)).toBe(true);
    expect(qs.every((q) => q.source === 'gabarit')).toBe(true);
  });

  describe('variété entre parcours', () => {
    // Un même membre enchaîne des parcours avec des partenaires différents.
    const partners = [
      buildDivergenceReport({}, {}),
      report,
      buildDivergenceReport(
        { M0_Q06: 'A', M4_Q01: 'B' },
        { M0_Q06: 'A', M4_Q01: 'D' },
      ),
      buildDivergenceReport({ M7_Q07: 'A' }, { M7_Q07: 'D' }),
      buildDivergenceReport({}, {}),
    ];

    function run(count: number) {
      const history: string[] = [];
      const series: string[][] = [];
      partners.slice(0, count).forEach((r, i) => {
        const qs = assembleSondeur({
          report: r,
          firstNames: ['Awa', `Partenaire ${i}`],
          history: [...history],
          seed: `parcours-${i}`,
        });
        expect(validateSondeurGrid(qs)).toBe(true);
        series.push(qs.map((q) => q.text));
        history.push(...qs.map((q) => q.text));
      });
      return series;
    }

    it("ne repose jamais une question déjà vue sur cinq parcours d'affilée", () => {
      const all = run(5).flat();
      expect(new Set(all).size).toBe(all.length);
    });

    it('change de formulation, pas seulement de réponses citées, sur quatre parcours', () => {
      const sigs = run(4).flat().map(questionSignature);
      const repeats = sigs.length - new Set(sigs).size;
      // Les gabarits ciblés peuvent se répéter d'un sujet à l'autre ; les questions
      // de thème, elles, ne reviennent jamais.
      expect(repeats).toBeLessThanOrEqual(4);
    });

    it('donne des séries différentes à deux couples, mais reproductibles', () => {
      const a = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: 'parcours-1',
      });
      const again = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: 'parcours-1',
      });
      const b = assembleSondeur({
        report,
        firstNames: ['A', 'B'],
        seed: 'parcours-2',
      });
      expect(again.map((q) => q.text)).toEqual(a.map((q) => q.text));
      const common = a.filter((q, i) => q.text === b[i].text).length;
      expect(common).toBeLessThan(21);
    });

    it('accord déjà exploré : la seconde relance propre, pas une question générique', () => {
      const agreed = buildDivergenceReport({ M4_Q01: 'A' }, { M4_Q01: 'A' });
      const { statement, probe, probeVariant } = AGREEMENTS['M4_Q01:A'];
      expect(probeVariant).toBeDefined();
      const first = assembleSondeur({ report: agreed, firstNames: ['A', 'B'] });
      expect(first.map((q) => q.text)).toContain(`${statement} ${probe!.text}`);
      const second = assembleSondeur({
        report: agreed,
        firstNames: ['A', 'B'],
        history: first.map((q) => q.text),
      });
      expect(second.map((q) => q.text)).toContain(
        `${statement} ${probeVariant!.text}`,
      );
    });

    it('approfondit les points d’accord réels, deux fois par jour au plus', () => {
      const qs = assembleSondeur({ report, firstNames: ['A', 'B'], seed: 'x' });
      const conv = qs.filter((q) => q.source === 'convergence');
      expect(conv.length).toBeGreaterThan(0);
      for (const day of [1, 2, 3]) {
        expect(conv.filter((q) => q.day === day).length).toBeLessThanOrEqual(2);
      }
      conv.forEach((q) => expect(q.text).toMatch(/mariage/i));
    });

    it("reconnaît un gabarit déjà vu même avec d'autres réponses citées", () => {
      expect(
        questionSignature(
          'Sur « argent », vos réponses diffèrent : « A » / « B ».',
        ),
      ).toBe(
        questionSignature(
          'Sur « famille », vos réponses diffèrent : « C » / « D ».',
        ),
      );
    });
  });
});
