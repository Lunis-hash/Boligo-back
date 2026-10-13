// Exécute le moteur et le générateur du Sondeur EN SERVICE (code non modifié) sur des couples simulés.
import { readFileSync, writeFileSync } from 'fs';
import { buildDivergenceReport } from '../../../../src/matching/divergence.engine';
import { assembleSondeur } from '../../../../src/journey/sondeur.generator';
const pairs = JSON.parse(readFileSync(__dirname + '/simpairs.json', 'utf8'));
const dead: string[] = JSON.parse(readFileSync(__dirname + '/dead.json', 'utf8'));
const out: any = {};
for (const k of ['v71', 'v82', 'v82c', 'v82max']) {
  const s = { couples: 0, errors: 0, not21: 0, src: {} as Record<string, number>, divs: 0, convs: 0, hardStop: 0,
              subjects: {} as Record<string, number>, deadSubjects: {} as Record<string, number>, themesPersonal: {} as Record<string, number>, themesTotal: {} as Record<string, number> };
  pairs[k].forEach(([a, b]: any, i: number) => {
    try {
      const report = buildDivergenceReport(a, b);
      const qs = assembleSondeur({ report, firstNames: ['Alex', 'Sam'], seed: `${k}-${i}` });
      s.couples++; s.divs += report.divergences.length; s.convs += report.convergences.length; if (report.hardStop) s.hardStop++;
      if (qs.length !== 21) s.not21++;
      for (const q of qs) {
        s.src[q.source] = (s.src[q.source] ?? 0) + 1;
        s.themesTotal[q.themeKey] = (s.themesTotal[q.themeKey] ?? 0) + 1;
        if (q.source === 'divergence' || q.source === 'convergence') s.themesPersonal[q.themeKey] = (s.themesPersonal[q.themeKey] ?? 0) + 1;
        const subj = (q.subject ?? '').split(':')[0];
        if (subj) { s.subjects[subj] = (s.subjects[subj] ?? 0) + 1; if (dead.includes(subj)) s.deadSubjects[subj] = (s.deadSubjects[subj] ?? 0) + 1; }
      }
    } catch (e) { s.errors++; }
  });
  out[k] = s;
}
writeFileSync(__dirname + '/simsondeur.json', JSON.stringify(out, null, 1));
for (const k of ['v71', 'v82', 'v82c', 'v82max']) {
  const s = out[k]; const n = s.couples * 21;
  console.log(k, 'couples', s.couples, 'erreurs', s.errors, 'séries≠21', s.not21, 'hardStop', s.hardStop,
    'div/couple', (s.divs / s.couples).toFixed(1), 'conv/couple', (s.convs / s.couples).toFixed(1),
    Object.entries(s.src).map(([x, v]: any) => `${x} ${(100 * v / n).toFixed(1)}%`).join(' '), 'sujets distincts', Object.keys(s.subjects).length);
}
