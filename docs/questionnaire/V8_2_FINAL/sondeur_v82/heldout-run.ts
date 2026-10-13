/** Corpus indépendant (écrit sans voir le validateur) : mesure de généralisation. */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
const { validate } = require('./evidence-contract');
const { INDEX } = require('./validator-corpus');
const cl = require('../../../../src/journey/clinical-lens');
const H = JSON.parse(readFileSync(join(__dirname, 'heldout-corpus.json'), 'utf8'));
const res: any = { reject: [], accept: [] };
const by: Record<string, [number, number]> = {};
for (const c of H.reject) {
  const v = validate(c, INDEX); const formOnly = !cl.isWellFormedQuestion(c.text);
  by[c.category] ??= [0, 0]; by[c.category][1]++; if (!v.ok) by[c.category][0]++;
  res.reject.push({ ...c, verdict: v, rejectedByExistingFormRulesAlone: formOnly });
}
let acc = 0;
for (const c of H.accept) { const v = validate(c, INDEX); if (v.ok) acc++; res.accept.push({ ...c, verdict: v }); }
writeFileSync(join(__dirname, 'heldout-results.json'), JSON.stringify(res, null, 1));
const rej = res.reject.filter((r: any) => !r.verdict.ok).length;
const existing = res.reject.filter((r: any) => r.rejectedByExistingFormRulesAlone).length;
console.log(`à rejeter : ${rej}/${H.reject.length} (règles de forme existantes seules : ${existing}/${H.reject.length}) ; à accepter : ${acc}/${H.accept.length}`);
console.log(by);
for (const r of res.reject) if (r.verdict.ok) console.log('NON REJETÉE', r.category, '|', r.text, r.evidence, r.claim);
for (const r of res.accept) if (!r.verdict.ok) console.log('REJETÉE À TORT', r.verdict.reasons, '|', r.text, r.evidence, r.claim);
