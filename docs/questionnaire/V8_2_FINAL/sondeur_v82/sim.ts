/**
 * Simulation corrigée — moteur et générateur du Sondeur EN SERVICE, non modifiés,
 * exécutés hors application. Les données V8.2 (questions, gabarits natifs) sont
 * ajoutées en mémoire, comme le ferait une intégration par données.
 *
 * Configurations : V7.1 · V8.2 · V8.2 + A natif · V8.2 + B sélectif · V8.2 + A + B.
 * Niveaux : compatible, partiellement compatible, incompatible (définis par les règles V8.2).
 */
/* eslint-disable */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const HERE = __dirname;
const couples = JSON.parse(readFileSync(join(HERE, 'couples.json'), 'utf8'));
const items = JSON.parse(readFileSync(join(HERE, 'v82_items.json'), 'utf8'));

// 1. Questions V8.2 ajoutées à l'index des questions (intégration par données).
const qd = require('../../../../src/interview/questions.data');
for (const [id, it] of Object.entries<any>(items)) {
  if (qd.QUESTION_INDEX.has(id)) continue;
  qd.QUESTION_INDEX.set(id, { id, moduleNumber: 0, text: id, options: Object.entries(it.options).map(([key, text]) => ({ key, text })) });
}
const engine = require('../../../../src/matching/divergence.engine');
const pool = require('../../../../src/journey/sondeur.pool');
const gen = require('../../../../src/journey/sondeur.generator');
const { NATIVE_DEEP, NATIVE_PHRASES, NATIVE_AGREEMENTS, NEUTRAL_B, nativeReport, NATIVE_RULES } = require('./native-rules');
const { buildEvidence, validate } = require('./evidence-contract');

// 2. Gabarits natifs A (entrées de tables existantes), activables.
const tpl = (t: any) => ({ text: t.text, options: t.options, technique: t.technique });
function enableA(on: boolean) {
  for (const [qid, days] of Object.entries<any>(NATIVE_DEEP)) {
    if (on) { pool.TOPIC_DEEP[qid] = Object.fromEntries(Object.entries(days).map(([d, t]) => [d, tpl(t)])); pool.TOPIC_PHRASES[qid] = NATIVE_PHRASES[qid]; }
    else { delete pool.TOPIC_DEEP[qid]; delete pool.TOPIC_PHRASES[qid]; }
  }
  for (const [k, a] of Object.entries<any>(NATIVE_AGREEMENTS)) {
    if (on) pool.AGREEMENTS[k] = { statement: a.statement, probe: { ...tpl(a.probe), angle: 3 } };
    else delete pool.AGREEMENTS[k];
  }
}
// 3. Questions neutres B (sujets non réintégrés), activables.
const neutralTexts = new Set(NEUTRAL_B.map((n: any) => n.tpl.text));
function enableBNeutral(on: boolean) {
  for (const n of NEUTRAL_B) {
    const list = pool.THEME_POOL[n.theme][n.day];
    const i = list.findIndex((t: any) => t.text === n.tpl.text);
    if (on && i < 0) list.unshift(tpl(n.tpl));
    if (!on && i >= 0) list.splice(i, 1);
  }
}

const CONFIGS = ['V7.1', 'V8.2', 'V8.2 + A', 'V8.2 + B', 'V8.2 + A + B'];
const LEVELS = ['compatible', 'partiel', 'incompatible'];
const SAFETY = new Set(['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24']);
const RANK: any = { critique: 3, majeure: 2, moderee: 1, mineure: 0 };

function reportFor(cfg: string, c: any) {
  const useA = cfg.includes('A');
  const useB = cfg.includes('B');
  if (cfg === 'V7.1') return { report: engine.buildDivergenceReport(c.a7, c.b7), raw: [c.a7, c.b7] };
  const a = { ...c.a7, ...(useB ? c.Ba : {}) };
  const b = { ...c.b7, ...(useB ? c.Bb : {}) };
  const report = engine.buildDivergenceReport(a, b);
  if (useA) {
    const n = nativeReport(c.a, c.b, items);
    report.divergences.push(...n.divergences);
    report.convergences.push(...n.convergences);
  }
  return { report, raw: [{ ...a, ...c.a }, { ...b, ...c.b }] };
}

/**
 * Fidélité, vérifiée sur les réponses brutes :
 * F1 le sujet cité existe dans le rapport avec la bonne nature (écart / accord) ;
 * F2 une phrase d'accord (« … tous les deux … ») n'apparaît que sur un accord,
 *    et les deux membres ont réellement donné la même réponse à la question citée ;
 * F3 une question d'écart ne contient aucune phrase d'accord.
 */
const AGREE_LEAD = /(?<!\p{L})(?:tous (?:les )?deux|pour vous deux|ni l[’']un ni l[’']autre)(?!\p{L})/iu;
function faithful(q: any, report: any, raw: any[]): string | null {
  const subj = (q.subject ?? '').split(':')[0];
  const lead0 = q.text.split(/(?<=[.!:;])\s+/).slice(0, -1).join(' ');
  // Une invitation à imaginer (« Imaginez… tous les deux : … ») n'affirme rien.
  const lead = /^(?:imaginez|pensez|repensez|figurez|supposons|si )/i.test(lead0.trim()) ? '' : lead0;
  if (q.source === 'divergence') {
    if (subj === 'securite' || subj === 'controle') return null;
    if (!report.divergences.some((x: any) => x.questionId === subj)) return 'F1 écart cité absent du rapport';
    if (AGREE_LEAD.test(lead)) return 'F3 phrase d’accord dans une question d’écart';
    return null;
  }
  if (q.source === 'convergence') {
    if (!report.convergences.some((x: any) => x.questionId === subj)) return 'F1 accord cité absent du rapport';
    const [x, y] = raw;
    if (AGREE_LEAD.test(lead) && x[subj] !== undefined && y[subj] !== undefined && x[subj] !== y[subj]) return 'F2 accord affirmé sur des réponses différentes';
    return null;
  }
  if (AGREE_LEAD.test(lead)) return 'F2 phrase d’accord sans accord';
  return null;
}

