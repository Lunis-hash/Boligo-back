const cl = require('/home/user/Boligo-back/src/journey/clinical-lens');
const { NATIVE_DEEP, NATIVE_AGREEMENTS, NEUTRAL_B } = require('/home/user/Boligo-back/docs/questionnaire/V8_2_FINAL/sondeur_v82/native-rules');
const texts: string[] = [];
for (const d of Object.values<any>(NATIVE_DEEP)) for (const t of Object.values<any>(d)) texts.push(t.text);
for (const a of Object.values<any>(NATIVE_AGREEMENTS)) { texts.push(a.probe.text); texts.push(`${a.statement} ${a.probe.text}`); }
for (const n of NEUTRAL_B) texts.push(n.tpl.text);
const checks: Record<string, (t: string) => boolean> = {
  len: (t) => t.length >= 20 && t.length <= cl.MAX_QUESTION_LENGTH, open: cl.isOpenQuestion, jargon: (t) => !cl.hasClinicalJargon(t),
  interp: (t) => !cl.hasInterpretation(t), intrusive: (t) => !cl.isIntrusiveQuestion(t), double: (t) => !cl.isDoubleQuestion(t),
  morale: (t) => !cl.MORALE.test(t) && !cl.MORALE_PREFIX.test(t), past: (t) => !cl.SHARED_PAST.test(t), body: (t) => !cl.BODY_HEALTH.test(t),
  ultimatum: (t) => !cl.ULTIMATUM.test(t), presupposed: (t) => !cl.PRESUPPOSED.test(t), intrusiveMore: (t) => !cl.INTRUSIVE_MORE.test(t),
  tutoie: (t) => !cl.TUTOIEMENT.test(t), painful: (t) => !cl.PAINFUL_STORY.test(t), sexual: (t) => !cl.SEXUAL_DETAIL.test(t),
};
let fails = 0;
for (const t of texts) if (!cl.passesFormRules(t)) { fails++; console.log('KO', Object.entries(checks).filter(([, f]) => { try { return !f(t); } catch { return false; } }).map(([k]) => k).join(','), '|', t); }
console.log(texts.length, 'textes,', fails, 'échecs');
