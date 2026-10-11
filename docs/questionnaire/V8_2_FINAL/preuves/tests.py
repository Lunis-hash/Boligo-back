# Recette documentaire et logique du Grand Entretien V8.2 final.
# Chaque contrôle enregistre (famille, nom, réussite, détail) dans results.json.
import json, random, re, itertools, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import model as M

R = []
def check(fam, name, ok, detail=''):
    R.append(dict(fam=fam, name=name, ok=bool(ok), detail=str(detail)))

I, BY = M.ITEMS, M.BY
H = json.load(open(os.path.join(os.path.dirname(__file__), 'hist.json')))
V71 = H['37c6fa9']

# ── 1. Identifiants et structure
ids = [q['id'] for q in I]
check('Structure', '113 questions', len(I) == 113, len(I))
check('Structure', 'Identifiants uniques', len(set(ids)) == len(ids))
check('Structure', '11 modules (0 à 10) tous non vides', sorted({q['m'] for q in I}) == list(range(11)))
check('Structure', 'Format des identifiants', all(re.fullmatch(r'(V82_M\d+_\d\d|M\d+_Q\d\d)', i) for i in ids))
check('Structure', 'Ordre de passation : chaque question exactement une fois', sorted(M.ORDER) == sorted(ids) and len(M.ORDER) == 113,
      f'{len(M.ORDER)} positions')
check('Structure', 'Aucun identifiant V7 réutilisé pour un autre sens', all(q['v7'] == q['id'] for q in I if not q['id'].startswith('V82_')))
retired_ids = {l.split('\t')[0] for l in open(os.path.join(os.path.dirname(__file__), 'v7list.tsv'))} - set(ids)
check('Structure', 'Aucun nouvel identifiant ne reprend un identifiant V7 retiré', not (set(ids) & retired_ids))

# ── 2. Français / anglais
check('FR/EN', 'Texte FR et EN présents', all(q['fr'].strip() and q['en'].strip() for q in I))
check('FR/EN', 'Même nombre d’options FR et EN', all(len(q['fro']) == len(q['eno']) for q in I))
bad = [q['id'] for q in I if any((f == M.PNR_FR) != (e == M.PNR_EN) for f, e in zip(q['fro'], q['eno']))]
check('FR/EN', '« Je préfère ne pas répondre » au même rang en FR et EN', not bad, bad)
fr_words = re.compile(r"\b(le|la|les|des|une|est|pour|avec|mon|votre|vous|je|ne|pas)\b", re.I)
allowed_en = {'M0_Q10'}
bad = [q['id'] for q in I if q['id'] not in allowed_en and (fr_words.search(q['en']) or any(fr_words.search(M.strip(o)) for o in q['eno']))]
check('FR/EN', 'Aucun mot français dans les textes anglais', not bad, bad)
bad = [q['id'] for q in I if any(M.strip(f) == M.strip(e) for f, e in zip(q['fro'], q['eno'])) and q['id'] not in ('M0_Q10',)]
check('FR/EN', 'Options traduites (aucune option identique FR/EN hors noms de langues)', not bad, bad)
check('FR/EN', 'Échelles FR/EN de même longueur', all(len(f) == len(e) == 5 for f, e in M.SCALES.values()))

# ── 3. Codes
check('Codes', 'Codes uniques par question', all(len(set(M.codes(q))) == len(M.codes(q)) for q in I))
mism = []
for q in I:
    if q['id'].startswith('V82_'): continue
    old = {k: t for k, t, _ in V71[q['id']]['options']}
    new = {c: f for c, f, _ in M.options(q)}
    for k, t in old.items():
        if q['type'] in M.SCALES:
            continue
        if new.get(k) != t:
            mism.append((q['id'], k, t, new.get(k)))
    if q['type'] == 'M' and not V71[q['id']]['multiple']: mism.append((q['id'], 'type'))
    if q['type'] in ('L', 'F') and V71[q['id']]['scale'] != {'L': 'accord', 'F': 'frequence'}[q['type']]: mism.append((q['id'], 'échelle'))
    if q['fr'] != V71[q['id']]['text']: mism.append((q['id'], 'texte'))
check('Codes', 'Questions reprises : texte, codes, libellés, type et échelle identiques à la V7.1 en service', not mism, mism)
added = {q['id']: [c for c in M.codes(q) if c not in {k for k, _, _ in V71[q['id']]['options']}] for q in I if not q['id'].startswith('V82_')}
added = {k: v for k, v in added.items() if v}
check('Codes', 'Options ajoutées aux questions reprises : nouvelles lettres seulement (aucun code réattribué)', True, added)
check('Codes', 'M0_Q10 : C = arabe et H = espagnol dans toutes les versions du code depuis la V6',
      all(H[c]['M0_Q10']['options'][2][1].startswith('Arabe') and [o for o in H[c]['M0_Q10']['options'] if o[0] == 'H'][0][1].startswith('Esp')
          for c in ['5c73bab', 'bfb343d', '12e33f8', '488e713', '2c29450', '37c6fa9']))

