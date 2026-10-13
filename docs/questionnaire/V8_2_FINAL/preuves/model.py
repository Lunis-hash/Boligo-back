# Modèle final du Grand Entretien V8.2 : questions, codes, conditions,
# contraintes des choix multiples, règles de compatibilité, migration V7,
# couche de compatibilité du Sondeur, indicateurs de qualité, parcours.
# Source unique des quatre documents et de la recette documentaire.
import re, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import items_base as B

PNR_FR, PNR_EN = B.PNR_FR, B.PNR_EN
ITEMS = B.ITEMS
BY = {i['id']: i for i in ITEMS}

# ───────────── Codes des réponses ─────────────
SCALES = {
    'L': (['Pas du tout d’accord', 'Plutôt pas d’accord', 'Ni d’accord ni pas d’accord', 'Plutôt d’accord', 'Tout à fait d’accord'],
          ['Strongly disagree', 'Somewhat disagree', 'Neither agree nor disagree', 'Somewhat agree', 'Strongly agree']),
    'F': (['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Très souvent'],
          ['Never', 'Rarely', 'Sometimes', 'Often', 'Very often']),
    # Échelle d'exactitude du Mini-IPIP (Donnellan et al., 2006 ; IPIP)
    'X': (['Très inexact', 'Plutôt inexact', 'Ni exact ni inexact', 'Plutôt exact', 'Très exact'],
          ['Very inaccurate', 'Moderately inaccurate', 'Neither accurate nor inaccurate', 'Moderately accurate', 'Very accurate']),
}
NA_FR, NA_EN = 'Non applicable', 'Not applicable'

def strip(o):
    return re.sub(r'^[A-Z]\. ', '', o)

def options(q):
    """Liste (code, texte FR, texte EN) ; les codes sont ceux enregistrés."""
    if q['type'] in SCALES:
        fr, en = SCALES[q['type']]
        out = [(chr(65 + k), fr[k], en[k]) for k in range(5)]
        if q['type'] == 'F' and q['id'] in NA_ITEMS:
            out.append(('NA', NA_FR, NA_EN))
        return out
    if q['type'] == 'N':
        return []
    out = []
    for k, (f, e) in enumerate(zip(q['fro'], q['eno'])):
        m = re.match(r'^([A-Z])\. ', f)
        code = m.group(1) if m else chr(65 + k)
        out.append((code, strip(f), strip(e)))
    return out

def codes(q):
    return [c for c, _, _ in options(q)]

def pnr_code(q):
    for c, f, _ in options(q):
        if f == PNR_FR:
            return c
    return None

# « Non applicable » proposé (comportements qui supposent une relation ou un conflit vécus)
NA_ITEMS = {i['id'] for i in ITEMS if i['type'] == 'F'}

# ───────────── Choix multiples : bornes et exclusivités ─────────────
MULTI = {
    'M0_Q10':    dict(max=None, exclusive=[], note='Au moins une langue ; « Une autre langue » (I) exige une précision écrite.'),
    'V82_M0_03': dict(max=None, exclusive=['A'], note='« Je n’ai pas d’enfant » (A) exclut toute autre réponse ; B à E peuvent se combiner (enfants dans des situations différentes).'),
    'V82_M1_01': dict(max=2, exclusive=['B'], note='Deux références au plus ; « Je préfère ne pas répondre » (B) exclut toute saisie.'),
    'M8_Q16':    dict(max=None, exclusive=['D'], note='« Aucune cérémonie n’est indispensable » (D) exclut A, B et C.'),
    'M6_Q19':    dict(max=None, exclusive=['G'], note='« Aucun de ceux-là » (G) exclut A à F.'),
    'M8_Q10':    dict(max=3, exclusive=[], note='Trois signaux au plus (règle en service).'),
    'M8_Q12':    dict(max=3, exclusive=['K'], note='Trois sujets au plus (règle en service) ; « Aucun : tout se discute » (K) exclut les autres.'),
}

def valid_answer(qid, value):
    """Contrôle d'une réponse brute (chaîne « A » ou « A,B »). Renvoie (ok, motif)."""
    q = BY[qid]
    if value is None or value == '':
        return True, 'absente'
    if q['type'] == 'N':
        return True, 'numérique'
    keys = value.split(',')
    allowed = codes(q)
    if any(k not in allowed for k in keys):
        return False, 'code inconnu'
    if len(set(keys)) != len(keys):
        return False, 'doublon'
    if q['type'] != 'M':
        return (len(keys) == 1, 'une seule réponse attendue' if len(keys) != 1 else 'ok')
    rule = MULTI[qid]
    if rule['max'] and len(keys) > rule['max']:
        return False, f'plus de {rule["max"]} choix'
    pnr = pnr_code(q)
    for x in rule['exclusive'] + ([pnr] if pnr else []):
        if x in keys and len(keys) > 1:
            return False, f'option exclusive {x} combinée'
    if keys != sorted(keys, key=allowed.index):
        return False, 'ordre non canonique'
    return True, 'ok'

