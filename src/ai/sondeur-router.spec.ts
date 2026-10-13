import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  Qualification,
  isValidQualification,
  modelsFor,
  restrictToQualified,
  shouldEscalate,
} from './sondeur-router';

const Q: Qualification = {
  generatedAt: '2026-10-12',
  run: 'essai',
  writer: ['qwen/qwen-x', 'deepseek/deepseek-y'],
  critic: ['z-ai/glm-z', 'qwen/qwen-x'],
  escalation: ['openai/gpt-premium'],
  fallback: ['deepseek/deepseek-y'],
  escalateAboveRejectRate: 0.5,
  byLanguage: { en: ['deepseek/deepseek-y'] },
};

describe('Routeur des modèles du Sondeur', () => {
  it('relecteur toujours d’une autre famille que le rédacteur', () => {
    const { models } = modelsFor('critic', { avoid: 'qwen/qwen-x', q: Q });
    expect(models).toEqual(['z-ai/glm-z']);
  });

  it('rédacteur par langue quand le banc d’essai l’a justifié', () => {
    expect(modelsFor('writer', { lang: 'en', q: Q }).models).toEqual([
      'deepseek/deepseek-y',
    ]);
    expect(modelsFor('writer', { lang: 'fr', q: Q }).models[0]).toBe(
      'qwen/qwen-x',
    );
  });

  it('un modèle non qualifié ne peut pas être imposé par une variable d’environnement', () => {
    expect(
      restrictToQualified(['openai/nouveau', 'qwen/qwen-x'], 'writer', Q),
    ).toEqual(['qwen/qwen-x']);
  });

  it('mode provisoire (sans banc d’essai) : signalé comme non qualifié', () => {
    const r = modelsFor('writer', { q: null });
    expect(r.qualified).toBe(false);
    expect(r.models.length).toBeGreaterThan(0);
  });

  it('escalade seulement si la relecture rejette trop ou ne garde rien', () => {
    expect(shouldEscalate({ proposed: 12, accepted: 9 }, Q)).toBe(false);
    expect(shouldEscalate({ proposed: 12, accepted: 4 }, Q)).toBe(true);
    expect(shouldEscalate({ proposed: 12, accepted: 0 }, Q)).toBe(true);
    expect(shouldEscalate({ proposed: 0, accepted: 0 }, Q)).toBe(false);
  });

  it('qualification invalide refusée : liste vide, modèle gratuit', () => {
    expect(isValidQualification(Q)).toBe(true);
    expect(isValidQualification({ ...Q, writer: [] })).toBe(false);
    expect(isValidQualification({ ...Q, critic: ['x/y:free'] })).toBe(false);
  });

  it('fichier de qualification lu au démarrage', () => {
    const dir = mkdtempSync(join(tmpdir(), 'sondeur-'));
    const file = join(dir, 'm.json');
    writeFileSync(file, JSON.stringify(Q));
    jest.isolateModules(() => {
      process.env.SONDEUR_MODELS_FILE = file;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const r =
        require('./sondeur-router') as typeof import('./sondeur-router');
      expect(r.qualification()?.run).toBe('essai');
      expect(r.modelsFor('writer').qualified).toBe(true);
      delete process.env.SONDEUR_MODELS_FILE;
    });
  });
});
