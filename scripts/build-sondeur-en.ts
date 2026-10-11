/**
 * Assemble la version anglaise du Sondeur (docs/sondeur-en/*.json) dans
 * src/journey/sondeur.en.generated.ts. Les gabarits à trous sont contrôlés
 * avant d'être écrits comme code : une seule forme admise, sans autre
 * expression que ${w.phrase} et ${w.cap}.
 *   npx ts-node --transpile-only scripts/build-sondeur-en.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIR = join(__dirname, '..', 'docs', 'sondeur-en');
const OUT = join(__dirname, '..', 'src', 'journey', 'sondeur.en.generated.ts');
const read = (f: string) =>
  JSON.parse(readFileSync(join(DIR, f), 'utf8')) as Record<string, string>;
const files = readdirSync(DIR);
const merge = (prefix: string) =>
  Object.assign(
    {},
    ...files
      .filter((f) => f.startsWith(prefix))
      .sort()
      .map(read),
  ) as Record<string, string>;

const texts = { ...merge('out_texts_'), ...merge('supplement_texts') };
const options = { ...merge('out_options_'), ...merge('supplement_options') };
const phrases = read('out_phrases.json');
const fns = read('out_functions.json');

const SAFE_FN = /^\(w\) => `(?:[^`$\\]|\$\{w\.(?:phrase|cap)\})*`$/;
const bad = Object.entries(fns).filter(([, en]) => !SAFE_FN.test(en.trim()));
if (bad.length)
  throw new Error(
    `Gabarits anglais refusés : ${bad.map(([fr]) => fr).join(' | ')}`,
  );
for (const [k, v] of Object.entries({ ...texts, ...options, ...phrases }))
  if (typeof v !== 'string' || (k !== '' && !v.trim()))
    throw new Error(`Valeur vide pour « ${k} »`);

const body =
  '/* eslint-disable */\n' +
  '// Fichier GÉNÉRÉ par scripts/build-sondeur-en.ts à partir de docs/sondeur-en/.\n' +
  '// Ne pas modifier à la main : corriger le JSON source puis relancer le script.\n' +
  "import type { EnTopicWords } from './sondeur.i18n';\n\n" +
  `export const EN_TEXT: Record<string, string> = ${JSON.stringify(texts, null, 1)};\n\n` +
  `export const EN_OPTION: Record<string, string> = ${JSON.stringify(options, null, 1)};\n\n` +
  `export const EN_PHRASE: Record<string, string> = ${JSON.stringify(phrases, null, 1)};\n\n` +
  'export const EN_TOPIC: Array<[string, (w: EnTopicWords) => string]> = [\n' +
  Object.entries(fns)
    .map(([fr, en]) => ` [${JSON.stringify(fr)}, ${en.trim()}],`)
    .join('\n') +
  '\n];\n';
writeFileSync(OUT, body);
console.log(
  `textes ${Object.keys(texts).length} · options ${Object.keys(options).length} · sujets ${Object.keys(phrases).length} · gabarits à trous ${Object.keys(fns).length}`,
);