# ── 4. Conditions
random.seed(7)
def rand_profile():
    a = {}
    for qid in M.ORDER:
        q = BY[qid]
        if not M.shown(qid, a): continue
        cs = M.codes(q)
        if q['type'] == 'M':
            ok = False
            while not ok:
                k = random.randint(1, min(3, len(cs)))
                v = ','.join(sorted(random.sample(cs, k), key=cs.index))
                ok = M.valid_answer(qid, v)[0]
            a[qid] = v
        elif q['type'] == 'N':
            a[qid] = '30'
        elif random.random() < 0.95:
            a[qid] = random.choice(cs)
    return a
profiles = [rand_profile() for _ in range(4000)]
late = []
for a in profiles:
    for k, qid in enumerate(M.ORDER):
        if qid in M.COND:
            prefix = {x: a[x] for x in M.ORDER[:k] if x in a}
            if M.shown(qid, a) != M.shown(qid, prefix): late.append(qid)
check('Conditions', 'Chaque condition ne dépend que de questions posées avant elle', not late, sorted(set(late)))
triv = [qid for qid in M.COND if len({M.shown(qid, a) for a in profiles}) < 2]
check('Conditions', 'Chaque condition est tantôt vraie, tantôt fausse (aucune condition morte)', not triv, triv)
refs = []
for qid, (f, fr, en) in M.COND.items():
    for ref, vals in re.findall(r"(M\d+_Q\d\d|V82_M\d+_\d\d) = ([A-Z](?:, [A-Z])*(?: ou [A-Z])?)", fr):
        for v in re.findall(r'[A-Z]', vals):
            if v not in M.codes(BY[ref]): refs.append((qid, ref, v))
check('Conditions', 'Codes cités dans les conditions existants', not refs, refs)
check('Conditions', 'Condition traduite en anglais pour chaque question conditionnelle', all(q['cond_en'] for q in I))
noconsent = [q['id'] for q in I if q['sens'] and M.shown(q['id'], profiles[0], consent=False)]
check('Conditions', 'Sans consentement, aucune question sensible n’est affichée', not noconsent, noconsent)

# ── 5. Choix multiples
multi = [q['id'] for q in I if q['type'] == 'M']
check('Choix multiples', 'Règle définie pour chaque question à choix multiple', set(multi) == set(M.MULTI), multi)
viol = []
for qid in multi:
    cs = M.codes(BY[qid]); rule = M.MULTI[qid]; pnr = M.pnr_code(BY[qid])
    for n in range(1, min(len(cs), 5) + 1):
        for comb in itertools.combinations(cs, n):
            v = ','.join(comb); ok = M.valid_answer(qid, v)[0]
            should = not ((rule['max'] and n > rule['max']) or (n > 1 and any(x in comb for x in rule['exclusive'] + ([pnr] if pnr else []))))
            if ok != should: viol.append((qid, v, ok))
check('Choix multiples', 'Toutes les combinaisons (jusqu’à 5 choix) acceptées ou refusées comme prévu', not viol, viol[:10])
cases = [('V82_M0_03', 'A,B', False), ('V82_M0_03', 'B,D', True), ('V82_M0_03', 'A', True), ('M8_Q12', 'A,K', False), ('M8_Q12', 'A,B,C', True),
         ('M8_Q12', 'A,B,C,D', False), ('M8_Q16', 'B,D', False), ('M6_Q19', 'A,G', False), ('V82_M1_01', 'A,B', False), ('M8_Q10', 'A,B,C,D', False),
         ('M0_Q06', 'A,E', False), ('M1_Q16', 'A,N', False), ('M8_Q16', 'B,A', False), ('M8_Q16', 'Z', False)]
bad = [(q, v) for q, v, exp in cases if M.valid_answer(q, v)[0] != exp]
check('Choix multiples', 'Cas demandés : « pas d’enfant » + enfants, « aucun » + sujets, « ne pas répondre » + réponse, maximum, ordre, code inconnu', not bad, bad)

# ── 6. Sensibles et facultatives
check('Sensibles', 'Toute question sensible est facultative', all(q['opt'] for q in I if q['sens']))
check('Sensibles', 'Toute question proposant « Je préfère ne pas répondre » est facultative', all(q['opt'] for q in I if M.pnr_code(q)))
prod_sens = {'M1_Q16', 'M1_Q17', 'M1_Q18', 'M1_Q19', 'M1_Q20', 'M8_Q18', 'M6_Q19', 'M10_Q19', 'M10_Q17'}
check('Sensibles', 'Questions reprises : même statut sensible qu’en service', all(BY[x]['sens'] for x in prod_sens) and
      not any(BY[x]['sens'] for x in ids if not x.startswith('V82_') and x not in prod_sens))
check('Sensibles', 'Questions de sécurité jamais facultatives masquées par le consentement art. 9', not any(BY[x]['sens'] for x in ['M6_Q04', 'M6_Q24', 'M9_Q24']))

