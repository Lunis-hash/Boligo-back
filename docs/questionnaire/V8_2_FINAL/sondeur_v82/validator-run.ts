/** Recette du validateur : corpus à rejeter / à accepter. */
import { writeFileSync } from 'fs';
import { join } from 'path';
const { validate } = require('./evidence-contract');
const { INDEX, REJECT, ACCEPT } = require('./validator-corpus');
const out: any = { reject: [], accept: [] };
let rejOk = 0, accOk = 0;
for (const c of REJECT) { const v = validate(c, INDEX); if (!v.ok) rejOk++; out.reject.push({ ...c, verdict: v }); }
for (const c of ACCEPT) { const v = validate(c, INDEX); if (v.ok) accOk++; out.accept.push({ ...c, verdict: v }); }
writeFileSync(join(__dirname, 'validator-results.json'), JSON.stringify(out, null, 1));
console.log(`à rejeter : ${rejOk}/${REJECT.length} rejetées ; à accepter : ${accOk}/${ACCEPT.length} acceptées`);
for (const r of out.reject) if (r.verdict.ok) console.log('NON REJETÉE', r.category, '|', r.text);
for (const r of out.accept) if (!r.verdict.ok) console.log('REJETÉE À TORT', r.verdict.reasons, '|', r.text);