# ───────────── Sensibilité (article 9 du RGPD) ─────────────
# Aligné sur la table en service (SENSITIVE_QUESTIONS) pour les questions reprises.
SENSITIVE = {
    'V82_M1_01': 'origine', 'M1_Q16': 'religion', 'V82_M1_02': 'religion', 'M1_Q17': 'religion',
    'M1_Q18': 'religion', 'M1_Q19': 'religion', 'M1_Q20': 'religion (indirect)', 'M8_Q18': 'religion',
    'V82_M4_08': 'religion', 'V82_M8_03': 'vie sexuelle', 'M6_Q19': 'vie sexuelle',
    'V82_M10_04': 'vie sexuelle', 'M10_Q17': 'vie sexuelle', 'M10_Q19': 'vie sexuelle',
}
for i in ITEMS:
    i['sens'] = i['id'] in SENSITIVE

# ───────────── Conditions d'affichage (exécutables) ─────────────
def has(a, qid, *vals):
    v = a.get(qid)
    return bool(v) and any(x in v.split(',') for x in vals)

def minor_children(a):
    return has(a, 'V82_M0_03', 'B', 'C', 'D')

def any_children(a):
    return has(a, 'V82_M0_03', 'B', 'C', 'D', 'E')

def children_related(a):
    return minor_children(a) or has(a, 'M0_Q06', 'A', 'B', 'C')

COND = {
    'M1_Q17':    (lambda a: bool(a.get('M1_Q16')) and not has(a, 'M1_Q16', 'I', 'L', 'M', 'N'),
                  'Si M1_Q16 est renseignée et n’est ni « sans religion », ni « agnostique », ni « athée », ni « je préfère ne pas répondre »',
                  'If M1_Q16 is answered and is not “no religion”, “agnostic”, “atheist” or “prefer not to answer”'),
    'V82_M4_08': (lambda a: has(a, 'M1_Q16', 'D') or has(a, 'M1_Q18', 'C', 'D', 'E'),
                  'Si M1_Q16 = Musulmane, ou si M1_Q18 = C, D ou E (ouverture à un(e) partenaire d’une autre conviction)',
                  'If M1_Q16 = Muslim, or if M1_Q18 = C, D or E (open to a partner with other beliefs)'),
    'M3_Q04':    (lambda a: any_children(a) or has(a, 'M0_Q14', 'A', 'B', 'C'),
                  'Si le membre a des enfants (V82_M0_03 ≠ A) ou n’exclut pas un(e) partenaire avec enfants (M0_Q14 ≠ D)',
                  'If the member has children (V82_M0_03 ≠ A) or does not rule out a partner with children (M0_Q14 ≠ D)'),
    'V82_M3_02': (lambda a: has(a, 'V82_M3_01', 'B', 'C', 'D'),
                  'Si V82_M3_01 = B, C ou D (une relation sérieuse a existé)',
                  'If V82_M3_01 = B, C or D (a serious relationship has existed)'),
    'V82_M8_02': (lambda a: has(a, 'V82_M8_01', 'A', 'B', 'C'),
                  'Si V82_M8_01 = A, B ou C', 'If V82_M8_01 = A, B or C'),
    'V82_M8_04': (children_related,
                  'Si enfants mineurs (V82_M0_03 = B, C ou D) ou projet d’enfant (M0_Q06 = A, B ou C)',
                  'If minor children (V82_M0_03 = B, C or D) or a wish for children (M0_Q06 = A, B or C)'),
    'M8_Q18':    (children_related, 'Même condition que V82_M8_04', 'Same condition as V82_M8_04'),
    'M8_Q20':    (children_related, 'Même condition que V82_M8_04', 'Same condition as V82_M8_04'),
    'V82_M9_06': (lambda a: not has(a, 'V82_M3_01', 'A'),
                  'Sauf si V82_M3_01 = A (aucune relation sérieuse) ; « Non applicable » proposé',
                  'Unless V82_M3_01 = A (no serious relationship); “Not applicable” offered'),
    'V82_M9_07': (lambda a: not has(a, 'V82_M3_01', 'A'), 'Même condition que V82_M9_06', 'Same condition as V82_M9_06'),
}
for i in ITEMS:
    c = COND.get(i['id'])
    i['cond'] = c[1] if c else 'Tous'
    i['cond_en'] = c[2] if c else 'All'

def shown(qid, a, consent=True):
    if BY[qid]['sens'] and not consent:
        return False
    c = COND.get(qid)
    return c[0](a) if c else True

# Ordre d'évaluation : une condition ne dépend que de questions posées avant elle (vérifié par la recette).

# ───────────── Facultatives ─────────────
OPTIONAL = {i['id'] for i in ITEMS if i['opt']} | set(SENSITIVE)
for i in ITEMS:
    i['opt'] = i['id'] in OPTIONAL