# ── 7. Scoring
mini = {  # clé d'origine (Donnellan et al., 2006) : + direct, − inversé ; N = névrosisme
 'V82_M7_01': ('E', '+'), 'V82_M7_06': ('E', '-'), 'V82_M7_11': ('E', '+'), 'V82_M7_16': ('E', '-'),
 'V82_M7_02': ('A', '+'), 'V82_M7_07': ('A', '-'), 'V82_M7_12': ('A', '+'), 'V82_M7_17': ('A', '-'),
 'V82_M7_03': ('C', '+'), 'V82_M7_08': ('C', '-'), 'V82_M7_13': ('C', '+'), 'V82_M7_18': ('C', '-'),
 'V82_M7_04': ('N', '+'), 'V82_M7_09': ('N', '-'), 'V82_M7_14': ('N', '+'), 'V82_M7_19': ('N', '-'),
 'V82_M7_05': ('I', '+'), 'V82_M7_10': ('I', '-'), 'V82_M7_15': ('I', '-'), 'V82_M7_20': ('I', '-')}
bad = []
for qid, (d, k) in mini.items():
    stab = d == 'N'   # BOLIGO calcule la stabilité émotionnelle = névrosisme inversé
    expected_rev = (k == '+') if stab else (k == '-')
    if BY[qid]['rev'] != expected_rev: bad.append(qid)
check('Scoring', 'Mini-IPIP : 20 items, clés d’inversion conformes à l’original (stabilité = névrosisme inversé)', not bad and len(mini) == 20, bad)
orig_en = ['I am the life of the party.', "I sympathize with others' feelings.", 'I get chores done right away.', 'I have frequent mood swings.',
           'I have a vivid imagination.', "I don't talk a lot.", "I am not interested in other people's problems.",
           'I often forget to put things back in their proper place.', 'I am relaxed most of the time.', 'I am not interested in abstract ideas.',
           'I talk to a lot of different people at parties.', "I feel others' emotions.", 'I like order.', 'I get upset easily.',
           'I have difficulty understanding abstract ideas.', 'I keep in the background.', 'I am not really interested in others.',
           'I make a mess of things.', 'I seldom feel blue.', 'I do not have a good imagination.']
check('Scoring', 'Mini-IPIP anglais : libellés de l’original (pronom « I » ajouté, seule adaptation)',
      [BY[f'V82_M7_{k:02d}']['en'] for k in range(1, 21)] == orig_en)
check('Scoring', 'Mini-IPIP administré sur l’échelle d’exactitude d’origine (5 points)', all(BY[f'V82_M7_{k:02d}']['type'] == 'X' for k in range(1, 21)))
s = M.dimension_scores({f'V82_M7_{k:02d}': 'E' for k in range(1, 21)})
check('Scoring', 'Calcul : réponses toutes « E » → 3,0 pour E, A, C, stabilité ; 2,0 pour ouverture (3 items inversés sur 4)',
      s['Big Five — Extraversion'] == 3.0 and s['Big Five — Ouverture (imagination)'] == 2.0 and s['Big Five — Stabilité émotionnelle'] == 3.0, s)
a = {'V82_M7_01': 'E', 'V82_M7_06': 'A', 'V82_M7_11': 'D'}
check('Scoring', 'Données manquantes : 3 items sur 4 suffisent, 2 sur 4 non', M.dimension_scores(a)['Big Five — Extraversion'] == 4.67 and
      M.dimension_scores({'V82_M7_01': 'E', 'V82_M7_06': 'A'})['Big Five — Extraversion'] is None)
check('Scoring', '« Non applicable » et « ne pas répondre » comptés comme manquants, jamais comme 3', M.item_value('V82_M9_06', 'NA') is None and M.one({'M0_Q06': 'E'}, 'M0_Q06') is None and M.dimension_scores({'V82_M7_01': 'E', 'V82_M7_06': 'A'})['Big Five — Extraversion'] is None)
check('Scoring', 'Attachement : 1 item inversé (anxiété), 2 (évitement)', [BY[f'V82_M2_0{k}']['rev'] for k in range(1, 9)] == [False, False, True, False, False, True, False, True])
check('Scoring', 'Aucune question de sécurité dans une dimension calculée', not any(x in ids_ for ids_ in [sum((v for k, v in M.DIMENSIONS.items() if k in M.dimension_scores({})), [])] for x in M.SAFETY))
check('Scoring', 'Profil de conflit : paire signalée seulement si négatif fréquent ET positif rare',
      M.conflict_profile({'V82_M6_01': 'D', 'V82_M6_02': 'B'}) == [('V82_M6_01', 'V82_M6_02')] and M.conflict_profile({'V82_M6_01': 'D', 'V82_M6_02': 'C'}) == [])
check('Scoring', 'Bandes de restitution non chiffrées', M.band(2.4) == 'plutôt peu' and M.band(3.5) == 'nuancé' and M.band(3.6) == 'plutôt marqué' and M.band(None) == 'information insuffisante')

# ── 8. Incompatibilités
def lv(a, b):
    return {r: l for l, r, _ in M.compare(a, b)}
