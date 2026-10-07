/**
 * Génère le document d'exemples du Sondeur : pour chaque couple type du
 * laboratoire IA, les 21 questions modèles (sans IA) servies au premier
 * parcours, puis au deuxième. Le document vient du code : il ne peut pas
 * diverger de l'application.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/sondeur-doc.ts
 *
 * Sortie : docs/questionnaire/BOLIGO_Sondeur_Exemples_V7.html (importable tel
 * quel dans Google Docs ou Word).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  LAB_SCENARIOS,
  scenarioInterviews,
} from '../src/ai-lab/ai-lab.scenarios';
import { THEMES, buildDivergenceReport } from '../src/matching/divergence.engine';
import {
  DAY_ANGLES,
  SondeurQuestion,
  assembleSondeur,
} from '../src/journey/sondeur.generator';

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SOURCE: Record<SondeurQuestion['source'], string> = {
  divergence: 'écart entre vos entretiens',
  convergence: 'accord entre vos entretiens',
  gabarit: 'question du thème',
  ia: 'IA',
};

function journeyHtml(questions: SondeurQuestion[]): string {
  return [1, 2, 3]
    .map((day) => {
      const angle = DAY_ANGLES[day];
      const items = questions
        .filter((q) => q.day === day)
        .map(
          (q) =>
            `<li><b>${esc(THEMES[q.themeKey].label)}</b> <i>(${SOURCE[q.source]})</i><br>${esc(q.text)}<br><span style="color:#555">Choix : ${q.options.map(esc).join(' · ')}</span></li>`,
        )
        .join('');
      return `<h4>Jour ${day} — ${angle.emoji} ${esc(angle.label)} : ${esc(angle.intent)}</h4><ol>${items}</ol>`;
    })
    .join('');
}

const sections = LAB_SCENARIOS.map((s) => {
  const [a, b] = scenarioInterviews(s);
  const report = buildDivergenceReport(a, b);
  const first = assembleSondeur({
    report,
    firstNames: s.names,
    aiQuestions: [],
    history: [],
    seed: s.id,
  });
  const second = assembleSondeur({
    report,
    firstNames: s.names,
    aiQuestions: [],
    history: first.map((q) => q.text),
    seed: `${s.id}-2`,
  });
  return `<h2>${esc(s.name)} (${esc(s.names.join(' et '))})</h2>
<p><b>Ce que ce couple vérifie :</b> ${esc(s.checks)}</p>
<h3>Premier parcours</h3>${journeyHtml(first)}
<h3>Deuxième parcours (mêmes membres, nouveau parcours)</h3>${journeyHtml(second)}`;
}).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8"><title>BOLIGO Sondeur exemples V7</title></head><body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4">
<h1>BOLIGO — Sondeur : exemples de questions (V7)</h1>
<p>Le Sondeur pose 21 questions en 3 jours (7 thèmes chaque jour) aux deux membres d'un parcours. Chacun répond de son côté ; la réponse de l'autre n'est visible qu'après la sienne.</p>
<ul>
<li><b>Jour 1 — Lignes rouges</b> : ce que chacun protège.</li>
<li><b>Jour 2 — Valeurs profondes</b> : d'où viennent les positions.</li>
<li><b>Jour 3 — Futur et intimité</b> : ce qu'il faudrait savoir avant de s'engager, et comment chacun le vivrait au quotidien.</li>
</ul>
<p>Ce document montre les <b>questions modèles écrites par BOLIGO</b>, servies sans IA, pour les ${LAB_SCENARIOS.length} couples types du laboratoire IA (tableau de bord, page « Laboratoire IA »). Elles partent des écarts et des accords réels des deux entretiens. Sur un parcours payé, l'IA rédige ses propres questions à partir des mêmes écarts, et un relecteur d'une autre famille de modèles les relit ; ces questions modèles servent alors de secours.</p>
<p>Règles appliquées à chaque question : ouverte, vouvoiement, une seule question, aucun fait supposé, aucune question intrusive (montants, papiers, ex, sexualité détaillée), aucune morale ni jargon, jamais de compromis sur un point non négociable, jamais la violence ou le contrôle présentés comme négociables.</p>
${sections}
</body></html>`;

const out = path.join(
  __dirname,
  '..',
  'docs',
  'questionnaire',
  'BOLIGO_Sondeur_Exemples_V7.html',
);
fs.writeFileSync(out, html);
console.log(`${out} : ${LAB_SCENARIOS.length} couples`);
