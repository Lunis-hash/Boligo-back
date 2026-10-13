import re, json, sys, os
sys.path.insert(0,'.'); import model as M
eng=open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../src/') + 'matching/divergence.engine.ts').read()
pool=open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../src/') + 'journey/sondeur.pool.ts').read()
gen=open('' + os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../src/') + 'journey/sondeur.generator.ts').read()
deps=json.load(open('deps.json'))
dead=[x for x in deps['dep'] if x!='M6_Q04' and x not in M.COMPAT]
active=set(i['id'] for i in M.ITEMS if not i['id'].startswith('V82_'))|set(M.COMPAT)
# engine rule blocks
blocks={}
for m in re.finditer(r"\{\s*(?://[^\n]*\n\s*)*questionId: '(M\d+_Q\d\d)',(.*?)\n  \},", eng, re.S):
    blocks.setdefault(m.group(1),[]).append(m.group(2))
def info(b):
    th=re.search(r"theme: '(\w+)'",b); lb=re.search(r"label: '([^']*)'|label: \"([^\"]*)\"",b)
    sev=sorted(set(re.findall(r"'(critique|majeure|moderee|mineure)'",b)))
    flags=[f for f in ['fact: true','silent: true','risksOnly: true','supersededBy','discreet'] if f in b]
    return (th.group(1) if th else '?', (lb.group(1) or lb.group(2)) if lb else '?', sev, flags)
themes={}
for q,bs in blocks.items():
    for b in bs:
        themes.setdefault(info(b)[0],{'active':set(),'dead':set()})
        themes[info(b)[0]]['active' if q in active else 'dead'].add(q)
out={}
for x in dead:
    bs=blocks.get(x,[])
    inf=[info(b) for b in bs]
    fn_rules=[m.group(1) for m in re.finditer(r'function (\w+)\([^)]*\)[^{]*\{', eng) if False]
    # fonctions spéciales qui citent x
    special=[]
    for m in re.finditer(r'\nfunction (\w+)\(.*?\n\}', eng, re.S):
        if x in m.group(0) and 'questionId: '+repr(x) not in m.group(0): special.append(m.group(1))
    deep=len(re.findall(r"\n  '?%s'?: \{" % x, pool))
    agr=len(re.findall(r"'%s:[A-Z]'" % x, pool))
    days=re.search(r"\n  %s: \[([^\]]*)\]" % x, pool)
    nn=x in pool[pool.index('NON_NEGOTIABLE'):pool.index('NON_NEGOTIABLE')+3000]
    gsets=[n for n in ['MINOR_WORTH_ASKING','SAFETY_QUESTIONS','SELF_DISCLOSURE_QUESTIONS','CONTROL_TOPICS','RISKY'] if re.search(n+r"[^;]*'"+x+"'", gen, re.S) and gen.find(x, gen.find(n)) - gen.find(n) < 600]
    out[x]=dict(rules=inf, special=special, deep=deep, agreements=agr, days=days.group(1) if days else None, nonneg=nn, gen=gsets)
    print(x, inf, special, 'deep',deep,'agr',agr, 'nn' if nn else '', gsets)
print()
for t,v in themes.items(): print(t, 'actifs',len(v['active']), sorted(v['active'])[:12], '| retirés', len(v['dead']))
json.dump(out,open('dead47.json','w'),ensure_ascii=False,indent=1)
print(len(dead))
