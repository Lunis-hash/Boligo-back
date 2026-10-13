# Couples simulés : V7.1 (toutes les questions en service) et V8.2 (réponses V8.2 → vue V7 de compatibilité)
import json, random, sys
sys.path.insert(0, '.')
import model as M
import tests  # noqa: réutilise rand_profile (exécute aussi la recette)
random.seed(42)
V71 = json.load(open('hist.json'))['37c6fa9']
def v7_profile():
    a = {}
    for qid, q in V71.items():
        keys = [o[0] for o in q['options']]
        if not keys: continue
        if q['multiple']:
            excl = [o[0] for o in q['options'] if o[2]]
            mx = (q.get('rules') or {}).get('maxChoices') or 3
            if excl and random.random() < 0.15:
                a[qid] = random.choice(excl)
            else:
                pool = [k for k in keys if k not in excl and k != 'I']
                n = random.randint(1, min(mx, len(pool), 3))
                a[qid] = ','.join(sorted(random.sample(pool, n), key=keys.index))
        else:
            a[qid] = random.choice(keys)
    return a
pairs = {'v71': [(v7_profile(), v7_profile()) for _ in range(300)],
         'v82': [(M.v7_view(tests.rand_profile()), M.v7_view(tests.rand_profile())) for _ in range(300)]}
json.dump(pairs, open('simpairs.json', 'w'))
print({k: sum(len(a) for a, _ in v) / len(v) for k, v in pairs.items()})