# ───────────── Justifications corrigées (règles B et G) ─────────────
WHY = {
 'M0_Q06': 'Premier projet de vie à comparer. Seule la paire « Oui, absolument » / « Non, c’est définitif » est une incompatibilité déclarée (deux positions fermes et opposées) ; les autres écarts se discutent.',
 'M0_Q14': 'Se compare à la situation réelle de l’autre (V82_M0_03). « Je ne pourrais pas l’accepter » face à des enfants mineurs = incompatibilité déclarée ; face à des enfants majeurs seulement = écart majeur à discuter.',
 'M1_Q20': 'Question conservée, facultative et sensible. Aucune option n’exprime une exigence de polygamie : « Envisageable si chacun y consent » est une ouverture, pas une demande. L’écart « Exclue sans discussion » / « Envisageable » est donc un écart majeur à aborder en priorité, jamais une exclusion automatique.',
 'V82_M8_03': 'Cadre d’exclusivité. « Ouvert(e) à d’autres formes » n’est pas un refus de l’exclusivité : face à « exclusivité réciproque », c’est un écart majeur à discuter, pas une incompatibilité.',
 'M8_Q19': 'Préférer vivre ensemble avant le mariage (« souhaitable ») n’est pas l’exiger : face à « exclu pour moi », écart majeur à discuter, jamais une exclusion.',
 'M10_Q17': '« J’attends le mariage » face à « possible sans engagement officiel » : écart majeur, car « possible » n’est pas une exigence.',
 'M8_Q18': 'Deux exigences opposées (chacun « dans ma religion, c’est indispensable », avec deux religions différentes) = incompatibilité déclarée. « Indispensable » face à « sans éducation religieuse » = écart majeur : la seconde réponse est une intention, pas un refus explicite.',
 'M8_Q20': 'Lue sous l’angle de la protection de l’enfant et du droit, pas comme une préférence : en France, l’article 371-1 du Code civil (loi du 10 juillet 2019) exclut les violences physiques dans l’exercice de l’autorité parentale ; de nombreux pays ont la même règle. Jamais dans un score de compatibilité ni dans une exclusion ; les réponses A et B déclenchent une information neutre et privée sur la loi du pays de résidence ; un écart A/B face à D est un point de vigilance traité comme un sujet de sécurité par le Sondeur (questions de limite, jamais de compromis).',
 'M4_Q16': 'Solidarité familiale. « Devoir non discutable » face à « l’argent du foyer ne doit pas servir à la famille élargie » = écart majeur à discuter (des solutions existent : budget personnel, montant décidé à deux), jamais une exclusion.',
 'M6_Q24': 'Conservée : un accord (D, E) n’est pas une réponse évidente, il signale une attitude qui justifie la gifle, facteur de risque reconnu. Utilisée uniquement par le dispositif de sécurité existant (questions de limite du Sondeur, information sur l’aide disponible, modération). Jamais un score, jamais une exclusion automatique, jamais affichée à l’autre, jamais une étiquette (« violent », « dangereux »).',
 'M9_Q24': 'Insister jusqu’à ce que l’autre cède : non-respect d’un refus, composante du contrôle coercitif (Stark, 2007), qui se définit par un schéma répété, pas par une réponse. Utilisée par le dispositif de sécurité seulement ; jamais un diagnostic ni une étiquette.',
 'M4_Q17': 'Question V7 reprise telle quelle (réponses conservées), avec « Je préfère ne pas répondre » ajouté. « Indispensable » face à « Je n’y adhère pas, même si mon/ma partenaire y tient » = incompatibilité déclarée (exigence et refus explicites). La dot, coutume familiale, est désormais séparée du Mahr (V82_M4_08).',
 'V82_M4_08': 'Le Mahr est une obligation du contrat de mariage musulman, due à l’épouse ; la dot est une coutume due à la famille. Les fusionner rendait les anciennes réponses inutilisables (on peut refuser la dot et tenir au Mahr). Conditionnelle (personnes musulmanes ou ouvertes à un couple interreligieux) pour ne pas allonger l’entretien des autres. « Indispensable » face à « Je n’y adhère pas, même si… » = incompatibilité déclarée.',
 'M8_Q12': 'Ne crée jamais seule une exclusion : un sujet coché rend l’écart sur ce thème plus prioritaire (écart à discuter → écart majeur).',
 'M0_Q11': 'Tolérance au tabac. Seule « Je ne pourrais pas vivre avec » face à un tabagisme déclaré est une incompatibilité ; « acceptable s’il reste occasionnel » face à un usage régulier est un écart majeur ; « jamais à la maison » se discute.',
 'M0_Q13': 'Même logique que le tabac : seule « même occasionnel, non » face à une consommation déclarée est une incompatibilité.',
 'M0_Q16': 'Même logique : seule « même rarement, non » face à une pratique déclarée est une incompatibilité.',
 'M1_Q18': 'Exigence de convictions partagées (A, B). Incompatibilité seulement si l’autre a une religion d’une autre famille ET déclare ne pas pouvoir adopter celle du premier (M1_Q18 = A, B ou D) ; sinon écart majeur.',
 'M6_Q05': 'Limite déclarée sur les insultes, lue avec la question de sécurité M6_Q04. Comparée au comportement de l’autre (V82_M6_03) comme écart à discuter, jamais comme exclusion.',
 'V82_M8_05': 'Projets de lieu de vie à long terme. Être ouvert à un départ n’est pas l’exiger : écart à discuter ; seul le périmètre (M0_Q02) filtre.',
}
for k, v in WHY.items():
    BY[k]['why'] = v
BY['M9_Q16']['why'] = 'Bouderie et froideur : forme passive de pression, distincte du besoin de pause (V82_M6_06). Jamais une étiquette.'

# ───────────── Règles de compatibilité ─────────────
INCOMPAT, MAJEUR, DISCUTER = 'incompatibilité déclarée', 'écart majeur', 'écart à discuter'
RANK = {None: 0, DISCUTER: 1, MAJEUR: 2, INCOMPAT: 3}

FAMILY = {'A': 'chrétienne', 'B': 'chrétienne', 'C': 'chrétienne', 'D': 'musulmane', 'E': 'juive', 'F': 'bouddhiste',
          'K': 'hindoue', 'G': 'traditionnelle', 'H': 'spiritualité', 'I': 'sans religion', 'L': 'sans religion',
          'M': 'sans religion', 'J': None, 'N': None}
