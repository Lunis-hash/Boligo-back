# Couples simulés par niveau de compatibilité, pour les 5 configurations. Graines fixes.
# Aucune réponse V7 n'est inventée pour simuler une règle V8.2 : les règles natives lisent
# les réponses V8.2 ; les 5 questions réintégrées (B) sont de vraies questions répondues.
import json, random, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'preuves'))
import model as M
V71 = json.load(open(os.path.join(HERE, '..', 'preuves', 'hist.json')))['37c6fa9']
B_REINT = ['M5_Q07', 'M9_Q07', 'M8_Q13', 'M4_Q14', 'M10_Q15']
LEVELS = {'compatible': 0.1, 'partiel': 0.4, 'incompatible': 0.85}

def v82_person(rng):
    a = {}
    for qid in M.ORDER:
        q = M.BY[qid]
        if not M.shown(qid, a): continue
        cs = [c for c in M.codes(q) if c != 'NA'] if q['type'] != 'F' else M.codes(q)
        if q['type'] == 'N': continue
        if q['type'] == 'M':
            while True:
                v = ','.join(sorted(rng.sample(cs, rng.randint(1, min(3, len(cs)))), key=cs.index))
                if M.valid_answer(qid, v)[0]: break
            a[qid] = v
        else:
            a[qid] = rng.choice(cs)
    return a

def v7_answer(qid, rng):
    q = V71[qid]; ks = [o[0] for o in q['options']]
    if q['multiple']:
        ex = [o[0] for o in q['options'] if o[2]]
        pool = [k for k in ks if k not in ex and k != 'I']
        return ','.join(sorted(rng.sample(pool, rng.randint(1, min(3, len(pool)))), key=ks.index))
    return rng.choice(ks)

def v7_person(rng):
    return {qid: v7_answer(qid, rng) for qid, q in V71.items() if q['options']}

def perturb(a, p, rng, regen):
    b = dict(a)
    for k in list(b):
        if rng.random() < p:
            b[k] = regen(k, rng)
    return b

def v82_regen_factory(base):
    def regen(qid, rng):
        q = M.BY[qid]
        cs = M.codes(q)
        if q['type'] == 'M':
            while True:
                v = ','.join(sorted(rng.sample(cs, rng.randint(1, min(3, len(cs)))), key=cs.index))
                if M.valid_answer(qid, v)[0]: return v
        return rng.choice(cs)
    return regen

def coherent(p):
    # Une personne ne refuse pas chez l'autre ce qu'elle fait elle-même.
    for tol, beh in (('M0_Q11', 'M0_Q09'), ('M0_Q13', 'M0_Q12'), ('M0_Q16', 'M0_Q15')):
        if p.get(tol) == 'A' and p.get(beh) not in (None, 'A'): p[beh] = 'A'
    if p.get('M0_Q14') == 'D' and p.get('V82_M0_03') not in (None, 'A'): p['M0_Q14'] = 'A'
    return p

FORCE = [  # une incompatibilité déclarée par recette (règles V8.2 section 7.2)
 lambda a, b: (a.update(M0_Q06='A'), b.update(M0_Q06='D')),
 lambda a, b: (a.update(M0_Q14='D', V82_M0_03='A'), b.update(V82_M0_03='B')),
 lambda a, b: (a.update(M0_Q11='A', M0_Q09='A'), b.update(M0_Q09='C')),
 lambda a, b: (a.update(M0_Q13='A', M0_Q12='A'), b.update(M0_Q12='C')),
 lambda a, b: (a.update(M0_Q16='A', M0_Q15='A'), b.update(M0_Q15='C')),
 lambda a, b: (a.update(M1_Q16='D', M1_Q18='A'), b.update(M1_Q16='A', M1_Q18='D')),
 lambda a, b: (a.update(M4_Q17='A'), b.update(M4_Q17='D')),
 lambda a, b: (a.update(M1_Q16='D', V82_M4_08='A'), b.update(M1_Q16='D', V82_M4_08='D')),
]
def clean(p):
    return {k: v for k, v in p.items() if k not in M.BY or M.BY[k]['type'] == 'N' or M.shown(k, p)}

out = {}
for level, p in LEVELS.items():
    rng = random.Random(f'v82-{level}')
    cps = []
    while len(cps) < 200:
        a = coherent(v82_person(rng))
        for _ in range(60):
            b = clean(coherent(perturb(a, p if level != 'incompatible' else 0.4, rng, v82_regen_factory(a))))
            if not M.incompatible(a, b): break
        else:
            continue
        aa = dict(a)
        if level == 'incompatible':
            rng.choice(FORCE)(aa, b); aa, b = clean(aa), clean(b)
            if not M.incompatible(aa, b): continue
        ba = {k: v7_answer(k, rng) for k in B_REINT}
        bb = perturb(ba, p if level != 'incompatible' else 0.4, rng, v7_answer)
        cps.append(dict(a=aa, b=b, a7=M.v7_view(aa), b7=M.v7_view(b), Ba=ba, Bb=bb, v82incompat=M.incompatible(aa, b),
                        majeurs=sum(1 for l, _, _ in M.compare(aa, b) if l == M.MAJEUR)))
    out[f'v82_{level}'] = cps
    rng = random.Random(f'v71-{level}')
    cps = []
    for _ in range(200):
        a = coherent(v7_person(rng))
        b = coherent(perturb(a, p if level != 'incompatible' else 0.4, rng, v7_answer))
        if level == 'incompatible': a['M0_Q06'], b['M0_Q06'] = 'A', 'D'
        cps.append(dict(a7=a, b7=b))
    out[f'v71_{level}'] = cps
json.dump(out, open(os.path.join(HERE, 'couples.json'), 'w'))
# Options V8.2 (textes) pour les règles natives
items = {q['id']: {'type': q['type'], 'options': {c: f for c, f, _ in M.options(q)}, 'theme_m': q['m']} for q in M.ITEMS}
json.dump(items, open(os.path.join(HERE, 'v82_items.json'), 'w'), ensure_ascii=False)
print({k: len(v) for k, v in out.items()}); print('incompat V8.2 :', {l: sum(c['v82incompat'] for c in out[f'v82_{l}']) for l in LEVELS}, 'écarts majeurs moyens :', {l: round(sum(c['majeurs'] for c in out[f'v82_{l}'])/200, 2) for l in LEVELS})
