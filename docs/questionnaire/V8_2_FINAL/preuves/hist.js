const ts = require(require('path').join(__dirname, '../../../../node_modules/typescript'));
const { execSync } = require('child_process');
const commits = process.argv.slice(2);
const out = {};
for (const c of commits) {
  let src;
  try { src = execSync(`git -C ${require('path').join(__dirname, '../../../..')} show ${c}:src/interview/questions.data.ts`, {maxBuffer: 1e8}).toString(); } catch { continue; }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  try { new Function('module', 'exports', 'require', js)(m, m.exports, require); } catch (e) { console.error(c, e.message); continue; }
  const arr = Object.values(m.exports).find(v => Array.isArray(v) && v.length && v[0].id);
  out[c] = {};
  for (const q of arr) out[c][q.id] = { text: q.text, options: (q.options||[]).map(o => [o.key, o.text, o.exclusive?1:0]), multiple: !!q.multiple, scale: q.scale||null, module: q.moduleNumber, rules: q.rules||null };
}
require('fs').writeFileSync(require('path').join(__dirname, 'hist.json'), JSON.stringify(out));
for (const c of commits) console.log(c, out[c] ? Object.keys(out[c]).length : 'X');