# Familles assez définies pour fonder une incompatibilité (la religion traditionnelle se vit souvent avec
# une autre, la « spiritualité personnelle » et « une autre religion » restent trop imprécises).
HARD_FAMILIES = {'chrétienne', 'musulmane', 'juive', 'bouddhiste', 'hindoue', 'sans religion'}

def fam(a):
    v = a.get('M1_Q16')
    return FAMILY.get(v) if v else None

def one(a, q):
    v = a.get(q)
    if not v or v == pnr_code(BY[q]):
        return None
    return v

# Chaque règle : fonction (x, y) orientée, évaluée dans les deux sens ; renvoie (niveau, motif) ou None.
def r_children(x, y):
    p = {one(x, 'M0_Q06'), one(y, 'M0_Q06')}
    if None in p: return None
    if p == {'A', 'D'}: return INCOMPAT, 'enfants : « Oui, absolument » / « Non, c’est définitif »'
    if p == {'B', 'D'}: return MAJEUR, 'enfants : « Oui, si les conditions sont réunies » / « Non, c’est définitif »'
    if len(p) == 2 and p != {'A', 'B'}: return DISCUTER, 'projet d’enfant différent'
    return None

def r_stepchildren(x, y):
    t = one(x, 'M0_Q14'); kids = y.get('V82_M0_03')
    if not t or not kids: return None
    if t == 'D' and minor_children(y): return INCOMPAT, 'partenaire avec enfants mineurs « impossible à accepter »'
    if t == 'D' and has(y, 'V82_M0_03', 'E'): return MAJEUR, 'enfants majeurs face à « je ne pourrais pas l’accepter »'
    if t == 'B' and has(y, 'V82_M0_03', 'B'): return MAJEUR, 'enfants vivant surtout avec le parent face à « pas à plein temps »'
    if t == 'C' and minor_children(y): return DISCUTER, 'préférerait éviter un(e) partenaire avec enfants'
    return None

def habit(tol, beh, hard_beh, major_tol, major_beh, flex, label):
    def r(x, y):
        t, b = one(x, tol), one(y, beh)
        if not t or not b: return None
        if t == 'A' and b in hard_beh: return INCOMPAT, f'{label} : « ne pourrait pas vivre avec » face à une pratique déclarée'
        if t == major_tol and b in major_beh: return MAJEUR, f'{label} : tolérance sous condition non remplie'
        if t == flex and b in hard_beh: return DISCUTER, f'{label} : tolérance sous condition (à préciser)'
        return None
    return r
r_tobacco = habit('M0_Q11', 'M0_Q09', {'B', 'C'}, 'B', {'C'}, 'D', 'tabac')
r_alcohol = habit('M0_Q13', 'M0_Q12', {'B', 'C', 'D'}, 'B', {'C', 'D'}, 'D', 'alcool')
r_gambling = habit('M0_Q16', 'M0_Q15', {'B', 'C', 'D'}, 'B', {'C', 'D'}, None, 'jeux d’argent')

def r_religion(x, y):
    req = one(x, 'M1_Q18'); fx, fy = fam(x), fam(y)
    if req not in ('A', 'B') or not fx or not fy: return None
    if fx == fy:
        if x.get('M1_Q16') != y.get('M1_Q16') and fx == 'chrétienne': return DISCUTER, 'même religion, Églises différentes'
        return None
    other = one(y, 'M1_Q18')
    if fx in HARD_FAMILIES and fy in HARD_FAMILIES and other in ('A', 'B', 'D'):
        return INCOMPAT, 'convictions partagées exigées, religions différentes, aucune conversion envisagée par l’autre'
    return MAJEUR, 'convictions partagées exigées, religions différentes (adhésion de l’autre non exclue ou inconnue)'

def r_practice(x, y):
    p = sorted(filter(None, [one(x, 'M1_Q17'), one(y, 'M1_Q17')]))
    return (DISCUTER, 'rythmes de pratique religieuse éloignés') if p == ['A', 'D'] else None

def pair_rule(q, table, label):
    def r(x, y):
        a, b = one(x, q), one(y, q)
        if not a or not b or a == b: return None
        key = ''.join(sorted(a + b))
        if key in table and table[key] is None: return None   # positions compatibles
        lvl = table.get(key)
        return (lvl, label) if lvl else (DISCUTER, label + ' (positions différentes)')
    return r
r_polygamy = pair_rule('M1_Q20', {'AC': MAJEUR}, 'polygamie')
r_exclusivity = pair_rule('V82_M8_03', {'AC': MAJEUR}, 'cadre d’exclusivité')
r_cohabit = pair_rule('M8_Q19', {'AD': MAJEUR}, 'vie commune avant le mariage')
r_intimacy = pair_rule('M10_Q17', {'AC': MAJEUR}, 'intimité avant le mariage')
r_dot = pair_rule('M4_Q17', {'AD': INCOMPAT, 'BD': MAJEUR, 'AC': None}, 'dot')
r_mahr = pair_rule('V82_M4_08', {'AD': INCOMPAT, 'BD': MAJEUR, 'AC': None}, 'Mahr')
r_family_money = pair_rule('M4_Q16', {'AD': MAJEUR}, 'aide financière à la famille')

