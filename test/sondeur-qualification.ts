import { readFileSync } from 'fs';
import { join } from 'path';
import type { Qualification } from '../src/ai/sondeur-router';

/**
 * Qualification de test avec la rédaction IA du Sondeur activée (la
 * production est en repli déterministe) : la même que celle de la recette
 * d'intégration V8.2 et de l'e2e (test/fixtures/sondeur-models.ia-active.json).
 */
export const ENABLED_QUALIFICATION = JSON.parse(
  readFileSync(
    join(__dirname, 'fixtures', 'sondeur-models.ia-active.json'),
    'utf8',
  ),
) as Qualification;