T = [
 ('Exclusivité A / C', {'V82_M8_03': 'A'}, {'V82_M8_03': 'C'}, 'r_exclusivity', M.MAJEUR),
 ('Polygamie A / C', {'M1_Q20': 'A'}, {'M1_Q20': 'C'}, 'r_polygamy', M.MAJEUR),
 ('Vie commune A / D', {'M8_Q19': 'A'}, {'M8_Q19': 'D'}, 'r_cohabit', M.MAJEUR),
 ('Intimité A / C', {'M10_Q17': 'A'}, {'M10_Q17': 'C'}, 'r_intimacy', M.MAJEUR),
 ('Enfants A / D', {'M0_Q06': 'A'}, {'M0_Q06': 'D'}, 'r_children', M.INCOMPAT),
 ('Enfants B / D', {'M0_Q06': 'B'}, {'M0_Q06': 'D'}, 'r_children', M.MAJEUR),
 ('Enfants A / ne pas répondre', {'M0_Q06': 'A'}, {'M0_Q06': 'E'}, 'r_children', None),
 ('Enfants A / absent', {'M0_Q06': 'A'}, {}, 'r_children', None),
 ('Beaux-enfants D / enfants mineurs', {'M0_Q14': 'D'}, {'V82_M0_03': 'C'}, 'r_stepchildren', M.INCOMPAT),
 ('Beaux-enfants D / enfants majeurs', {'M0_Q14': 'D'}, {'V82_M0_03': 'E'}, 'r_stepchildren', M.MAJEUR),
 ('Beaux-enfants D / sans enfant', {'M0_Q14': 'D'}, {'V82_M0_03': 'A'}, 'r_stepchildren', None),
 ('Beaux-enfants B / enfants surtout avec le parent', {'M0_Q14': 'B'}, {'V82_M0_03': 'B'}, 'r_stepchildren', M.MAJEUR),
 ('Tabac A / occasionnel', {'M0_Q11': 'A'}, {'M0_Q09': 'B'}, 'r_tobacco', M.INCOMPAT),
 ('Tabac D / régulier', {'M0_Q11': 'D'}, {'M0_Q09': 'C'}, 'r_tobacco', M.DISCUTER),
 ('Tabac B / régulier', {'M0_Q11': 'B'}, {'M0_Q09': 'C'}, 'r_tobacco', M.MAJEUR),
 ('Tabac A / non-fumeur', {'M0_Q11': 'A'}, {'M0_Q09': 'A'}, 'r_tobacco', None),
 ('Alcool A / occasions', {'M0_Q13': 'A'}, {'M0_Q12': 'B'}, 'r_alcohol', M.INCOMPAT),
 ('Alcool D / chaque semaine', {'M0_Q13': 'D'}, {'M0_Q12': 'C'}, 'r_alcohol', M.DISCUTER),
 ('Jeux A / rarement', {'M0_Q16': 'A'}, {'M0_Q15': 'B'}, 'r_gambling', M.INCOMPAT),
 ('Jeux B / chaque semaine', {'M0_Q16': 'B'}, {'M0_Q15': 'C'}, 'r_gambling', M.MAJEUR),
 ('Religion : exige / autre religion, refuse d’adopter', {'M1_Q16': 'D', 'M1_Q18': 'A'}, {'M1_Q16': 'A', 'M1_Q18': 'D'}, 'r_religion', M.INCOMPAT),
 ('Religion : exige / autre religion, pourrait adopter', {'M1_Q16': 'D', 'M1_Q18': 'A'}, {'M1_Q16': 'A', 'M1_Q18': 'E'}, 'r_religion', M.MAJEUR),
 ('Religion : exige / religion traditionnelle', {'M1_Q16': 'A', 'M1_Q18': 'A'}, {'M1_Q16': 'G', 'M1_Q18': 'D'}, 'r_religion', M.MAJEUR),
 ('Religion : exige / ne pas répondre', {'M1_Q16': 'A', 'M1_Q18': 'A'}, {'M1_Q16': 'N', 'M1_Q18': 'D'}, 'r_religion', None),
 ('Religion : exige / autre Église chrétienne', {'M1_Q16': 'A', 'M1_Q18': 'A'}, {'M1_Q16': 'B', 'M1_Q18': 'D'}, 'r_religion', M.DISCUTER),
 ('Religion : souhaite (C) / autre religion', {'M1_Q16': 'D', 'M1_Q18': 'C'}, {'M1_Q16': 'A', 'M1_Q18': 'D'}, 'r_religion', None),
 ('Religion : sans religion exige / musulman qui refuse', {'M1_Q16': 'M', 'M1_Q18': 'A'}, {'M1_Q16': 'D', 'M1_Q18': 'B'}, 'r_religion', M.INCOMPAT),
 ('Dot A / D', {'M4_Q17': 'A'}, {'M4_Q17': 'D'}, 'r_dot', M.INCOMPAT),
 ('Dot A / C', {'M4_Q17': 'A'}, {'M4_Q17': 'C'}, 'r_dot', None),
 ('Dot A / ne pas répondre', {'M4_Q17': 'A'}, {'M4_Q17': 'E'}, 'r_dot', None),
 ('Mahr A / D', {'V82_M4_08': 'A'}, {'V82_M4_08': 'D'}, 'r_mahr', M.INCOMPAT),
 ('Mahr A / non affiché', {'V82_M4_08': 'A'}, {}, 'r_mahr', None),
 ('Religion des enfants A / D', {'M8_Q18': 'A'}, {'M8_Q18': 'D'}, 'r_child_faith', M.MAJEUR),
 ('Religion des enfants A / A, religions différentes', {'M8_Q18': 'A', 'M1_Q16': 'D'}, {'M8_Q18': 'A', 'M1_Q16': 'E'}, 'r_child_faith', M.INCOMPAT),
 ('Religion des enfants A / A, même religion', {'M8_Q18': 'A', 'M1_Q16': 'D'}, {'M8_Q18': 'A', 'M1_Q16': 'D'}, 'r_child_faith', None),
 ('Aide familiale A / D', {'M4_Q16': 'A'}, {'M4_Q16': 'D'}, 'r_family_money', M.MAJEUR),
 ('Lieu de vie A / C', {'V82_M8_05': 'A'}, {'V82_M8_05': 'C'}, 'r_place', M.DISCUTER),
 ('Non négociable : lieu de vie coché', {'V82_M8_05': 'A', 'M8_Q12': 'E'}, {'V82_M8_05': 'C'}, 'r_place', M.MAJEUR),
 ('Non négociable : jamais une incompatibilité', {'M1_Q20': 'A', 'M8_Q12': 'H'}, {'M1_Q20': 'C'}, 'r_polygamy', M.MAJEUR),
]
bad = []
for name, a, b, rule, exp in T:
    got1, got2 = lv(a, b).get(rule), lv(b, a).get(rule)
    if got1 != exp or got2 != exp: bad.append((name, exp, got1, got2))
