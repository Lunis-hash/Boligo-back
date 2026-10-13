# Exporte le Grand Entretien V8.2 (modèle validé) vers l'application :
# src/interview/questions.v82.generated.ts. Aucune donnée n'est saisie à la main
# ici, sauf les cinq questions B validées (quatre reprises telles quelles de la V7
# et la reformulation V82_M8_06, définie dans src/interview/questions.v82.ts).
#   python3 -I export_app.py           → écrit le fichier
#   python3 -I export_app.py --check   → échoue si le fichier n'est pas à jour
import json, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model as M

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'src', 'interview', 'questions.v82.generated.ts')

# Conditions d'affichage, au format `dependsOn` de l'application (l'une au moins
# doit être remplie). Chacune est vérifiée ci-dessous contre model.COND.
ALL_FAITHS = [c for c in M.codes(M.BY['M1_Q16'])]
DEPENDS = {
    'M1_Q17': [('M1_Q16', [c for c in ALL_FAITHS if c not in ('I', 'L', 'M', 'N')])],
    'V82_M4_08': [('M1_Q16', ['D']), ('M1_Q18', ['C', 'D', 'E'])],
    'M3_Q04': [('V82_M0_03', ['B', 'C', 'D', 'E']), ('M0_Q14', ['A', 'B', 'C'])],
    'V82_M3_02': [('V82_M3_01', ['B', 'C', 'D'])],
    'V82_M8_02': [('V82_M8_01', ['A', 'B', 'C'])],
    'V82_M8_04': [('V82_M0_03', ['B', 'C', 'D']), ('M0_Q06', ['A', 'B', 'C'])],
    'M8_Q18': [('V82_M0_03', ['B', 'C', 'D']), ('M0_Q06', ['A', 'B', 'C'])],
    'M8_Q20': [('V82_M0_03', ['B', 'C', 'D']), ('M0_Q06', ['A', 'B', 'C'])],
    # « Sauf si V82_M3_01 = A » : la question précédente est toujours posée
    # (« Je préfère ne pas répondre » = E ouvre la suite, comme dans le modèle).
    'V82_M9_06': [('V82_M3_01', ['B', 'C', 'D', 'E'])],
    'V82_M9_07': [('V82_M3_01', ['B', 'C', 'D', 'E'])],
}
assert set(DEPENDS) == set(M.COND), set(DEPENDS) ^ set(M.COND)

def met(deps, a):
    return any(M.has(a, q, *vals) for q, vals in deps)

# Vérification exhaustive par tirage : même décision que le modèle validé.
rng = random.Random(82)
for _ in range(20000):
    a = {}
    for q in ('M1_Q16', 'M1_Q18', 'V82_M0_03', 'M0_Q14', 'M0_Q06', 'V82_M3_01', 'V82_M8_01'):
        if rng.random() < 0.9:
            cs = M.codes(M.BY[q])
            if M.BY[q]['type'] == 'M':
                k = rng.sample(cs, rng.randint(1, 2))
                a[q] = ','.join(sorted(k, key=cs.index))
            else:
                a[q] = rng.choice(cs)
    for qid, deps in DEPENDS.items():
        want = M.COND[qid][0](a)
        if qid in ('V82_M9_06', 'V82_M9_07') and not a.get('V82_M3_01'):
            continue  # question précédente non répondue : l'application ne la saute pas
        assert met(deps, a) == want, (qid, a)

SCALE = {'L': 'accord', 'F': 'frequence'}
FREE_TEXT = {('M0_Q10', 'I'), ('V82_M1_01', 'A')}
SESSION = {}
for s, (_, _, screens) in enumerate(M.SESSIONS, 1):
    for _, ids in screens:
        for q in ids:
            SESSION[q] = s

def export_item(q):
    out = {'id': q['id'], 'moduleNumber': q['m'], 'text': q['fr']}
    opts = []
    multi = M.MULTI.get(q['id'])
    pnr = M.pnr_code(q)
    for code, fr, _ in M.options(q):
        o = {'key': code, 'text': fr}
        if (q['id'], code) in FREE_TEXT:
            o['freeText'] = True
        if multi and (code in multi['exclusive'] or code == pnr):
            o['exclusive'] = True
        opts.append(o)
    out['options'] = opts
    if q['type'] == 'M':
        out['multiple'] = True
        if multi['max']:
            out['maxChoices'] = multi['max']
    if q['type'] in SCALE:
        out['scale'] = SCALE[q['type']]
    if q['type'] == 'N':
        out['input'] = 'ageRange'
    if q['id'] in DEPENDS:
        deps = [{'questionId': d, 'values': v} for d, v in DEPENDS[q['id']]]
        out['rules'] = {'dependsOn': deps[0] if len(deps) == 1 else deps}
    if q['opt']:
        out['optional'] = True
    if q['dim'] and q['m'] in (2, 6, 7) and q['type'] in ('L', 'F', 'X'):
        out['dimension'] = q['dim']
        if q['rev']:
            out['reversed'] = True
    out['session'] = SESSION[q['id']]
    return out

def export_en(q):
    return {'text': q['en'], 'options': {code: en for code, _, en in M.options(q)}}

items = [M.BY[i] for i in M.ORDER]
assert len(items) == 113 and len({i['id'] for i in items}) == 113
data = [export_item(q) for q in items]
en = {q['id']: export_en(q) for q in items}

body = (
    '/* eslint-disable */\n'
    '// Fichier GÉNÉRÉ par docs/questionnaire/V8_2_FINAL/preuves/export_app.py\n'
    '// à partir du modèle V8.2 validé (model.py). Ne pas modifier à la main.\n'
    "import type { V82QuestionData, V82Translation } from './questions.v82';\n\n"
    f'export const V82_BASE: V82QuestionData[] = {json.dumps(data, ensure_ascii=False, indent=1)};\n\n'
    f'export const V82_BASE_EN: Record<string, V82Translation> = {json.dumps(en, ensure_ascii=False, indent=1)};\n'
)
if '--check' in sys.argv:
    cur = open(OUT, encoding='utf8').read() if os.path.exists(OUT) else ''
    if cur != body:
        sys.exit('questions.v82.generated.ts n’est pas à jour : relancez export_app.py')
    print('à jour')
else:
    open(OUT, 'w', encoding='utf8').write(body)
    print(f'{len(data)} questions écrites dans {os.path.relpath(OUT, ROOT)}')