def r_child_faith(x, y):
    a, b = one(x, 'M8_Q18'), one(y, 'M8_Q18')
    if not a or not b: return None
    fx, fy = fam(x), fam(y)
    if a == b == 'A' and fx and fy and fx != fy and fx in HARD_FAMILIES and fy in HARD_FAMILIES:
        return INCOMPAT, 'chacun exige d’élever les enfants dans sa propre religion'
    if {a, b} == {'A', 'D'}: return MAJEUR, 'religion des enfants : « indispensable » / « sans éducation religieuse »'
    if a != b: return DISCUTER, 'religion des enfants : approches différentes'
    return None

def r_fidelity(x, y):
    a, b = x.get('M6_Q19'), y.get('M6_Q19')
    return (DISCUTER, 'définitions différentes de l’infidélité') if a and b and set(a.split(',')) != set(b.split(',')) else None

def r_place(x, y):
    a, b = one(x, 'V82_M8_05'), one(y, 'V82_M8_05')
    return (DISCUTER, 'projets de lieu de vie') if a and b and {a, b} == {'A', 'C'} else None

for _n in ('r_tobacco', 'r_alcohol', 'r_gambling', 'r_polygamy', 'r_exclusivity', 'r_cohabit', 'r_intimacy', 'r_dot', 'r_mahr', 'r_family_money'):
    globals()[_n].__name__ = _n

RULES = [r_children, r_stepchildren, r_tobacco, r_alcohol, r_gambling, r_religion, r_practice, r_polygamy,
         r_exclusivity, r_cohabit, r_intimacy, r_dot, r_mahr, r_child_faith, r_family_money, r_fidelity, r_place]

NON_NEG_THEME = {  # M8_Q12 → règles dont l'écart devient prioritaire
    'A': {r_children, r_stepchildren}, 'B': {r_religion, r_practice, r_child_faith, r_mahr}, 'C': {r_exclusivity, r_fidelity},
    'D': {r_family_money}, 'E': {r_place}, 'F': {r_family_money}, 'G': {r_intimacy, r_cohabit}, 'H': {r_polygamy},
    'I': {r_tobacco, r_alcohol}, 'J': set()}

def compare(a, b):
    """Évalue toutes les règles dans les deux sens. Renvoie la liste (niveau, règle, motif)."""
    out = []
    nn = set()
    for p in (a, b):
        for k in (p.get('M8_Q12') or '').split(','):
            nn |= NON_NEG_THEME.get(k, set())
    for r in RULES:
        best = None
        for x, y in ((a, b), (b, a)):
            res = r(x, y)
            if res and (best is None or (RANK[res[0]], res[1]) > (RANK[best[0]], best[1])):
                best = res
        if best:
            lvl, why = best
            if r in nn and lvl == DISCUTER:
                lvl, why = MAJEUR, why + ' (sujet déclaré non négociable)'
            out.append((lvl, r.__name__, why))
    return out

def incompatible(a, b):
    return any(l == INCOMPAT for l, _, _ in compare(a, b))

# Questions de sécurité : jamais dans compare(), jamais d'exclusion automatique.
SAFETY = ['M6_Q04', 'M6_Q05', 'M6_Q24', 'M9_Q24', 'M8_Q20', 'V82_M9_06', 'V82_M9_07', 'M9_Q16', 'M10_Q19']

# ───────────── Filtres réciproques (éligibilité) ─────────────
def eligible(a, b):
    """Âge, périmètre et langue : chacun doit entrer dans les limites de l'autre. Donnée absente = pas de filtre."""
    for x, y in ((a, b), (b, a)):
        lo, hi = x.get('accepted_age', (18, 120))
        if y.get('age') and not (lo <= y['age'] <= hi):
            return False, 'âge hors des limites acceptées'
    la, lb = a.get('M0_Q10'), b.get('M0_Q10')
    if la and lb:
        common = set(la.split(',')) & set(lb.split(',')) - {'I'}
        oth = lambda p: {s.strip().lower() for s in (p.get('M0_Q10_AUTRE') or '').split(',') if s.strip()}
        if not common and not (oth(a) & oth(b)):
            return False, 'aucune langue commune'
    return True, 'ok'

# ───────────── Migration V7 → V8.2 ─────────────
V71_DATE = '2026-10-07'   # mise en service de la V7.1 (PR #31)
V2_PERIM = '2026-10-11'   # nouveau libellé de M0_Q02 A (PR #37)
KEEP, CONFIRM, NEW = 'conservée (équivalence démontrée)', 'confirmation demandée (préremplie)', 'nouvelle réponse demandée'

