/** Évaluation du validateur sur tous les corpus + gabarits déterministes évalués comme s'ils venaient de l'IA. */
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
const { validate } = require('./evidence-contract');
const { INDEX, REJECT, ACCEPT } = require('./validator-corpus');
const corpora: Record<string, any> = { 'corpus initial': { reject: REJECT, accept: ACCEPT } };
for (const [n, f] of [['indépendant 1 (réglage)', 'heldout-corpus.json'], ['indépendant 2 (réglage)', 'heldout2-corpus.json'], ['indépendant 3 (jamais vu, mesure finale)', 'heldout3-corpus.json']])
  if (existsSync(join(__dirname, f))) corpora[n] = JSON.parse(readFileSync(join(__dirname, f), 'utf8'));
const out: any = {};
for (const [name, c] of Object.entries<any>(corpora)) {
  const rej = c.reject.filter((q: any) => !validate(q, INDEX).ok).length;
  const acc = c.accept.filter((q: any) => validate(q, INDEX).ok).length;
  out[name] = { rejected: `${rej}/${c.reject.length}`, accepted: `${acc}/${c.accept.length}`,
    misses: c.reject.filter((q: any) => validate(q, INDEX).ok).map((q: any) => `${q.category} | ${q.text}`),
    falseRejects: c.accept.filter((q: any) => !validate(q, INDEX).ok).map((q: any) => `${validate(q, INDEX).reasons.join(', ')} | ${q.text}`) };
}
// Gabarits de l'équipe (bonnes questions) évalués en mode IA : estimation du taux de rejet à tort.
const pool = require('../../../../src/journey/sondeur.pool');
const tpls: Array<{ theme: string; text: string }> = [];
for (const [theme, days] of Object.entries<any>(pool.THEME_POOL)) for (const list of Object.values<any>(days)) for (const t of list) tpls.push({ theme, text: t.text });
const ix = INDEX;
const rejT = tpls.filter((t) => !validate({ day: 2, themeKey: t.theme, text: t.text, evidence: [`N-${t.theme}`], claim: 'neutral' }, ix).ok);
out['gabarits de thème en service, lus comme des questions de l’IA'] = { total: tpls.length, rejected: rejT.length,
  reasons: rejT.reduce((m: any, t) => { for (const r of validate({ day: 2, themeKey: t.theme, text: t.text, evidence: [`N-${t.theme}`], claim: 'neutral' }, ix).reasons) m[r.replace(/ \(.*/, '')] = (m[r.replace(/ \(.*/, '')] ?? 0) + 1; return m; }, {}),
  examples: rejT.slice(0, 12).map((t) => `${validate({ day: 2, themeKey: t.theme, text: t.text, evidence: [`N-${t.theme}`], claim: 'neutral' }, ix).reasons.join(', ')} | ${t.text}`) };
writeFileSync(join(__dirname, 'eval-all.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
