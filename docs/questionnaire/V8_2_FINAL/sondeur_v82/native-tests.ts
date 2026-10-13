/** Tests des règles natives V8.2 (stratégie A) et de leurs gabarits. */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
const cl = require('../../../../src/journey/clinical-lens');
const { NATIVE_RULES, NATIVE_DEEP, NATIVE_AGREEMENTS, NEUTRAL_B, nativeReport } = require('./native-rules');
const items = JSON.parse(readFileSync(join(__dirname, 'v82_items.json'), 'utf8'));
const R: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail = '') => R.push({ name, ok, detail });

check('11 règles couvrent exactement les 13 sujets V7 de la stratégie A',
  NATIVE_RULES.length === 11 && NATIVE_RULES.flatMap((r: any) => r.replaces).sort().join() ===
  ['M1_Q02', 'M1_Q13', 'M1_Q15', 'M3_Q13', 'M4_Q03', 'M4_Q04', 'M4_Q11', 'M4_Q12', 'M5_Q02', 'M5_Q03', 'M5_Q10', 'M7_Q08', 'M7_Q36'].sort().join());
check('Chaque règle lit une question V8.2 existante', NATIVE_RULES.every((r: any) => items[r.questionId]));
check('Codes cités par les règles existants dans la question V8.2', NATIVE_RULES.every((r: any) =>
  [...Object.keys(r.pairs).join(''), ...r.neutralCodes, ...r.agreeOn].every((c: string) => c in items[r.questionId].options)));
check('Aucune règle native ne produit d’incompatibilité (« critique ») : elles nourrissent la découverte, pas l’exclusion',
  NATIVE_RULES.every((r: any) => !Object.values(r.pairs).includes('critique')));
let sym = true, neutralOk = true, missingOk = true, convOk = true;
for (const r of NATIVE_RULES) {
  if (r.cross) continue;
  const codes = Object.keys(items[r.questionId].options);
  for (const x of codes) for (const y of codes) {
    const a = { [r.questionId]: x }, b = { [r.questionId]: y };
    const n1 = nativeReport(a, b, items), n2 = nativeReport(b, a, items);
    if (JSON.stringify(n1.divergences.map((d: any) => d.severity)) !== JSON.stringify(n2.divergences.map((d: any) => d.severity))) sym = false;
    if ((r.neutralCodes.includes(x) || r.neutralCodes.includes(y)) && (n1.divergences.length || n1.convergences.length)) neutralOk = false;
    if (x === y && n1.divergences.length) convOk = false;
    if (x === y && n1.convergences.length && !r.agreeOn.includes(x)) convOk = false;
  }
  if (nativeReport({ [r.questionId]: codes[0] }, {}, items).divergences.length) missingOk = false;
}
check('Symétrie de toutes les paires de réponses', sym);
check('« Je ne sais pas » ou « ne pas répondre » : ni écart ni accord', neutralOk);
check('Réponse absente : rien', missingOk);
check('Réponses identiques : jamais un écart ; accord seulement sur les codes prévus', convOk);
check('Règle croisée N3 : amitié avec un ex face à « revoir un ex sans me le dire », sujet seul (aucune réponse montrée)', (() => {
  const n = nativeReport({ V82_M3_02: 'D' }, { M6_Q19: 'A,D' }, items);
  return n.divergences.length === 1 && n.divergences[0].neutral === true && n.divergences[0].a.text.startsWith('Point')
    && nativeReport({ V82_M3_02: 'A' }, { M6_Q19: 'A,D' }, items).divergences.length === 0;
})());
check('Échelle N10 : écart seulement à 3 points ou plus (moderee), 2 points (mineure)', (() => {
  const s = (x: string, y: string) => nativeReport({ V82_M9_03: x }, { V82_M9_03: y }, items).divergences.map((d: any) => d.severity).join();
  return s('A', 'D') === 'moderee' && s('B', 'D') === 'mineure' && s('C', 'D') === '';
})());
const texts: string[] = [];
let daysOk = true;
for (const r of NATIVE_RULES) { const d = NATIVE_DEEP[r.questionId]; if (!d || ![1, 2, 3].every((k) => d[k])) daysOk = false; else texts.push(...[1, 2, 3].map((k) => d[k].text)); }
check('Trois gabarits (jours 1, 2, 3) par règle', daysOk);
const agrOk = NATIVE_RULES.every((r: any) => r.agreeOn.every((c: string) => NATIVE_AGREEMENTS[`${r.questionId}:${c}`]));
check('Une phrase d’accord pour chaque accord prévu', agrOk);
for (const a of Object.values<any>(NATIVE_AGREEMENTS)) texts.push(a.probe.text, `${a.statement} ${a.probe.text}`);
for (const n of NEUTRAL_B) texts.push(n.tpl.text);
const bad = texts.filter((t) => !cl.passesFormRules(t));
check(`Tous les gabarits (${texts.length}) passent les règles de forme EN SERVICE`, bad.length === 0, bad.join(' | '));
check('Options : trois pistes puis « Autre... »', [...Object.values<any>(NATIVE_DEEP).flatMap((d: any) => Object.values<any>(d)), ...NEUTRAL_B.map((n: any) => n.tpl)]
  .every((t: any) => t.options.length === 4 && t.options[3] === 'Autre...'));
writeFileSync(join(__dirname, 'native-tests-results.json'), JSON.stringify(R, null, 1));
console.log(`${R.length} contrôles, ${R.filter((r) => !r.ok).length} échec(s)`);
for (const r of R) if (!r.ok) console.log('ÉCHEC', r.name, r.detail);