def migrate(qid, old, answered_on, ctx=None):
    """Ancienne réponse V7 → (identifiant V8.2, nouvelle valeur ou None, statut, règle)."""
    ctx = ctx or {}
    before71 = answered_on < V71_DATE
    q = BY.get(qid)
    if qid in ('M0_Q01',):
        return 'V82_M0_02', None, CONFIRM, 'Plage acceptée préremplie : A ±5 ans, B −5 à 0, C 0 à +5, D ±10 ; le membre confirme (la question distingue désormais idéal et limite).'
    if qid == 'M0_Q05':
        m = {'A': 'A', 'D': 'E'}
        return ('V82_M0_03', m[old], KEEP, 'A « pas d’enfants » = A ; D « tous autonomes » = E') if old in m else ('V82_M0_03', None, NEW, 'enfants à charge : lieu de résidence inconnu')
    if qid == 'M3_Q11':
        m = {'E': 'A', 'A': 'B', 'B': 'C', 'C': 'D', 'D': 'D'}
        return ('V82_M3_01', m[old], KEEP, 'E→A, A→B, B→C, C et D→D (plus de six mois)') if old in m else ('V82_M3_01', None, NEW, 'code inconnu')
    if qid == 'M8_Q01':
        m = {'A': 'A', 'B': 'B', 'D': 'D'}
        return ('V82_M8_01', m[old], KEEP, 'A, B, D équivalents') if old in m else ('V82_M8_01', None, NEW, 'C « prendre le temps avant tout engagement » ≠ « relation sérieuse pas à pas »')
    if qid == 'M8_Q17':
        m = {'A': 'A', 'B': 'B', 'C': 'C'}
        return ('V82_M8_02', m[old], KEEP, 'A→A, B→B, C (2 à 3 ans) → C (plus de deux ans)') if old in m else ('V82_M8_02', None, NEW, 'D « plus tard ou sans échéance » : C, D ou E possibles')
    if qid == 'M4_Q01':
        m = {'A': 'A', 'B': 'B'}
        return ('V82_M4_01', m[old], KEEP, 'A→A, B→B') if old in m else ('V82_M4_01', old if old in 'CD' else None, CONFIRM if old in ('C', 'D') else NEW, 'C et D : formulations voisines, non identiques')
    if q is None or q['v7'] != qid:
        return None, None, NEW, 'question V7 sans équivalent direct (réponse gardée en lecture V7)'
    ok, why = valid_answer(qid, old)
    if not ok:
        return qid, None, NEW, f'réponse invalide ({why})'
    if qid == 'M0_Q02' and old == 'A' and answered_on < V2_PERIM:
        return qid, 'A', CONFIRM, 'A valait « même ville ou proximité » avant le 11/10/2026 ; il vaut désormais « ville et région ». En attendant, la règle en service (région) s’applique.'
    if qid in ('M0_Q04', 'M3_Q04', 'M5_Q08') and before71:
        changed = {'M0_Q04': {'D'}, 'M3_Q04': set('ABCD'), 'M5_Q08': {'B'}}[qid]
        if old in changed:
            return qid, None, NEW, 'libellé modifié le 07/10/2026 : sens non identique avant cette date'
    if qid == 'M0_Q06' and before71 and ctx.get('M0_Q05') not in (None, 'A'):
        return qid, old, CONFIRM, 'avant le 07/10/2026, la question ne précisait pas « ou d’autres enfants » ; à confirmer pour un parent'
    if qid == 'M0_Q11' and old in ('A', 'B'):
        return qid, old, CONFIRM, 'option D ajoutée (« jamais à la maison ni près des enfants ») : la réponse A ou B a pu être un choix par défaut ; tant qu’elle n’est pas confirmée, elle ne crée qu’un écart majeur, jamais une incompatibilité'
    if qid == 'M0_Q13' and old == 'B':
        return qid, old, CONFIRM, 'option D ajoutée (« avec modération, jamais d’ivresse ») voisine de B'
    return qid, old, KEEP, 'question, options, codes et type identiques' + (' ; seule l’option « je préfère ne pas répondre » ou une option voisine sans effet sur la famille de réponse a été ajoutée' if q['status'].startswith('V7 +') else '')

# ───────────── Couche de compatibilité (vue V7 dérivée des réponses V8.2) ─────────────
# Ne produit une réponse V7 que lorsque la valeur V8.2 implique sans ambiguïté la valeur V7.
# Toute autre valeur : absente. Le moteur en service ignore une règle dont une réponse manque
# (divergence.engine.ts, applyRule : « if (!ka || !kb) return »), donc absence = aucune divergence, aucune exclusion.
COMPAT = {
 'M0_Q05': ('V82_M0_03', lambda a: 'A' if a.get('V82_M0_03') == 'A' else ('D' if a.get('V82_M0_03') == 'E' else None),
            'A→A ; E seul→D ; enfants à charge : nombre inconnu → absente'),
 'M3_Q11': ('V82_M3_01', lambda a: {'A': 'E', 'B': 'A', 'C': 'B'}.get(a.get('V82_M3_01')), 'A→E, B→A, C→B ; D (plus de six mois) → absente (six mois à deux ans ou plus de deux ans)'),
 'M3_Q05': ('V82_M3_02', lambda a: 'A' if a.get('V82_M3_02') == 'A' else ('B' if a.get('V82_M3_02') == 'B' and any_children(a) else None),
            'A→A ; B→B seulement si le membre a des enfants ; autres → absente'),
 'M4_Q01': ('V82_M4_01', lambda a: {'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D'}.get(a.get('V82_M4_01')), 'A–D → A–D (inclusions vérifiées) ; E → absente'),
 'M4_Q15': ('V82_M4_05', lambda a: 'C' if a.get('V82_M4_05') == 'A' else None, 'A (selon le temps et la charge) → C (équitablement selon les disponibilités) ; autres → absente'),
 'M4_Q09': ('V82_M4_04', lambda a: {'A': 'A', 'C': 'C'}.get(a.get('V82_M4_04')), 'A→A, C→C ; B et D → absente'),
 'M5_Q01': ('V82_M5_02', lambda a: {'B': 'B', 'D': 'D'}.get(a.get('V82_M5_02')), 'B→B, D→D ; A (« accord ») ≠ « avis » → absente'),
 'M6_Q17': ('V82_M6_09', lambda a: {'A': 'A', 'D': 'C'}.get(a.get('V82_M6_09')), 'A→A ; D (continue malgré la demande) → C (insiste) ; B, C → absente'),
 'M7_Q07': ('V82_M8_05', lambda a: 'D' if a.get('V82_M8_05') == 'A' else None, 'A (ouvert) → D (ouvert selon le projet) ; autres → absente'),
 'M8_Q01': ('V82_M8_01', lambda a: {'A': 'A', 'B': 'B', 'D': 'D'}.get(a.get('V82_M8_01')), 'A, B, D → A, B, D ; C → absente'),
 'M8_Q17': ('V82_M8_02', lambda a: {'A': 'A', 'B': 'B'}.get(a.get('V82_M8_02')), 'A→A, B→B ; C, D, E → absente'),
 'M8_Q15': ('V82_M8_04', lambda a: {'A': 'B', 'B': 'C'}.get(a.get('V82_M8_04')), 'A→B, B→C ; C, D, E → absente'),
 'M9_Q01': ('V82_M9_01', lambda a: 'A' if a.get('V82_M9_01') == 'A' else None, 'A→A ; autres → absente'),
 'M10_Q16': ('V82_M10_04', lambda a: {'A': 'A', 'B': 'B', 'C': 'C'}.get(a.get('V82_M10_04')), 'A, B, C → A, B, C ; D, E → absente'),
}

