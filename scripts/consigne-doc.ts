/**
 * Génère le document de la consigne clinique de l'IA du Sondeur : le cadre,
 * les règles de lecture, la grille du relecteur, puis les consignes complètes
 * que reçoivent les modèles pour un couple d'exemple du laboratoire. Le
 * document vient du code : il ne peut pas diverger de l'application.
 *
 *   npx ts-node -P tsconfig.json --transpile-only scripts/consigne-doc.ts
 *
 * Sortie : docs/questionnaire/BOLIGO_Consigne_IA_V7.html
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  DEFAULT_DAY_ONE,
  LAB_SCENARIOS,
  scenarioInterviews,
} from '../src/ai-lab/ai-lab.scenarios';
import {
  THEMES,
  THEME_LIST,
  buildDivergenceReport,
} from '../src/matching/divergence.engine';
import {
  CLINICAL_LENS,
  CRITIC_RULES,
  NON_NEGOTIABLE_TOPICS,
  READING_LENS,
} from '../src/journey/clinical-lens';
import {
  AnsweredItem,
  dayReadingPrompt,
  fidelityPrompt,
  reviewPrompt,
  ruleDayReading,
} from '../src/journey/sondeur-insights';
import { describeReportForAi } from '../src/journey/sondeur.generator';

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const block = (t: string) =>
  `<pre style="white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 10pt; background: #f6f4ef; padding: 10px">${esc(t)}</pre>`;

const scenario =
  LAB_SCENARIOS.find((s) => s.id === 'religion-conversion') ?? LAB_SCENARIOS[0];
const [a, b] = scenarioInterviews(scenario);
const report = buildDivergenceReport(a, b);
const analysis = describeReportForAi(report, scenario.names);
const items: AnsweredItem[] = THEME_LIST.map((theme, i) => {
  const answers = scenario.dayOne?.[theme] ?? DEFAULT_DAY_ONE[theme];
  return {
    questionId: `q${i + 1}`,
    day: 1,
    theme: THEMES[theme].label,
    question: `Question du jour 1 sur le thème « ${THEMES[theme].label} »`,
    answers: [answers[0], answers[1]],
  };
});
const reading = dayReadingPrompt(1, items, scenario.names, analysis);
const review = reviewPrompt(items, scenario.names, analysis);
const fidelity = fidelityPrompt(
  items,
  scenario.names,
  ruleDayReading(1),
  analysis,
);

const html = `<!doctype html><html><head><meta charset="utf-8"><title>BOLIGO Consigne IA V7</title></head><body style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4">
<h1>BOLIGO — Consigne clinique de l'IA du Sondeur (V7)</h1>
<p>Sur un parcours payé, l'IA accompagne le Sondeur. Le meilleur Claude ouvert au compte écrit ; le meilleur GPT relit. Les deux viennent de familles différentes, pour qu'une erreur de l'un soit vue par l'autre. Les portraits des membres ne passent jamais par l'IA.</p>
<ul>
<li><b>Questions du Sondeur</b> : rédigées à partir des écarts et des accords des deux entretiens, puis relues question par question (grille ci-dessous). Le code écarte d'abord toute question mal formée.</li>
<li><b>Lecture de chaque journée</b>, quand les deux membres l'ont finie : accords et points à explorer, chacun cité mot pour mot dans les réponses. Un relecteur vérifie que rien n'est inventé.</li>
<li><b>Question d'approfondissement</b> pour les jours 2 et 3.</li>
<li><b>Bilan Harmonie</b> à la fin des trois jours.</li>
<li><b>Relecture de sécurité de chaque réponse à l'envoi</b> : un danger que le code ne voit pas est signalé tout de suite à l'équipe. Sur un parcours non payé, c'est le modèle économique qui relit (moins d'un centime par parcours).</li>
</ul>
<p><b>Sujets non négociables</b> : jamais de compromis, de terrain d'entente ni de « vivre avec ». Les sujets sont : ${esc(NON_NEGOTIABLE_TOPICS)}.</p>

<h2>1. Cadre clinique (rédaction des questions)</h2>
${block(CLINICAL_LENS)}
<h2>2. Lecture des réponses</h2>
${block(READING_LENS)}
<h2>3. Grille du relecteur</h2>
${block(CRITIC_RULES)}

<h2>4. Consignes complètes, sur un couple d'exemple</h2>
<p>Couple type du laboratoire : <b>${esc(scenario.name)}</b> (${esc(scenario.names.join(' et '))}). Les questions sont ici remplacées par leur thème.</p>
<h3>Ce que l'IA sait des deux entretiens</h3>
${block(analysis)}
<h3>Lecture du jour 1</h3>
${block(`${reading.system}\n\n---\n\n${reading.prompt}`)}
<h3>Bilan Harmonie (avec les réponses du jour 1 seulement)</h3>
${block(review.prompt)}
<h3>Vérification anti-invention</h3>
${block(`${fidelity.system}\n\n---\n\n${fidelity.prompt}`)}

<h2>5. Sécurité</h2>
<p>Le code et l'IA repèrent dans chaque réponse : violence subie ou exercée, menace, contrôle, détresse, demande d'argent, âge de moins de 18 ans. Ce qui se passe ensuite :</p>
<ul>
<li>la réponse est signalée dès son envoi ;</li>
<li>les réponses de ce membre pour la journée restent cachées à l'autre (« Réponse disponible plus tard. ») jusqu'à la décision de l'équipe ;</li>
<li>la messagerie attend ;</li>
<li>l'IA ne commente pas la journée ;</li>
<li>l'auteur reçoit en privé des ressources d'aide.</li>
</ul>
<p>Une confidence de violence subie seule n'est pas cachée et ne retient pas la messagerie. Une réponse refusée (insulte, coordonnées) laisse toujours une trace ; si elle menace, la messagerie attend aussi. Le détail figure dans docs/IA_COUTS.md.</p>
</body></html>`;

const out = path.join(
  __dirname,
  '..',
  'docs',
  'questionnaire',
  'BOLIGO_Consigne_IA_V7.html',
);
fs.writeFileSync(out, html);
console.log(out);
