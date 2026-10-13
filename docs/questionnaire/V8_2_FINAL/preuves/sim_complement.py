# Ajoute aux couples V8.2 simulés les configurations « complément B » et « plafond A + B » (graine fixe).
import json, random, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classes import SA, SB
V71 = json.load(open('hist.json'))['37c6fa9']
P = json.load(open('simpairs.json'))
random.seed(5)
def add(p, ids):
    q = dict(p)
    for i in ids:
        ks = [o[0] for o in V71[i]['options']]
        q[i] = ','.join(sorted(random.sample(ks, min(2, len(ks))), key=ks.index)) if V71[i]['multiple'] else random.choice(ks)
    return q
P['v82c'] = [(add(a, SB), add(b, SB)) for a, b in P['v82']]
P['v82max'] = [(add(a, list(SA) + SB), add(b, list(SA) + SB)) for a, b in P['v82']]
json.dump(P, open('simpairs.json', 'w'))
print('ok')
