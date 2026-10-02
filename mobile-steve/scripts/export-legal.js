/* eslint-disable no-console */
/**
 * Exporte les textes légaux (constants/legal.json) en Markdown dans docs/legal/.
 *   node scripts/export-legal.js
 */
const fs = require('fs');
const path = require('path');

const legal = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'constants', 'legal.json'), 'utf8'));
const outDir = path.resolve(__dirname, '..', 'docs', 'legal');
fs.mkdirSync(outDir, { recursive: true });

function render(doc) {
  const lines = [`# ${doc.title} — BOLIGO`, '', `Version du ${legal.version}.`, '', doc.intro, ''];
  for (const section of doc.sections) {
    lines.push(`## ${section.title}`, '');
    for (const p of section.paragraphs) lines.push(p, '');
  }
  lines.push('---', '', '> Les mentions entre crochets « [À COMPLÉTER : …] » doivent être renseignées par l\'éditeur avant publication. Ce texte est un projet rédigé pour BOLIGO ; il doit être validé par un conseil juridique.', '');
  return lines.join('\n');
}

fs.writeFileSync(path.join(outDir, 'CGU.md'), render(legal.cgu));
fs.writeFileSync(path.join(outDir, 'POLITIQUE_CONFIDENTIALITE.md'), render(legal.privacy));
console.log('docs/legal/CGU.md et docs/legal/POLITIQUE_CONFIDENTIALITE.md générés (version', legal.version + ')');