def v7_view(a):
    """Réponses V7 dérivées (pour le moteur et le Sondeur en service), sans jamais inventer."""
    out = {k: a[k] for k in a if k in BY and BY[k]['v7'] == k}
    for v7, (_, f, _) in COMPAT.items():
        v = f(a)
        if v: out[v7] = v
    return out

# ───────────── Indicateurs de qualité (expérimentaux) ─────────────
QUALITY = [
 ('Contradiction factuelle', 'Combinaisons objectivement impossibles, bloquées à la saisie quand c’est possible ; sinon invitation à relire : V82_M3_01 = A (« jamais de relation sérieuse ») avec M0_Q04 = B ou C (séparé, divorcé, veuf/veuve) ; M1_Q16 = « sans religion », « agnostique » ou « athée » avec M8_Q18 = A (« dans ma religion »).'),
 ('Réponses identiques', 'Les 20 items du Mini-IPIP, les 8 items d’attachement ou les 8 items de conflit tous cotés de la même lettre, alors que chaque bloc contient des items de sens opposé (inversés). Indice d’inattention, pas de mensonge.'),
 ('Rythme', 'Temps médian inférieur à 2 secondes par item d’échelle sur un écran (seuil de la littérature sur les réponses inattentives, à recalibrer sur les temps BOLIGO).'),
 ('Non utilisé', 'Aucune paire d’items « opposés » n’est utilisée : deux items de sens contraire du Mini-IPIP (par exemple « détendu(e) la plupart du temps » et « sautes d’humeur ») peuvent être vrais ensemble. L’indice d’acquiescement de la version précédente est supprimé.'),
]