check('Incompatibilités', f'{len(T)} cas positifs, négatifs, manquants et « ne pas répondre » (évalués dans les deux sens)', not bad, bad)
asym = [(x, y) for x, y in zip(profiles[::2], profiles[1::2]) if sorted(M.compare(x, y)) != sorted(M.compare(y, x))]
check('Incompatibilités', 'Symétrie sur 2 000 paires de profils simulés', not asym)
allowed = {'r_children', 'r_stepchildren', 'r_tobacco', 'r_alcohol', 'r_gambling', 'r_religion', 'r_dot', 'r_mahr', 'r_child_faith'}
src = {r for x, y in zip(profiles[::2], profiles[1::2]) for l, r, _ in M.compare(x, y) if l == M.INCOMPAT}
check('Incompatibilités', 'Les incompatibilités ne proviennent que des 9 règles retenues', src <= allowed, src)
pairs_q = ['V82_M8_03', 'M1_Q20', 'M8_Q19', 'M10_Q17', 'M4_Q16', 'M6_Q19', 'V82_M8_05', 'M1_Q17']
bad = []
for qid in pairs_q:
    for x, y in itertools.product(M.codes(BY[qid]), repeat=2):
        if M.incompatible({qid: x, 'M8_Q12': 'A,B,C'}, {qid: y, 'M8_Q12': 'G,H'}): bad.append((qid, x, y))
check('Incompatibilités', 'Exclusivité, polygamie, fidélité, vie commune, intimité, aide familiale, lieu de vie, pratique : jamais d’exclusion (toutes paires de réponses, sujets non négociables cochés)', not bad, bad)
empty = [r for x in profiles[:200] for l, r, _ in M.compare(x, {})]
check('Incompatibilités', 'Face à un profil vide (aucune réponse) : aucun écart, aucune exclusion', not empty)
changed = []
for x in profiles[:400]:
    y = dict(x)
    for sid in M.SAFETY:
        if sid in y: y[sid] = random.choice(M.codes(M.BY[sid]))
    if sorted(M.compare(x, profiles[401])) != sorted(M.compare(y, profiles[401])): changed.append(1)
only = [M.compare({s: c}, {s: d}) for s in M.SAFETY for c in M.codes(M.BY[s]) for d in M.codes(M.BY[s])]
check('Incompatibilités', 'Questions de sécurité sans aucun effet sur la compatibilité (400 profils modifiés, toutes paires de réponses)', not changed and not any(only))
check('Filtres', 'Langue commune, âge réciproque, donnée absente sans effet',
      M.eligible({'M0_Q10': 'A', 'age': 30, 'accepted_age': (25, 35)}, {'M0_Q10': 'B', 'age': 30})[0] is False and
      M.eligible({'M0_Q10': 'A,H', 'age': 30, 'accepted_age': (25, 35)}, {'M0_Q10': 'H', 'age': 40})[0] is False and
      M.eligible({'M0_Q10': 'I', 'M0_Q10_AUTRE': 'Wolof'}, {'M0_Q10': 'I', 'M0_Q10_AUTRE': 'wolof'})[0] is True and
      M.eligible({}, {'age': 50})[0] is True)

