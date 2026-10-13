import { readFileSync } from 'fs';
import { join } from 'path';
import { modelFamily } from './groq-model';
import {
  aiGenerationBlocked,
  aiGenerationEnabled,
  isValidQualification,
  modelsFor,
} from './sondeur-router';

/** Qualification réelle (banc d'essai 2026-10-12-final, puis mesure du seuil 2026-10-13). */
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
      // Second avis : mesuré sur corpus étiqueté (docs/sondeur-benchmark/2026-10-13-gate-vote).
      'openai/gpt-5.6-luna',
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
      ...(q as { fallback: string[] }).fallback,
    ]) {
      const critics = modelsFor('critic', { avoid: writer, q: v }).models;
      expect(critics.length).toBeGreaterThan(0);
      expect(critics.every((c) => modelFamily(c) !== modelFamily(writer))).toBe(
        true,
      );
    }
  });

  it('second avis : une troisième famille existe pour chaque rédacteur', () => {
    const v = q as {
      criticVote?: boolean;
      writer: string[];
      fallback: string[];
    };
    if (!v.criticVote) return;
    for (const writer of [...v.writer, ...v.fallback]) {
      const [first] = modelsFor('critic', {
        avoid: writer,
        q: v as never,
      }).models;
      const second = modelsFor('critic', {
        avoid: [writer, first],
        q: v as never,
      }).models;
      expect(second.length).toBeGreaterThan(0);
      expect(
        second.every(
          (m) =>
            modelFamily(m) !== modelFamily(writer) &&
            modelFamily(m) !== modelFamily(first),
        ),
      ).toBe(true);
    }
  });
});

describe('repli déterministe (generation)', () => {
  const base = {
    generatedAt: 't',
    run: 'r',
    writer: ['anthropic/claude-sonnet-5.5'],
    critic: ['z-ai/glm-5.3-flash'],
    escalation: [],
    fallback: [],
    escalateAboveRejectRate: 0.5,
  };
  it('sans réglage : rédaction IA désactivée (fail-closed)', () => {
    expect(aiGenerationEnabled(base)).toBe(false);
    expect(aiGenerationEnabled(null)).toBe(false);
  });
  it('enabled: false : repli complet', () => {
    const q = { ...base, generation: { enabled: false } };
    expect(aiGenerationEnabled(q)).toBe(false);
  });
  it('enabled: true + thème ou cadre désactivé : repli pour eux seuls', () => {
    const q = {
      ...base,
      generation: {
        enabled: true,
        disabledThemes: ['famille'],
        disabledFrames: ['C03'],
      },
    };
    expect(aiGenerationEnabled(q)).toBe(true);
    expect(aiGenerationBlocked('famille', 'C14', q)).toBe(true);
    expect(aiGenerationBlocked('argent', 'C03', q)).toBe(true);
    expect(aiGenerationBlocked('argent', 'C12', q)).toBe(false);
  });
  it('le fichier en vigueur reste une qualification valide', () => {
    expect(isValidQualification(q)).toBe(true);
  });
});