const results: any = {};
const examples: any = {};
const templateFindings: Record<string, { n: number; reasons: string[]; text: string }> = {};
for (const cfg of CONFIGS) {
  enableA(cfg.includes('A'));
  enableBNeutral(cfg.includes('B'));
  for (const level of LEVELS) {
    const list = couples[`${cfg === 'V7.1' ? 'v71' : 'v82'}_${level}`];
    const s: any = { couples: 0, errors: 0, not21: 0, perso: 0, total: 0, divQ: 0, convQ: 0, priority: 0, prioritySeen: 0, unfaithful: 0, unfaithfulEx: [] as string[],
      subjects: new Set<string>(), famillePerso: 0, familleTotal: 0, nativeUsed: 0, neutralBUsed: 0, hardStop: 0, evidenceFail: 0, evidenceChecked: 0, hardBy: {} as Record<string, number> };
    list.forEach((c: any, i: number) => {
      try {
        const { report, raw } = reportFor(cfg, c);
        const qs = gen.assembleSondeur({ report, firstNames: ['Alex', 'Sam'], seed: `${cfg}-${level}-${i}` });
        s.couples++; if (qs.length !== 21) s.not21++;
        if (report.hardStop) { s.hardStop++; for (const d of report.divergences) if (d.severity === 'critique') s.hardBy[d.questionId] = (s.hardBy[d.questionId] ?? 0) + 1; }
        const index = buildEvidence(report);
        // Pertinence : écarts prioritaires (majeur ou plus, hors sécurité) réellement abordés.
        const prio = report.divergences.filter((d: any) => RANK[d.severity] >= 2 && !SAFETY.has(d.questionId));
        const asked = new Set(qs.filter((q: any) => q.source === 'divergence').map((q: any) => (q.subject ?? '').split(':')[0]));
        s.prioritySeen += prio.length; s.priority += prio.filter((d: any) => asked.has(d.questionId)).length;
        for (const q of qs) {
          s.total++;
          const perso = q.source === 'divergence' || q.source === 'convergence';
          if (perso) s.perso++;
          if (q.source === 'divergence') s.divQ++;
          if (q.source === 'convergence') s.convQ++;
          if (q.themeKey === 'famille') { s.familleTotal++; if (perso) s.famillePerso++; }
          const subj = (q.subject ?? '').split(':')[0];
          if (subj) s.subjects.add(subj);
          if (NATIVE_RULES.some((r: any) => r.questionId === subj)) s.nativeUsed++;
          if (neutralTexts.has(q.text)) s.neutralBUsed++;
          const f = faithful(q, report, raw);
          if (f) { s.unfaithful++; if (s.unfaithfulEx.length < 3) s.unfaithfulEx.push(`${f} — ${q.text}`); }
          // Contrat de preuves appliqué aux gabarits déterministes (règles de forme des gabarits).
          if (perso && subj && subj !== 'securite' && subj !== 'controle') {
            const ev = index.filter((e: any) => e.subjects.includes(subj) && e.theme === q.themeKey).map((e: any) => e.id);
            const claim = q.source;
            const v = validate({ day: q.day, themeKey: q.themeKey, text: q.text, evidence: ev.length ? ev : ['?'], claim }, index, { deterministic: true });
            s.evidenceChecked++;
            if (!v.ok) {
              s.evidenceFail++;
              const key = q.text;
              templateFindings[key] ??= { n: 0, reasons: v.reasons, text: q.text };
              templateFindings[key].n++;
            }
          }
        }
        if (level === 'partiel' && i === 0) examples[cfg] = qs.map((q: any) => `J${q.day} ${q.themeKey} [${q.source}${q.subject ? ' ' + q.subject : ''}] ${q.text}`);
      } catch (e: any) { s.errors++; if (s.errors < 2) console.error(cfg, level, e.message); }
    });
    results[`${cfg}|${level}`] = { ...s, subjects: s.subjects.size };
  }
}
enableA(false); enableBNeutral(false);
writeFileSync(join(HERE, 'sim-results.json'), JSON.stringify({ results, examples, templateFindings }, null, 1));
const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)} %` : '—');
for (const level of LEVELS) {
  console.log(`\n== ${level}`);
  for (const cfg of CONFIGS) {
    const s = results[`${cfg}|${level}`];
    console.log(`${cfg.padEnd(13)} err ${s.errors} ≠21 ${s.not21} perso ${pct(s.perso, s.total)} famille ${pct(s.famillePerso, s.familleTotal)} prioritaires abordés ${pct(s.priority, s.prioritySeen)} (${s.prioritySeen}) infidèles ${s.unfaithful} natifs ${s.nativeUsed} neutresB ${s.neutralBUsed} sujets ${s.subjects} hardStop ${s.hardStop} preuves KO ${s.evidenceFail}/${s.evidenceChecked}`);
  }
}