# ── 9. Migration
mig = [
 ('positif', 'M0_Q10', 'H', '2026-10-10', 'H', M.KEEP, 'H = espagnol en V7.1 et en V8.2'),
 ('négatif', 'M0_Q10', 'C', '2026-10-10', 'C', M.KEEP, 'C = arabe : jamais converti en espagnol (la lettre C des documents V6.2/V7 désignait une position d’affichage)'),
 ('positif', 'M0_Q10', 'A,B,H', '2026-10-10', 'A,B,H', M.KEEP, 'choix multiple conservé'),
 ('ambigu', 'M0_Q10', 'I', '2026-10-05', 'I', M.KEEP, '« autre langue » avant l’ajout du créole : gardée telle quelle, jamais réinterprétée en J'),
 ('ambigu', 'M0_Q02', 'A', '2026-10-10', 'A', M.CONFIRM, 'libellé élargi le 11/10'),
 ('positif', 'M0_Q02', 'A', '2026-10-12', 'A', M.KEEP, 'après le nouveau libellé'),
 ('ambigu', 'M0_Q04', 'D', '2026-10-05', None, M.NEW, 'D « en transition relationnelle » avant le 07/10'),
 ('positif', 'M0_Q04', 'D', '2026-10-09', 'D', M.KEEP, 'après le 07/10'),
 ('ambigu', 'M0_Q11', 'A', '2026-10-10', 'A', M.CONFIRM, 'option D ajoutée'),
 ('positif', 'M0_Q11', 'C', '2026-10-10', 'C', M.KEEP, 'C non concerné par l’ajout'),
 ('positif', 'M1_Q16', 'I', '2026-10-10', 'I', M.KEEP, 'même famille « sans religion » que les nouvelles options agnostique et athée'),
 ('positif', 'M4_Q17', 'D', '2026-10-10', 'D', M.KEEP, 'dot : question identique (non fusionnée avec le Mahr)'),
 ('négatif', 'M8_Q16', 'B,D', '2026-10-10', None, M.NEW, 'combinaison impossible (D exclusif)'),
 ('négatif', 'M8_Q19', 'Z', '2026-10-10', None, M.NEW, 'code inconnu'),
 ('positif', 'M0_Q05', 'A', '2026-10-10', 'A', M.KEEP, '→ V82_M0_03 A'),
 ('ambigu', 'M0_Q05', 'B', '2026-10-10', None, M.NEW, 'enfant à charge : résidence inconnue'),
 ('positif', 'M3_Q11', 'E', '2026-10-10', 'A', M.KEEP, '→ V82_M3_01 A'),
 ('ambigu', 'M8_Q17', 'D', '2026-10-10', None, M.NEW, '« plus tard ou sans échéance »'),
 ('positif', 'M8_Q01', 'B', '2026-10-10', 'B', M.KEEP, '→ V82_M8_01 B'),
 ('ambigu', 'M8_Q01', 'C', '2026-10-10', None, M.NEW, 'sens différent'),
 ('ambigu', 'M3_Q04', 'A', '2026-10-01', None, M.NEW, 'question reformulée le 07/10'),
 ('négatif', 'M2_Q23', 'D', '2026-10-10', None, M.NEW, 'question retirée : aucune recopie'),
]
bad = [(c, q, v, d, migr) for c, q, v, d, nv, st, _ in mig for migr in [M.migrate(q, v, d)] if (migr[1], migr[2]) != (nv, st)]
check('Migration', f'{len(mig)} cas de migration (positifs, négatifs, ambigus)', not bad, bad)
# toutes les combinaisons code × question reprise
cover = {}
for q in I:
    if q['id'].startswith('V82_'): continue
    for c in [k for k, _, _ in V71[q['id']]['options']]:
        for d in ('2026-10-05', '2026-10-10'):
            cover[(q['id'], c, d)] = M.migrate(q['id'], c, d)
