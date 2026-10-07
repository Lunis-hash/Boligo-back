import type { RawAnswers } from '../matching/divergence.engine';
import { SCALES } from './psychometrics';
import {
  buildValidationReport,
  describeSource,
  isLocalDatabase,
} from './validation-report';

/** Membres simulés : un trait latent par échelle, affirmations inversées comprises. */
function simulated(n: number): RawAnswers[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: n }, () => {
    const answers: RawAnswers = { M0_Q12: 'A' };
    for (const def of Object.values(SCALES)) {
      const trait = rand() * 4 - 2;
      for (const item of def.items) {
        const raw = Math.round(3 + trait + (rand() - 0.5) * 1.5);
        const v = Math.min(5, Math.max(1, item.reverse ? 6 - raw : raw));
        answers[item.id] = 'ABCDE'[v - 1];
      }
    }
    return answers;
  });
}

describe('Validation psychométrique : garde-fous et rapport', () => {
  it('n’accepte sans option qu’une base locale', () => {
    for (const url of [
      'postgresql://postgres@localhost:5432/boligo',
      'postgres://u:p@127.0.0.1/boligo',
      'postgresql://u@[::1]:5432/boligo',
      'postgresql://u@localhost/boligo?host=/var/run/postgresql',
    ])
      expect(isLocalDatabase(url)).toBe(true);
    for (const url of [
      'postgresql://u:p@db.example.com:5432/boligo',
      'postgresql://u:p@10.0.0.4/boligo',
      'postgresql://u@localhost/boligo?host=db.example.com',
      'mysql://localhost/boligo',
      'pas une adresse',
    ])
      expect(isLocalDatabase(url)).toBe(false);
  });

  it('ne recopie jamais les identifiants de connexion', () => {
    expect(
      describeSource('postgresql://admin:secret@localhost:5432/boligo'),
    ).toBe('localhost:5432/boligo');
  });

  it('calcule la fiabilité de chaque échelle et signale un échantillon insuffisant', () => {
    const report = buildValidationReport(simulated(120), {
      source: 'localhost:5432/test',
      date: '2026-10-07',
    });
    expect(report).toMatch(/Échantillon insuffisant \(120 < 300\)/);
    expect(report).toMatch(/## Synthèse par échelle/);
    for (const def of Object.values(SCALES))
      expect(report).toContain(`### ${def.label}`);
    // Des réponses tirées d'un même trait : échelles fiables.
    const line = report
      .split('\n')
      .find((l) => l.startsWith('| Inquiétude pour le lien |'))!;
    expect(line).toMatch(/\| fiable \|$/);
    expect(report).not.toMatch(/NaN|undefined/);
    const enough = buildValidationReport(simulated(300), {
      source: 'x',
      date: 'y',
    });
    expect(enough).not.toMatch(/Échantillon insuffisant/);
  });
});
