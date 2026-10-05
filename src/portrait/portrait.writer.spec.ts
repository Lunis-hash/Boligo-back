import { QUESTIONS } from '../interview/questions.data';
import {
  buildDivergenceReport,
  RawAnswers,
} from '../matching/divergence.engine';
import { buildMatchView } from '../matching/match-view';
import { computeAnswerCompatibility } from './module-affinity';
import { MODULES } from './portrait.phrases';
import {
  brandBoligo,
  buildHeadline,
  buildPortrait,
  isUsableBio,
} from './portrait.writer';
import { agree, cleanText, truncateAtWord } from './portrait.text';

/** Réponses déterministes couvrant toutes les questions (option n° `shift`). */
function answersWith(shift: number): RawAnswers {
  const out: RawAnswers = {};
  QUESTIONS.forEach((q, i) => {
    out[q.id] = q.options[(i + shift) % q.options.length].key;
  });
  return out;
}

const OLI: RawAnswers = {
  ...answersWith(0),
  M0_Q03: 'B',
  M0_Q06: 'A',
  M8_Q01: 'A',
  M8_Q02: 'A',
  M8_Q09: 'A',
  M10_Q09: 'C',
  M10_Q10: 'A',
};

const BROKEN = /\bundefined\b|\bnull\b|,\s*,|\s,|,\s*\.|\(\s*\)|\s{2,}/;

describe('Moteur de rédaction des fiches', () => {
  it('rédige l’en-tête « prénom, âge, métier à ville »', () => {
    expect(
      buildHeadline({
        firstName: 'Oli',
        gender: 'H',
        age: 38,
        profession: 'Pilote de ligne',
        city: 'Écouis, Normandie, France',
        answers: {},
      }),
    ).toBe('Oli, 38 ans, pilote de ligne à Écouis');
  });

  it('ouvre l’analyse sur une phrase fluide et ne recopie aucune réponse coupée', () => {
    const p = buildPortrait({
      firstName: 'Oli',
      gender: 'H',
      age: 38,
      profession: 'Pilote de ligne',
      city: 'Écouis',
      answers: OLI,
    });
    expect(
      p.analysis.startsWith(
        'Oli, 38 ans, pilote de ligne à Écouis, aborde sa recherche avec **une exigence de clarté',
      ),
    ).toBe(true);
    expect(p.analysis).not.toMatch(BROKEN);
    expect(p.analysis).not.toContain('Oui si le projet de');
    for (const s of p.analysis.split(/(?<=\.)\s/)) {
      expect(s).toMatch(/^[\p{Lu}«]/u);
      expect(s).toMatch(/[.!?…]$/);
    }
  });

  it('remplace l’ancienne bio de secours tronquée par une bio rédigée', () => {
    const legacy =
      "Moi, c'est Oli. À travers cette démarche sur Harmonie, je cherche à bâtir une relation sincère.\n\nCe qui compte le plus pour moi au quotidien, c'est oui si le projet de vie est solide et le partage d'une vision commune.";
    expect(isUsableBio(legacy)).toBe(false);
    const p = buildPortrait({
      firstName: 'Oli',
      gender: 'H',
      answers: OLI,
      storedBio: legacy,
    });
    expect(p.bio).toBe(
      'Je cherche un engagement sincère, de ceux qui mènent au mariage. J’aime autant les soirées entre amis que les moments au calme, et l’humour est l’une de mes forces. Ce que j’apporte : ma stabilité et ma fiabilité. Je dis facilement les mots qui comptent, et j’aime les entendre. J’aimerais rencontrer quelqu’un de calme, qui équilibre mon énergie.',
    );
  });

  it('garde une bio saine écrite par le membre ou l’IA', () => {
    const bio =
      'Je suis une personne posée, attachée à ma famille et à ma foi, et je cherche une relation durable.';
    expect(
      buildPortrait({
        firstName: 'Awa',
        gender: 'F',
        answers: OLI,
        storedBio: bio,
      }).bio,
    ).toBe(bio);
  });

  it('accorde les textes au féminin', () => {
    const p = buildPortrait({
      firstName: 'Awa',
      gender: 'F',
      age: 31,
      answers: { ...OLI, M8_Q01: 'D', M0_Q04: 'C', M1_Q05: 'A' },
    });
    expect(p.pronoun).toBe('elle');
    expect(p.threeWords).toContain('Ouverte');
    expect(p.details.situation).toBe('Veuve');
    expect(p.details.religion).toBe('Chrétienne pratiquante');
    expect(p.analysis).toContain(
      'Elle reste **ouverte à ce que la rencontre fera naître**',
    );
    expect(agree('{Il} est prêt{e}', 'F')).toBe('Elle est prête');
  });

  it('produit 3 mots, des valeurs, des attentes et un bilan par module sans texte vide', () => {
    for (const shift of [0, 1, 2, 3]) {
      const p = buildPortrait({
        firstName: 'Sam',
        gender: 'H',
        age: 40,
        answers: answersWith(shift),
      });
      expect(p.threeWords).toHaveLength(3);
      expect(p.values.length).toBeGreaterThan(0);
      expect(p.values.length).toBeLessThanOrEqual(8);
      expect(p.modules).toHaveLength(MODULES.length);
      for (const m of p.modules) {
        expect(m.clarity).toBeGreaterThanOrEqual(0);
        expect(m.clarity).toBeLessThanOrEqual(100);
        expect(m.description).not.toMatch(BROKEN);
      }
      for (const e of p.expectations) expect(e.text).not.toMatch(BROKEN);
      expect(p.analysis).not.toMatch(BROKEN);
    }
  });

  it('signale un entretien incomplet au lieu d’inventer un portrait', () => {
    const p = buildPortrait({
      firstName: 'Léa',
      gender: 'F',
      answers: { M0_Q04: 'A' },
    });
    expect(p.analysis).toBe(
      'Léa n’a pas encore terminé son Grand Entretien BOLIGO.',
    );
  });

  it('nettoie les virgules orphelines et coupe au mot', () => {
    expect(cleanText('axée sur Oui si le projet de , Oui, absolument ,')).toBe(
      'axée sur Oui si le projet de, Oui, absolument',
    );
    expect(
      truncateAtWord('Une relation sincère et durable, construite à deux', 30),
    ).toBe('Une relation sincère et…');
    expect(brandBoligo('Ma démarche sur Harmonie')).toBe(
      'Ma démarche sur BOLIGO',
    );
  });
});