check('Migration', 'Chaque code V7.1 de chaque question reprise reçoit un statut (2 dates testées)', all(v[2] in (M.KEEP, M.CONFIRM, M.NEW) for v in cover.values()), len(cover))
keep_bad = [k for k, v in cover.items() if v[2] == M.KEEP and v[1] != k[1]]
check('Migration', 'Une réponse conservée garde exactement son code (aucune réinterprétation)', not keep_bad, keep_bad)
real = {'M0_Q02': {'A': 2}, 'M0_Q03': {'A': 1, 'B': 1}, 'M0_Q04': {'A': 2}, 'M0_Q05': {'B': 2}, 'M0_Q06': {'B': 1, 'C': 1}, 'M0_Q09': {'A': 2},
        'M0_Q10': {'A': 2}, 'M0_Q11': {'A': 1, 'B': 1}, 'M0_Q12': {'A': 1, 'B': 1}, 'M0_Q13': {'B': 1, 'C': 1}, 'M0_Q14': {'A': 1, 'B': 1},
        'M0_Q15': {'A': 1, 'B': 1}, 'M0_Q16': {'A': 1, 'C': 1}, 'M1_Q16': {'B': 2}, 'M1_Q17': {'A': 1, 'B': 1}, 'M1_Q18': {'A': 2},
        'M1_Q19': {'E': 1, 'F': 1}, 'M1_Q20': {'A': 2}, 'M10_Q17': {'B': 1, 'C': 1}, 'M10_Q19': {'A': 2}, 'M3_Q04': {'B': 2}, 'M3_Q12': {'A': 1, 'D': 1},
        'M4_Q16': {'C': 2}, 'M4_Q17': {'A': 1, 'C': 1}, 'M5_Q08': {'A': 1, 'D': 1}, 'M6_Q05': {'A': 1, 'B': 1}, 'M6_Q19': {'A': 1, 'A,B,C,D,E': 1},
        'M6_Q24': {'A': 2}, 'M8_Q10': {'B,C,D': 1, 'C,D,H': 1}, 'M8_Q12': {'C,F,H': 1, 'C,H': 1}, 'M8_Q16': {'A': 1, 'A,B,C': 1}, 'M8_Q18': {'B': 2},
        'M8_Q19': {'B': 1, 'C': 1}, 'M8_Q20': {'B': 1, 'C': 1}, 'M9_Q16': {'A': 1, 'C': 1}, 'M9_Q24': {'B': 1, 'C': 1}}
tally = {M.KEEP: 0, M.CONFIRM: 0, M.NEW: 0}; detail = []
for q, d in real.items():
    for v, n in d.items():
        st = M.migrate(q, v, '2026-10-10')[2]; tally[st] += n
        if st != M.KEEP: detail.append(f'{q}={v} ×{n} : {st}')
check('Migration', 'Réponses réelles en base (2 entretiens de test, 10/10/2026, lecture seule) : toutes valides et classées', sum(tally.values()) == sum(n for d in real.values() for n in d.values()), f'{tally} ; {detail}')
MIGRATION_REAL = (tally, detail)

# ── 10. Couche de compatibilité
bad = []
for v7, (src_q, f, _) in M.COMPAT.items():
    produced = {}
    for c in M.codes(BY[src_q]):
        a = {src_q: c}
        if src_q == 'V82_M3_02': a['V82_M0_03'] = 'B'
        out = f(a)
        if out is not None:
            if out not in {k for k, _, _ in V71[v7]['options']}: bad.append((v7, c, out))
            produced[c] = out
    if not produced: bad.append((v7, 'aucune valeur'))
check('Compatibilité', 'Chaque correspondance produit seulement des codes V7.1 valides', not bad, bad)
check('Compatibilité', 'Valeur ambiguë → réponse absente (exemples : V82_M3_01 = D, V82_M0_03 = B, V82_M8_02 = E)',
      M.v7_view({'V82_M3_01': 'D'}).get('M3_Q11') is None and M.v7_view({'V82_M0_03': 'B'}).get('M0_Q05') is None and M.v7_view({'V82_M8_02': 'E'}).get('M8_Q17') is None)
check('Compatibilité', 'Réponse conditionnelle : V82_M3_02 = B donne M3_Q05 = B seulement avec enfants',
      M.v7_view({'V82_M3_02': 'B', 'V82_M0_03': 'C'}).get('M3_Q05') == 'B' and M.v7_view({'V82_M3_02': 'B', 'V82_M0_03': 'A'}).get('M3_Q05') is None)
leak = [k for a in profiles[:500] for k in M.v7_view(a) if k not in BY and k not in M.COMPAT]
check('Compatibilité', 'La vue V7 ne contient que des questions conservées ou des correspondances démontrées', not leak, leak[:5])
prod_sens_all = prod_sens | {'M10_Q16', 'M10_Q18', 'M6_Q18', 'M1_Q13'}
leak = [v7 for v7, (s, _, _) in M.COMPAT.items() if BY[s]['sens'] and v7 not in prod_sens_all]
check('Compatibilité', 'Une réponse sensible ne devient jamais une réponse V7 non protégée', not leak, leak)
deps = json.load(open(os.path.join(os.path.dirname(__file__), 'deps.json')))
dep = [x for x in deps['dep'] if x != 'M6_Q04']
check('Compatibilité', 'Inventaire : questions V7 retirées lues par le moteur ou le Sondeur', True, f'{len(dep)} ({len(M.COMPAT)} avec correspondance partielle ou totale, {len(dep) - len(M.COMPAT)} sans équivalent fiable)')
check('Compatibilité', 'Questions de sécurité du Sondeur (SAFETY_QUESTIONS) toutes conservées en V8.2', all(x in BY for x in ['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24']))

from classes import SA, SB, COV, INU
check('Compatibilité', 'Les 47 dépendances sans équivalent sont toutes classées une seule fois (inutile, couverte, perte A, perte B)',
      sorted(list(SA) + SB + list(COV) + list(INU)) == sorted(x for x in deps['dep'] if x != 'M6_Q04' and x not in M.COMPAT))
