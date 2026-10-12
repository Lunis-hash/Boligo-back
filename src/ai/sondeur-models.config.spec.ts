import { readFileSync } from 'fs';
import { join } from 'path';
import { modelFamily } from './groq-model';
import { isValidQualification, modelsFor } from './sondeur-router';

/** Qualification réelle, écrite par le banc d'essai (2026-10-12-final). */
const q = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', 'config', 'sondeur-models.json'),
    'utf8',
  ),
) as unknown;

describe('config/sondeur-models.json', () => {
  it('qualification valide, aucun modèle gratuit', () => {
    expect(isValidQualification(q)).toBe(true);
  });

  it('seuls les modèles mesurés par le banc (rédacteur, relecteur, escalade)', () => {
    const measured = new Set([
      'z-ai/glm-5.3-flash',
      'anthropic/claude-sonnet-5.5',
    ]);
    const v = q as Record<string, string[]>;
    for (const role of ['writer', 'critic', 'escalation', 'fallback'])
      for (const m of v[role]) expect(measured.has(m)).toBe(true);
  });

  it('le relecteur est toujours d’une autre famille que le rédacteur', () => {
    const v = q as never;
    for (const writer of [
      ...(q as { writer: string[] }).writer,
      ...(q as { escalation: string[] }).escalation,
    ]) {
      const critics = modelsFor('critic', { avoid: writer, q: v }).models;
      expect(critics.length).toBeGreaterThan(0);
      expect(critics.every((c) => modelFamily(c) !== modelFamily(writer))).toBe(
        true,
      );
    }
  });
});