describe('Affinités par module et score global', () => {
  it('donne 100 % sur tous les modules à deux réponses identiques', () => {
    // Ce que chacun recherche correspond à ce que l'autre apporte.
    const a = { ...answersWith(1), M10_Q03: 'C', M10_Q09: 'C' };
    const res = computeAnswerCompatibility(a, a, buildDivergenceReport(a, a));
    expect(res.score).toBe(0.98);
    for (const m of res.modules) {
      expect(m.value).toBe(100);
      expect(m.verdict).toMatch(/^Alignement fort sur /);
    }
  });

  it('fait chuter le module et le score global sur une incompatibilité déclarée', () => {
    const a = { ...answersWith(1), M0_Q06: 'A' };
    const b = { ...a, M0_Q06: 'D' };
    const report = buildDivergenceReport(a, b);
    const res = computeAnswerCompatibility(a, b, report);
    const m0 = res.modules.find((m) => m.id === 'm0')!;
    expect(m0.value).toBeLessThanOrEqual(35);
    expect(m0.color).toBe('#8A7B98');
    expect(m0.verdict).toBe('Incompatibilité déclarée : désir d’enfants');
    expect(res.score!).toBeLessThanOrEqual(0.6);
  });

  it('relie la fiche Découverte aux 11 modules, dans l’ordre du Grand Entretien', () => {
    const view = buildMatchView(
      { answers: answersWith(2), mentalMap: null },
      {
        id: 'u-oli',
        firstName: 'Oli',
        gender: 'H',
        birthDate: new Date(new Date().getFullYear() - 38, 0, 1),
        city: 'Écouis',
        profile: {
          profession: 'Pilote de ligne',
          displayedCity: null,
          description: null,
        },
        mentalMap: null,
        answers: OLI,
      },
    );
    expect(view.mentalMap.map((m) => m.id)).toEqual(MODULES.map((m) => m.id));
    expect(view.compatibility).toBeGreaterThanOrEqual(20);
    expect(view.compatibility).toBeLessThanOrEqual(98);
    expect(view.compatibilityLabel).toBeTruthy();
    expect(
      view.aiAnalysis.startsWith('Oli, 38 ans, pilote de ligne à Écouis'),
    ).toBe(true);
    for (const m of view.mentalMap)
      expect(m.verdict.length).toBeGreaterThan(10);
    expect(view.positivePoints[0]).toContain(`${view.compatibility} %`);
    // Le cercle et les barres viennent du même calcul.
    const mean =
      view.mentalMap.reduce((s, m) => s + m.value, 0) / view.mentalMap.length;
    if (view.hardStop) expect(view.compatibility).toBeLessThanOrEqual(60);
    else expect(Math.abs(mean - view.compatibility)).toBeLessThan(10);
  });

  it('garde les 11 modules, sans pourcentage inventé quand rien n’est comparable', () => {
    const a = answersWith(1);
    const b = { ...a };
    for (const k of Object.keys(b)) if (k.startsWith('M3_')) delete b[k];
    const res = computeAnswerCompatibility(a, b, buildDivergenceReport(a, b));
    expect(res.modules).toHaveLength(11);
    const m3 = res.modules.find((m) => m.id === 'm3')!;
    expect(m3.value).toBeNull();
    expect(m3.verdict).toBe('Pas encore de réponses communes sur ce module');
    expect(res.score).not.toBeNull();
  });

  it('retombe sur la carte mentale quand trop peu de réponses sont comparables', () => {
    const res = computeAnswerCompatibility(
      { M0_Q06: 'A' },
      { M0_Q06: 'A' },
      buildDivergenceReport({ M0_Q06: 'A' }, { M0_Q06: 'A' }),
    );
    expect(res.score).toBeNull();
  });
});