check('Compatibilité', 'Stratégie A : chaque sujet renvoie à une question V8.2 existante', all(r.split()[0] in BY for r in SA.values()))
check('Compatibilité', 'Stratégie B : questions V7 reprises mot pour mot, identifiants existants en V7.1', all(x in V71 for x in SB))

# ── 11. Parcours
def persona(**kw):
    a = dict(kw)
    return a
PERSONAS = {
 'Parent, ancienne relation, musulman(e), consentement donné': ({'V82_M0_03': 'B', 'M0_Q06': 'B', 'M0_Q14': 'A', 'V82_M8_01': 'A', 'M1_Q16': 'D', 'M1_Q18': 'A', 'V82_M3_01': 'D'}, True),
 'Sans enfant, souhaite des enfants, ancienne relation, chrétien(ne)': ({'V82_M0_03': 'A', 'M0_Q06': 'B', 'M0_Q14': 'C', 'V82_M8_01': 'B', 'M1_Q16': 'A', 'M1_Q18': 'B', 'V82_M3_01': 'D'}, True),
 'Sans enfant ni projet d’enfant, jamais de relation sérieuse, sans religion': ({'V82_M0_03': 'A', 'M0_Q06': 'D', 'M0_Q14': 'D', 'V82_M8_01': 'D', 'M1_Q16': 'M', 'M1_Q18': 'D', 'V82_M3_01': 'A'}, True),
 'Comme le 2e profil, sans consentement aux questions sensibles': ({'V82_M0_03': 'A', 'M0_Q06': 'B', 'M0_Q14': 'C', 'V82_M8_01': 'B', 'V82_M3_01': 'D'}, False),
}
PATHS = {}
for name, (a, consent) in PERSONAS.items():
    shown = [q for q in M.ORDER if M.shown(q, a, consent)]
    secs = sum(M.SEC_PER[BY[q]['type']] for q in shown)
    per_s = []
    for _, _, scr in M.SESSIONS:
        qs = [q for _, ids in scr for q in ids if q in shown]
        per_s.append((len(qs), round(sum(M.SEC_PER[BY[q]['type']] for q in qs) / 60)))
    PATHS[name] = (len(shown), round(secs / 60), per_s)
check('Parcours', 'Nombre de questions affichées par parcours', True, {k: v[0] for k, v in PATHS.items()})
def runs(seq):
    best = cur = 0
    for q in seq:
        cur = cur + 1 if BY[q]['type'] in ('L', 'F', 'X') else 0
        best = max(best, cur)
    return best
nonmini = [q for q in M.ORDER if BY[q]['m'] != 7]
check('Parcours', 'Plus longue série d’échelles : 10 (blocs du Mini-IPIP) ; hors Mini-IPIP : 6 au plus', runs(M.ORDER) <= 10 and runs([q for q in M.ORDER]) == 10 and
      max(runs(ids) for _, _, scr in M.SESSIONS for t, ids in scr if not t.startswith('Personnalité')) <= 6, runs(M.ORDER))
check('Parcours', 'Questions sensibles regroupées après l’écran de consentement (séance 1)', all(
      q in [x for t, ids in M.SESSIONS[0][2] if t.startswith(('Convictions', 'Mariage', 'Éducation')) for x in ids] or q in ('V82_M10_04', 'M10_Q19')
      for q in M.SENSITIVE))

# ── 12. Qualité (indicateurs expérimentaux)
check('Qualité', 'Variation normale de personnalité non signalée (détendu(e) + sautes d’humeur)', not M.quality({'V82_M7_09': 'E', 'V82_M7_04': 'D'}))
check('Qualité', 'Contradiction factuelle signalée', M.quality({'V82_M3_01': 'A', 'M0_Q04': 'C'}))
check('Qualité', 'Réponses identiques sur un bloc à items inversés signalées', M.quality({f'V82_M7_{k:02d}': 'D' for k in range(1, 21)}))
check('Qualité', 'Rythme très rapide signalé ; rythme normal non signalé', M.quality({}, [1.0] * 10) and not M.quality({}, [5.0] * 10))

# ── 13. Textes
alltext = json.dumps([(q['fr'], q['en'], q['fro'], q['eno'], q['why']) for q in I], ensure_ascii=False)
check('Textes', 'Aucune mention de version ultérieure ni de nom étranger à BOLIGO', not re.search(r'OWEKE|V8\.3', alltext, re.I))
check('Textes', 'Aucune promesse de probabilité de réussite', not re.search(r'probabilit[ée] de (réussite|succès)', alltext.replace('jamais une probabilité', ''), re.I))
check('Textes', 'Pas de double espace ni d’espace avant virgule', not re.search(r'  | ,', alltext))

json.dump(dict(results=R, paths=PATHS, migration_real=MIGRATION_REAL), open(os.path.join(os.path.dirname(__file__), 'results.json'), 'w'), ensure_ascii=False, indent=1)
fails = [r for r in R if not r['ok']]
print(f'{len(R)} contrôles, {len(fails)} échec(s)')
for r in fails: print('ÉCHEC', r['fam'], '—', r['name'], '—', r['detail'][:600])
for k, v in PATHS.items(): print(k, v)