def quality(a, times=None):
    flags = []
    if has(a, 'V82_M3_01', 'A') and has(a, 'M0_Q04', 'B', 'C'): flags.append('contradiction : jamais de relation sérieuse / séparé ou veuf')
    if has(a, 'M1_Q16', 'I', 'L', 'M') and has(a, 'M8_Q18', 'A'): flags.append('contradiction : sans religion / enfants dans ma religion')
    for name, ids in (('Mini-IPIP', [f'V82_M7_{k:02d}' for k in range(1, 21)]), ('attachement', [f'V82_M2_{k:02d}' for k in range(1, 9)]),
                      ('conflit', [f'V82_M6_{k:02d}' for k in range(1, 9)])):
        vals = [a.get(i) for i in ids]
        if all(vals) and len(set(vals)) == 1: flags.append(f'réponses identiques : {name}')
    if times:
        s = sorted(times); med = s[len(s) // 2]
        if med < 2.0: flags.append('rythme très rapide')
    return flags

# ───────────── Parcours de passation (ordre d'affichage) ─────────────
SESSIONS = [
 ('Séance 1 — Votre cadre, votre projet et vos convictions', 'Session 1 — Your framework, plans and beliefs', [
   ('Cadre de la rencontre', ['V82_M0_01', 'V82_M0_02', 'M0_Q02', 'M0_Q03', 'M0_Q10', 'M0_Q04']),
   ('Enfants', ['V82_M0_03', 'M0_Q06', 'M0_Q14', 'M3_Q04']),
   ('Projet de couple', ['V82_M8_01', 'V82_M8_02', 'M8_Q16', 'M8_Q19', 'V82_M8_05']),
   ('Habitudes', ['M0_Q09', 'M0_Q11', 'M0_Q12', 'M0_Q13', 'M0_Q15', 'M0_Q16']),
   ('Convictions (après consentement)', ['V82_M1_01', 'M1_Q16', 'V82_M1_02', 'M1_Q17', 'M1_Q18', 'M1_Q19', 'V82_M1_03', 'V82_M1_04']),
   ('Mariage et engagement', ['M4_Q17', 'V82_M4_08', 'M1_Q20', 'V82_M8_03', 'M6_Q19', 'M10_Q17']),
   ('Éducation des enfants', ['V82_M8_04', 'M8_Q18', 'M8_Q20']),
   ('Vos priorités', ['M8_Q10', 'M8_Q12']),
 ]),
 ('Séance 2 — Votre façon d’aimer et de traverser les désaccords', 'Session 2 — How you love and handle disagreement', [
   ('Proximité (1)', ['V82_M2_01', 'V82_M2_02', 'V82_M2_03', 'V82_M2_04']),
   ('Ce qui vous rapproche', ['V82_M10_01', 'V82_M10_02', 'V82_M10_04']),
   ('Proximité (2)', ['V82_M2_05', 'V82_M2_06', 'V82_M2_07', 'V82_M2_08']),
   ('Votre histoire', ['V82_M3_01', 'V82_M3_02', 'M3_Q12']),
   ('Désaccords (1)', ['V82_M6_01', 'V82_M6_02', 'V82_M6_03', 'V82_M6_04']),
   ('Limites', ['M6_Q05', 'M6_Q04']),
   ('Désaccords (2)', ['V82_M6_05', 'V82_M6_06', 'V82_M6_07', 'V82_M6_08']),
   ('Une pause demandée', ['V82_M6_09']),
   ('Émotions et point de vue de l’autre', ['V82_M2_09', 'V82_M2_10', 'V82_M2_11', 'V82_M2_12', 'V82_M2_13', 'V82_M2_14']),
   ('Décider à deux', ['V82_M9_01', 'V82_M9_02', 'M9_Q16', 'V82_M9_03']),
   ('Confiance et liberté', ['M5_Q08', 'V82_M9_05', 'V82_M9_06', 'V82_M9_07', 'M9_Q24', 'M6_Q24', 'M10_Q19']),
 ]),
 ('Séance 3 — Votre quotidien, votre famille et votre personnalité', 'Session 3 — Daily life, family and personality', [
   ('Argent', ['V82_M4_01', 'V82_M4_02', 'M4_Q16', 'V82_M4_03', 'V82_M4_04']),
   ('Personnalité (1)', [f'V82_M7_{k:02d}' for k in range(1, 11)]),
   ('Tâches et compromis', ['V82_M4_05', 'V82_M4_06']),
   ('Famille', ['V82_M5_01', 'V82_M5_02', 'V82_M5_03', 'V82_M5_04']),
   ('Personnalité (2)', [f'V82_M7_{k:02d}' for k in range(11, 21)]),
 ]),
]
ORDER = [q for _, _, scr in SESSIONS for _, ids in scr for q in ids]
SEC_PER = {'L': 7, 'F': 7, 'X': 6, 'C': 14, 'M': 20, 'N': 15}  # hypothèses de durée par question, en secondes

# Résumés personnels proposés après chaque écran thématique (exemples, non diagnostiques)
SUMMARY_EXAMPLES = [
 ('Proximité', 'Vous avez indiqué avoir besoin d’entendre régulièrement que vous comptez pour l’autre. Beaucoup de personnes le vivent ainsi ; c’est une information utile à partager tôt.'),
 ('Désaccords', 'Dans vos réponses, vous dites souvent proposer une pause puis revenir au sujet. Vous pouvez corriger cette phrase en modifiant vos réponses.'),
 ('Personnalité', 'Vous semblez aimer l’ordre et finir ce que vous commencez. Ce repère décrit des tendances déclarées, pas ce que vous êtes.'),
]

# ───────────── Scoring (dimensions descriptives, jamais de compatibilité) ─────────────
VAL = {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5}
DIMENSIONS = {}
for q in ITEMS:
    if q['type'] in ('L', 'F', 'X') and q['m'] in (2, 6, 7):
        DIMENSIONS.setdefault(q['dim'], []).append(q['id'])
MIN_ITEMS = lambda n: 3 if n == 4 else n  # 3 sur 4 ; toutes pour les dimensions de 2 items

def item_value(qid, code):
    if code not in VAL: return None   # NA, PNR, absent
    v = VAL[code]
    return 6 - v if BY[qid]['rev'] else v

def dimension_scores(a):
    out = {}
    for dim, ids in DIMENSIONS.items():
        if BY[ids[0]]['m'] == 6: continue   # comportements de conflit : profil par paires, pas de moyenne
        vals = [item_value(i, a.get(i)) for i in ids]
        vals = [v for v in vals if v is not None]
        out[dim] = round(sum(vals) / len(vals), 2) if len(vals) >= MIN_ITEMS(len(ids)) else None
    return out

def band(score):
    """Repère d'écriture (non étalonné) : jamais affiché comme un chiffre."""
    if score is None: return 'information insuffisante'
    return 'plutôt peu' if score < 2.5 else ('nuancé' if score <= 3.5 else 'plutôt marqué')

CONFLICT_PAIRS = [('V82_M6_01', 'V82_M6_02'), ('V82_M6_03', 'V82_M6_04'), ('V82_M6_05', 'V82_M6_06'), ('V82_M6_07', 'V82_M6_08')]
def conflict_profile(a):
    """Paire « à explorer » : négatif Souvent/Très souvent ET positif Jamais/Rarement."""
    return [(n, p) for n, p in CONFLICT_PAIRS if a.get(n) in ('D', 'E') and a.get(p) in ('A', 'B')]
