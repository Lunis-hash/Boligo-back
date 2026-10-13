import html, json, os, sys
from collections import Counter
sys.path.insert(0, os.path.dirname(__file__))
import model as M

e = html.escape
D = os.path.dirname(__file__)
RES = json.load(open(os.path.join(D, 'results.json')))
V71 = json.load(open(os.path.join(D, 'hist.json')))['37c6fa9']
DEPS = json.load(open(os.path.join(D, 'deps.json')))
SIM = json.load(open(os.path.join(D, 'simsondeur.json')))
from classes import SA, SB, COV, INU
I, BY = M.ITEMS, M.BY
N = len(I)
DATE_FR, DATE_EN = '11 octobre 2026', '11 October 2026'
TIT = {0: ('Cadre de la rencontre, filtres et habitudes', 'Relationship framework, filters and habits'),
       1: ('Identité, convictions et traditions', 'Identity, beliefs and traditions'),
       2: ('Attachement, émotions et point de vue de l’autre', 'Attachment, emotions and perspective-taking'),
       3: ('Vécu relationnel', 'Relationship history'), 4: ('Argent, responsabilités et tâches', 'Money, responsibilities and household tasks'),
       5: ('Famille et frontières', 'Family and boundaries'), 6: ('Communication, conflits et limites', 'Communication, conflict and boundaries'),
       7: ('Personnalité (Mini-IPIP)', 'Personality (Mini-IPIP)'), 8: ('Projet de couple, engagement et fidélité', 'Couple project, commitment and fidelity'),
       9: ('Réciprocité, autonomie et limites', 'Reciprocity, autonomy and boundaries'), 10: ('Connexion, affection et intimité', 'Connection, affection and intimacy')}
SCREEN_EN = {'Cadre de la rencontre': 'Relationship framework', 'Enfants': 'Children', 'Projet de couple': 'Couple project', 'Habitudes': 'Habits',
             'Convictions (après consentement)': 'Beliefs (after consent)', 'Mariage et engagement': 'Marriage and commitment',
             'Éducation des enfants': 'Raising children', 'Vos priorités': 'Your priorities', 'Proximité (1)': 'Closeness (1)',
             'Ce qui vous rapproche': 'What brings you closer', 'Proximité (2)': 'Closeness (2)', 'Votre histoire': 'Your history',
             'Désaccords (1)': 'Disagreements (1)', 'Limites': 'Boundaries', 'Désaccords (2)': 'Disagreements (2)', 'Une pause demandée': 'A requested break',
             'Émotions et point de vue de l’autre': 'Emotions and the other’s point of view', 'Décider à deux': 'Deciding together',
             'Confiance et liberté': 'Trust and freedom', 'Argent': 'Money', 'Personnalité (1)': 'Personality (1)', 'Tâches et compromis': 'Tasks and compromise',
             'Famille': 'Family', 'Personnalité (2)': 'Personality (2)'}
INTRO = {
 'Convictions (après consentement)': ('Les questions suivantes portent sur des données protégées (religion, origine, vie intime). Elles ne s’affichent qu’après votre accord explicite, sont toutes facultatives et ne sont jamais montrées telles quelles à une autre personne.',
                                      'The next questions concern protected data (religion, origin, intimate life). They appear only after your explicit consent, are all optional and are never shown as such to anyone else.'),
 'Proximité (1)': ('Répondez selon ce qui vous ressemble habituellement, pas selon ce que vous aimeriez être. Pensez à vos relations, passées ou présentes.',
                   'Answer according to what is usually true of you, not what you would like to be. Think of your relationships, past or present.'),
 'Désaccords (1)': ('Pensez à vos désaccords réels, avec un(e) partenaire ou, à défaut, avec vos proches. Choisissez « Non applicable » si vous n’avez jamais vécu la situation.',
                    'Think of real disagreements, with a partner or, failing that, with people close to you. Choose “Not applicable” if you have never been in that situation.'),
 'Confiance et liberté': ('Les questions sur vos relations passées proposent « Non applicable ». Elles servent à mieux vous connaître, jamais à vous juger.',
                          'Questions about past relationships offer “Not applicable”. They help us know you better, never to judge you.'),
 'Personnalité (1)': ('Décrivez-vous tel(le) que vous êtes généralement aujourd’hui, et non tel(le) que vous aimeriez être. Comparez-vous aux personnes de votre sexe et d’un âge proche que vous connaissez. Indiquez à quel point chaque phrase vous décrit avec exactitude. Il n’y a ni bonne ni mauvaise réponse.',
                      'Describe yourself as you generally are now, not as you wish to be in the future. Compare yourself with people you know of the same sex and roughly the same age. Indicate how accurately each statement describes you. There are no right or wrong answers.'),
}
INTRO['Personnalité (2)'] = INTRO['Personnalité (1)']
HELP = {
 'M0_Q09': ('Aide : y compris cigarette électronique (vapotage) et chicha.', 'Note: including e-cigarettes (vaping) and shisha.'),
 'M0_Q11': ('Aide : y compris cigarette électronique (vapotage) et chicha.', 'Note: including e-cigarettes (vaping) and shisha.'),
 'V82_M0_01': ('Curseurs préremplis à ±5 ans de votre âge ; modifiables.', 'Sliders prefilled at ±5 years of your age; adjustable.'),
 'V82_M0_02': ('Seule cette plage sert de filtre, dans les deux sens. Elle doit inclure votre tranche idéale ; 18 ans au minimum.', 'Only this range is used as a filter, both ways. It must include your ideal range; 18 at the minimum.'),
 'M0_Q10': ('Les quatre propositions affichées en premier dépendent du pays de résidence (règle en service) ; toutes les langues restent accessibles. Le code enregistré est celui de la langue (H = espagnol), jamais sa position à l’écran.', 'The four options shown first depend on the country of residence (current rule); all languages remain available. The stored code is the language’s code (H = Spanish), never its position on screen.'),
 'V82_M0_03': ('« Je n’ai pas d’enfant » ne peut pas être combiné avec une autre réponse.', '“I don’t have children” cannot be combined with another answer.'),
 'M8_Q16': ('« Aucune cérémonie n’est indispensable » ne peut pas être combiné avec une autre réponse.', '“No ceremony is essential” cannot be combined with another answer.'),
 'M6_Q19': ('« Aucun de ceux-là » ne peut pas être combiné avec une autre réponse.', '“None of these” cannot be combined with another answer.'),
 'M8_Q12': ('Trois sujets au plus. « Aucun : tout se discute » ne peut pas être combiné avec un sujet.', 'Three topics at most. “None: everything can be discussed” cannot be combined with a topic.'),
 'M4_Q17': ('La dot (ou compensation matrimoniale) est remise à la famille de l’épouse selon la coutume.', 'The bride price (or marriage compensation) is given to the bride’s family according to custom.'),
 'M8_Q20': ('Information affichée après une réponse A ou B, sans jugement : la loi de nombreux pays, dont la France (article 371-1 du Code civil), exclut les violences physiques dans l’éducation.', 'Information shown after answer A or B, without judgement: the law of many countries, including France (Civil Code, article 371-1), rules out physical violence in raising children.'),
}
TYPE = {'fr': {'C': 'Choix unique', 'M': 'Choix multiple', 'L': 'Accord 1–5', 'F': 'Fréquence 1–5', 'X': 'Exactitude 1–5', 'N': 'Numérique'},
        'en': {'C': 'Single choice', 'M': 'Multiple choice', 'L': 'Agreement 1–5', 'F': 'Frequency 1–5', 'X': 'Accuracy 1–5', 'N': 'Numeric'}}

def page(title, body):
    return f'<!doctype html><html><head><meta charset="utf-8"><title>{e(title)}</title></head><body>' + '\n'.join(body) + '</body></html>'

def table(head, rows):
    out = '<table><tr>' + ''.join(f'<th>{e(h)}</th>' for h in head) + '</tr>'
    for r in rows:
        out += '<tr>' + ''.join(f'<td>{c if isinstance(c, Raw) else e(str(c))}</td>' for c in r) + '</tr>'
    return out + '</table>'
class Raw(str): pass

def secs(qs): return round(sum(M.SEC_PER[BY[q]['type']] for q in qs) / 60)

# ════════════════ Questionnaires FR / EN ════════════════
def questionnaire(lang):
    fr = lang == 'fr'; L = 0 if fr else 1
    o = []; w = o.append
    w(f'<h1>{"BOLIGO — Grand Entretien V8.2 (version finale)" if fr else "BOLIGO — Grand Entretien (Relationship Interview) V8.2 — final version"}</h1>')
    w('<p><b>' + e(f'{N} questions, 11 modules, 3 séances. Version finale avant tests utilisateurs ; non déployée ; non validée cliniquement. {DATE_FR}.' if fr else
                   f'{N} questions, 11 modules, 3 sessions. Final version before user testing; not deployed; not clinically validated. {DATE_EN}.') + '</b></p>')
    w('<h2>' + ('Consignes de passation' if fr else 'Administration instructions') + '</h2><ul>')
    lines = ([
        'L’entretien se fait en trois séances, dans l’ordre ci-dessous (environ 7 à 10 minutes chacune, durée à vérifier en test). Les propositions de profils commencent une fois les trois séances terminées.',
        'Progression visible (séance, écran, pourcentage), sauvegarde automatique à chaque réponse, retour en arrière possible, reprise exactement là où le membre s’est arrêté.',
        'Échelle d’accord (L) : A Pas du tout d’accord · B Plutôt pas d’accord · C Ni d’accord ni pas d’accord · D Plutôt d’accord · E Tout à fait d’accord.',
        'Échelle de fréquence (F) : A Jamais · B Rarement · C Parfois · D Souvent · E Très souvent · NA Non applicable.',
        'Échelle d’exactitude (X, personnalité) : A Très inexact · B Plutôt inexact · C Ni exact ni inexact · D Plutôt exact · E Très exact.',
        'Les codes (A, B…) sont ceux enregistrés ; ils ne changent jamais d’une version à l’autre pour une même question.',
        '« Facultative » : la question peut être passée ou propose « Je préfère ne pas répondre ». Une absence de réponse n’est jamais comptée comme une réponse neutre ni comme une incompatibilité.',
        '« Sensible » : affichée seulement après le consentement explicite du membre (article 9 du RGPD).',
        '« Condition » : affichée seulement si la condition est remplie par des réponses données plus tôt.',
        'Après chaque écran thématique, une phrase de synthèse neutre est proposée ; le membre peut la corriger en modifiant ses réponses. Aucune synthèse n’emploie de terme diagnostique.']
        if fr else [
        'The interview is completed in three sessions, in the order below (about 7 to 10 minutes each, to be confirmed in testing). Profile suggestions start once all three sessions are complete.',
        'Visible progress (session, screen, percentage), autosave after every answer, going back allowed, resuming exactly where the member stopped.',
        'Agreement scale (L): A Strongly disagree · B Somewhat disagree · C Neither agree nor disagree · D Somewhat agree · E Strongly agree.',
        'Frequency scale (F): A Never · B Rarely · C Sometimes · D Often · E Very often · NA Not applicable.',
        'Accuracy scale (X, personality): A Very inaccurate · B Moderately inaccurate · C Neither accurate nor inaccurate · D Moderately accurate · E Very accurate.',
        'Codes (A, B…) are the stored values; they never change between versions for the same question.',
        '“Optional”: the question can be skipped or offers “I prefer not to answer”. A missing answer is never counted as a neutral answer or as an incompatibility.',
        '“Sensitive”: shown only after the member’s explicit consent (GDPR article 9).',
        '“Condition”: shown only when earlier answers meet the condition.',
        'After each thematic screen, a neutral one-sentence summary is offered; the member can correct it by changing their answers. No summary uses diagnostic terms.'])
    for t in lines: w(f'<li>{e(t)}</li>')
    w('</ul>')
    rows = []
    for st_fr, st_en, scr in M.SESSIONS:
        qs = [q for _, ids in scr for q in ids]
        rows.append([st_fr if fr else st_en, len(scr), len(qs), f'≈ {secs(qs)} min'])
    w(table(['Séance' if fr else 'Session', 'Écrans' if fr else 'Screens', 'Questions (maximum)' if fr else 'Questions (maximum)', 'Durée estimée (hypothèse)' if fr else 'Estimated time (hypothesis)'], rows))
    n = 0
    for st_fr, st_en, scr in M.SESSIONS:
        w(f'<h2>{e(st_fr if fr else st_en)}</h2>')
        for title, ids in scr:
            w(f'<h3>{e(title if fr else SCREEN_EN[title])}</h3>')
            if title in INTRO: w(f'<p><i>{e(INTRO[title][L])}</i></p>')
            for qid in ids:
                q = BY[qid]; n += 1
                w(f'<p><b>{n}. {e(qid)} — {e(q["fr" if fr else "en"])}</b></p>')
                opts = M.options(q)
                if q['type'] == 'N':
                    lab = q['fro'] if fr else q['eno']
                    w('<p style="margin-left:18pt">' + '<br>'.join(e(x) for x in lab) + '</p>')
                else:
                    w('<p style="margin-left:18pt">' + '<br>'.join(e(f'{c}. {f if fr else en}') for c, f, en in opts) + '</p>')
                if qid in HELP: w(f'<p style="margin-left:18pt"><i>{e(HELP[qid][L])}</i></p>')
                tags = [f'Module {q["m"]} — {TIT[q["m"]][L]}', TYPE[lang][q['type']]]
                if q['rev']: tags.append('item inversé (R)' if fr else 'reverse-keyed (R)')
                if qid in M.MULTI and M.MULTI[qid]['max']: tags.append((f'{M.MULTI[qid]["max"]} au plus' if fr else f'{M.MULTI[qid]["max"]} at most'))
                if q['opt']: tags.append('facultative' if fr else 'optional')
                if q['sens']: tags.append('sensible : consentement requis' if fr else 'sensitive: consent required')
                if q['cond'] != 'Tous': tags.append(('condition : ' + q['cond']) if fr else ('condition: ' + q['cond_en']))
                w(f'<p style="margin-left:18pt; color:#5E4F6E"><i>{e(" · ".join(tags))}</i></p>')
    w('<h2>' + ('Annexe — index par module' if fr else 'Appendix — index by module') + '</h2>')
    pos = {q: k + 1 for k, q in enumerate(M.ORDER)}
    rows = [[f'{m} — {TIT[m][L]}', len([q for q in I if q['m'] == m]), ', '.join(f'{q["id"]} (n° {pos[q["id"]]})' for q in I if q['m'] == m)] for m in range(11)]
    w(table(['Module', 'Questions', 'Identifiants (position)' if fr else 'Identifiers (position)'], rows))
    w('<p><i>' + e('Les items du module 7 proviennent du Mini-IPIP (Donnellan et al., 2006), issu de l’International Personality Item Pool (domaine public). La version française est une adaptation BOLIGO non validée : aucun score de personnalité ne doit être affiché avant l’étude de validation prévue dans les spécifications.' if fr else
                   'Module 7 items come from the Mini-IPIP (Donnellan et al., 2006), drawn from the International Personality Item Pool (public domain), in their original English wording with the pronoun “I” added. No personality score is to be displayed before the validation study described in the specifications.') + '</i></p>')
    return page('Grand Entretien V8.2', o)

# ════════════════ Spécifications ════════════════
def spec():
    o = []; w = o.append
    h2 = lambda t: w(f'<h2>{e(t)}</h2>'); h3 = lambda t: w(f'<h3>{e(t)}</h3>')
    p = lambda t: w(f'<p>{e(t)}</p>'); ul = lambda xs: w('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in xs) + '</ul>')
    cnt = Counter(q['m'] for q in I)
    w('<h1>BOLIGO — Grand Entretien V8.2 : spécifications techniques (version finale)</h1>')
    p(f'Document 3 sur 4, à lire avec les questionnaires français et anglais (mêmes identifiants, mêmes codes) et le rapport de validation. {N} questions, 11 modules, 3 séances. Version finale de conception : non déployée, Sondeur non modifié, validation empirique à réaliser. {DATE_FR}.')

    h2('1. Corrections de cette version finale')
    w(table(['Point', 'Correction', 'Section'], [
      ['A — Migration V7', 'Vérification de toutes les questions reprises dans les 13 versions du code et dans la base (lecture seule) ; table de migration par code ; conservation automatique seulement si question, options, codes, type et sens sont identiques ; confirmation ou nouvelle réponse sinon ; 22 cas de test.', '10'],
      ['B — Fausses incompatibilités', 'Neuf règles d’incompatibilité seulement, toutes fondées sur une exigence explicite face à un refus ou une situation explicite. Exclusivité, polygamie, vie commune, intimité avant le mariage, religion des enfants (A/D), aide familiale et lieu de vie deviennent des écarts majeurs ou à discuter. Une réponse absente ou « je préfère ne pas répondre » ne produit rien.', '7'],
      ['C — Mini-IPIP', 'Échelle d’exactitude d’origine au lieu de l’échelle d’accord ; libellés anglais conformes ; sept traductions françaises corrigées ; clés d’inversion vérifiées ; scores français présentés comme non étalonnés.', '4'],
      ['D — Faux indicateurs de mensonge', 'Indice d’acquiescement sur 9 « paires opposées » supprimé ; restent trois indicateurs expérimentaux (contradiction factuelle, réponses identiques sur un bloc à items inversés, rythme), sans effet sur la compatibilité.', '6'],
      ['E — Dot et Mahr', 'Question V7 de la dot rétablie à l’identique (réponses conservées) ; Mahr en question conditionnelle distincte (V82_M4_08) ; la fusion rendait les anciennes réponses inutilisables.', '7, 9'],
      ['F — Choix multiples', 'Règle par question (options exclusives, maximum, « je préfère ne pas répondre » exclusif, ordre canonique) ; toutes les combinaisons testées.', '8'],
      ['G — Sécurité', 'M6_Q04 rétablie (lue par le dispositif de sécurité) ; violence, coercition, respect du refus et châtiment corporel hors de toute règle de compatibilité ; aucune étiquette ; M8_Q20 lue sous l’angle de la protection de l’enfant et du droit.', '7.6'],
      ['Sondeur', 'Recensement exact : 61 questions V7 retirées sont lues par le moteur de divergences ou le Sondeur (et non 31 : l’ancien décompte reposait sur une extraction incomplète des identifiants) ; couche de compatibilité avec 14 correspondances démontrées ; comportement sans équivalent défini pour les 47 autres.', '11'],
      ['Parcours', 'Ordre de passation en 3 séances et 24 écrans ; au plus 4 à 6 items d’échelle consécutifs hors Mini-IPIP ; Mini-IPIP en deux blocs de 10 ; questions sensibles regroupées après le consentement.', '12'],
      ['Nombre de questions', '113 conservées : + M6_Q04 (sécurité) et + V82_M4_08 (Mahr) ; − V82_M3_03 (réflexivité auto-déclarée, sans usage de calcul) et − V82_M9_04 (redondante avec V82_M2_02, item unique non utilisé).', '3'],
    ]))

    h2('2. Architecture')
    w(table(['Module', 'Titre', 'Questions'], [[m, TIT[m][0], cnt[m]] for m in range(11)] + [['', 'Total', N]]))
    p('Six familles de sortie, jamais additionnées : (1) traits de personnalité (module 7, description seulement) ; (2) besoins affectifs (module 2, V82_M10_01, V82_M10_04) ; (3) comportements déclarés (modules 6 et 9, avec « Non applicable ») ; (4) préférences de vie et valeurs ; (5) limites déclarées (seule source d’incompatibilité) ; (6) niveau de confiance (calculé, jamais demandé). Les questions de sécurité forment un circuit séparé (section 7.6).')
    h3('2.1 Statut scientifique de chaque bloc')
    w(table(['Bloc', 'Questions', 'Statut', 'Ce qui est permis'], [
      ['Personnalité : Mini-IPIP', 'V82_M7_01 à 20', 'Instrument publié et validé en anglais (Donnellan et al., 2006) ; adaptation française BOLIGO non validée', 'Portrait descriptif après validation ; jamais la compatibilité'],
      ['Attachement (anxiété, évitement)', 'V82_M2_01 à 08', 'Items originaux BOLIGO inspirés d’un modèle validé (Brennan et al., 1998 ; ECR-S, Wei et al., 2007), non validés', 'Portrait prudent, Sondeur ; aucun score affiché avant validation'],
      ['Régulation des émotions', 'V82_M2_09 à 12', 'Items originaux inspirés de l’ERQ (Gross et John, 2003) ; 2 items par processus : indicateurs, pas des échelles', 'Portrait prudent'],
      ['Prise de perspective', 'V82_M2_13, 14', 'Items originaux inspirés de l’IRI (Davis, 1983) ; indicateur', 'Portrait, Sondeur'],
      ['Communication en conflit', 'V82_M6_01 à 09', 'Items originaux fondés sur les travaux de Gottman (1994 ; Gottman et Levenson, 2000) ; comportements auto-déclarés', 'Profil par paires, Sondeur ; jamais un score'],
      ['Contrôle et respect du refus', 'V82_M9_06, 07, M9_Q24, M9_Q16', 'Items originaux ; le contrôle coercitif se définit par un schéma (Stark, 2007), pas par une réponse', 'Dispositif de sécurité, mise en regard avec les limites de l’autre ; aucune étiquette'],
      ['Projet, valeurs, argent, famille, religion, traditions', 'Modules 0, 1, 4, 5, 8, 10', 'Questions originales BOLIGO de préférences et de limites (non psychométriques)', 'Compatibilité selon les règles métier de la section 7'],
      ['Règles de compatibilité', 'Section 7', 'Règles métier BOLIGO, non validées empiriquement', 'Exclusion seulement pour les 9 règles explicites'],
      ['Seuils, bandes, durée, indicateurs de qualité', 'Sections 5, 6, 12', 'Hypothèses à tester', 'Recalibrage obligatoire sur données pilotes'],
    ]))

    h2('3. Questions retirées ou ajoutées dans cette version')
    ul(['Ajoutée : V82_M4_08 (Mahr), conditionnelle.', 'Rétablie : M6_Q04 (violence physique, sécurité), identique à la V7.1 : réponses conservées.',
        'Rétablie : M4_Q17 (dot), identique à la V7.1 avec « je préfère ne pas répondre » : réponses conservées. Elle remplace la question fusionnée dot/Mahr de la V8.2 initiale.',
        'Retirée : V82_M3_03 (recul sur les expériences passées) : auto-évaluation peu fiable, sans usage dans les calculs ni dans le Sondeur.',
        'Retirée : V82_M9_04 (« un simple message suffit à me rassurer ») : redondante avec V82_M2_02 ; la séparation entre réassurance et contrôle est assurée par la structure (les comportements de contrôle sont des items distincts).'])

    h2('4. Personnalité : Mini-IPIP')
    rows = []
    for k in range(1, 21):
        q = BY[f'V82_M7_{k:02d}']
        rows.append([q['id'], q['dim'].replace('Big Five — ', ''), q['en'], q['fr'], 'inversé' if q['rev'] else 'direct'])
    w(table(['Item', 'Domaine', 'Original (anglais)', 'Version française BOLIGO', 'Clé (stabilité)'], rows))
    ul([
     'Administration : consigne d’origine (se décrire tel que l’on est, comparé aux personnes de son sexe et de son âge) et échelle d’exactitude en 5 points (Very inaccurate … Very accurate), utilisée pour l’étalonnage IPIP (ipip.ori.org, consignes de cotation). Le site IPIP autorise d’autres formats, mais garder le format d’origine conserve la comparabilité avec les données publiées.',
     'Impact de l’ancienne échelle d’accord : les deux formats sont des échelles en 5 points et donnent des structures proches, mais une échelle d’accord invite davantage l’acquiescement sur des affirmations et rompt la comparaison avec les normes publiées. Décision : échelle d’exactitude pour le module 7 seulement ; les autres modules gardent l’échelle d’accord ou de fréquence adaptée à leur contenu.',
     'Calcul : 4 items par domaine ; 11 items inversés (6 − valeur) ; BOLIGO présente la « stabilité émotionnelle », c’est-à-dire le névrosisme d’origine inversé (items 04 et 14 inversés, 09 et 19 directs). Moyenne seulement si 3 items sur 4 sont renseignés.',
     'Fidélité théorique : dans l’article d’origine, coefficients alpha « égaux ou nettement supérieurs à 0,60 » selon les domaines et les échantillons (Donnellan et al., 2006). Une étude sur 15 701 jeunes adultes américains confirme la structure en cinq facteurs avec une fidélité acceptable pour la plupart des échelles, mais une invariance scalaire incomplète entre sexes et groupes (Baldasaro, Shanahan et Bauer, 2013) : comparer des scores entre groupes demande de la prudence. Avec 4 items, l’erreur de mesure individuelle reste importante.',
     'Traduction française : sept items corrigés pour suivre le sens d’origine (« sympathize » = compatir et non comprendre ; « get upset » = être contrarié et non s’énerver ; « seldom feel blue » = avoir rarement le cafard ; « make a mess of things », « vivid imagination », « chores », « life of the party »). Aucune adaptation française du Mini-IPIP publiée n’a pu être confirmée (une adaptation est signalée comme soumise par O. Laverdière, sans publication retrouvée) : traduction inverse indépendante, entretiens cognitifs et étude de validation obligatoires.',
     'Droits : items IPIP dans le domaine public, utilisables commercialement sans autorisation (ipip.ori.org). Citer Donnellan et al. (2006) et Goldberg et al. (2006).',
     'Limites : description de tendances déclarées ; aucune valeur clinique ; les traits prédisent peu la qualité d’un couple (Joel et al., 2020) : ils ne servent jamais à la compatibilité ni au classement. Aucun score français ne sera présenté comme étalonné avant la validation (section 14).'])

    h2('5. Scoring et restitution')
    ul([
     'Codage : A = 1 … E = 5 pour les échelles L, F et X ; items (R) recodés 6 − valeur ; « Non applicable » (NA) et « Je préfère ne pas répondre » = valeur manquante, jamais 3.',
     'Dimensions calculées : attachement (anxiété, évitement : 4 items, au moins 3 renseignés), régulation (réévaluation, suppression : 2 items, les 2 renseignés), prise de perspective (2 sur 2), cinq domaines du Mini-IPIP (3 sur 4). Sinon : « information insuffisante ». Aucune moyenne de dimensions différentes.',
     'Comportements de conflit (V82_M6_01 à 08) : pas de moyenne ; quatre paires négatif / positif ; une paire est « à explorer » si le comportement négatif est D ou E ET le positif A ou B.',
     'Restitution : jamais de chiffre, de pourcentage ni de rang. Repères d’écriture : moyenne < 2,5 « plutôt peu », 2,5 à 3,5 « nuancé », > 3,5 « plutôt marqué ». Ce sont des hypothèses d’écriture, pas des seuils scientifiques ; à remplacer par des normes BOLIGO (percentiles du pilote) avant tout affichage de profil chiffré.',
     'Les questions de sécurité (M6_Q04, M6_Q05, M6_Q24, M9_Q24, M8_Q20, V82_M9_06, V82_M9_07, M9_Q16, M10_Q19) n’entrent dans aucune dimension ni aucune compatibilité.',
     'Indice affiché entre deux personnes (si un chiffre reste nécessaire) : « points d’accord déclarés sur N points comparables », avec la couverture. Jamais une probabilité de réussite ni une promesse ; aucun seuil présenté comme scientifique.'])

    h2('6. Indicateurs de qualité des réponses (expérimentaux)')
    w(table(['Indicateur', 'Définition'], [[a, b] for a, b in M.QUALITY]))
    p('Usage : aucun indicateur n’est une preuve de mensonge. Effets possibles, seulement après validation sur données pilotes : invitation neutre à relire certaines réponses (« certaines réponses semblent aller dans des sens différents, souhaitez-vous les relire ? ») et portrait formulé plus prudemment. Jamais visible par l’autre membre, jamais une exclusion, jamais une pénalité, jamais le mot « mensonge ». Les contradictions factuelles sont d’abord empêchées à la saisie.')

    h2('7. Compatibilité')
    h3('7.1 Filtres réciproques (éligibilité)')
    p('Une personne n’est proposée que si chacune entre dans les limites de l’autre : âges acceptables (V82_M0_02), périmètre (M0_Q02, par région dans tous les pays), au moins une langue commune (M0_Q10, ou même langue écrite dans « autre langue »). Donnée absente : pas de filtre.')
    h3('7.2 Incompatibilités déclarées (seules exclusions automatiques)')
    p('Une incompatibilité exige, d’un côté, une exigence ou un refus formulé sans condition et, de l’autre, une position ou une situation explicitement opposée. Chaque règle est évaluée dans les deux sens.')
    w(table(['Règle', 'Incompatibilité si', 'Écart majeur si', 'Ne produit rien si'], [
      ['Enfants', 'M0_Q06 A « Oui, absolument » face à D « Non, c’est définitif »', 'B face à D', 'réponse absente ou E (ne pas répondre)'],
      ['Partenaire avec enfants', 'M0_Q14 D « Je ne pourrais pas l’accepter » face à des enfants mineurs (V82_M0_03 = B, C ou D)', 'D face à des enfants majeurs seulement (E) ; B « pas à plein temps » face à B (enfants surtout chez le parent)', 'l’autre n’a pas d’enfant ou n’a pas répondu'],
      ['Tabac', 'M0_Q11 A face à M0_Q09 B ou C', 'M0_Q11 B face à C (régulier)', 'M0_Q11 C ; D se discute'],
      ['Alcool', 'M0_Q13 A face à M0_Q12 B, C ou D', 'M0_Q13 B face à C ou D', 'M0_Q13 C ; D se discute'],
      ['Jeux d’argent', 'M0_Q16 A face à M0_Q15 B, C ou D', 'M0_Q16 B face à C ou D', 'M0_Q16 C'],
      ['Religion', 'M1_Q18 A ou B (convictions partagées exigées) ET religions de familles différentes, toutes deux précises (chrétienne, musulmane, juive, bouddhiste, hindoue, sans religion) ET l’autre répond A, B ou D à M1_Q18 (pas d’adoption envisagée)', 'mêmes conditions, mais l’autre pourrait adopter (E), n’a pas répondu ou relève d’une religion traditionnelle, d’une spiritualité personnelle ou d’une « autre religion »', 'M1_Q18 C, D, E ; « je préfère ne pas répondre » ; même famille (Églises chrétiennes différentes : écart à discuter)'],
      ['Dot', 'M4_Q17 A face à D', 'B face à D', 'C (« je la respecterais ») ; E'],
      ['Mahr', 'V82_M4_08 A face à D', 'B face à D', 'question non affichée à l’un des deux ; C ; E'],
      ['Religion des enfants', 'M8_Q18 A des deux côtés avec deux religions précises différentes', 'A face à D', 'même religion ; réponse absente'],
    ]))
    h3('7.3 Écarts majeurs, jamais des exclusions')
    ul(['Exclusivité (V82_M8_03) : A face à C. Être ouvert à d’autres formes de relation n’est pas refuser l’exclusivité ; aucune option n’exprime une exigence de non-exclusivité.',
        'Polygamie (M1_Q20) : A face à C. « Envisageable si chacun y consent » est une ouverture, pas une exigence.',
        'Vie commune avant le mariage (M8_Q19) : A face à D. « Souhaitable » n’est pas « exigé ».',
        'Intimité avant le mariage (M10_Q17) : A face à C.',
        'Aide financière à la famille (M4_Q16) : A face à D.',
        'Religion des enfants (M8_Q18) : A face à D (« sans éducation religieuse » est une intention, pas un refus explicite).',
        'Les écarts majeurs sont abordés en priorité dans la fiche de compatibilité et le Sondeur, avec la règle « aucun compromis présupposé ».'])
    h3('7.4 Écarts à discuter et sujets non négociables')
    p('Toutes les autres différences (pratique religieuse A face à D, définitions de l’infidélité, lieu de vie à long terme, tabac « jamais à la maison », etc.) sont des écarts à discuter. Un sujet coché dans M8_Q12 fait passer un écart à discuter du thème en écart majeur ; il ne crée jamais une incompatibilité.')
    h3('7.5 Données manquantes')
    p('Réponse absente, question non affichée, « Je préfère ne pas répondre », consentement non donné ou retiré : la règle ne produit rien (ni accord, ni écart, ni exclusion). Une réponse de migration en attente de confirmation ne crée jamais d’incompatibilité (au plus un écart majeur).')
    h3('7.6 Sécurité et droit')
    ul(['Circuit séparé : M6_Q04 (violence physique), M6_Q05 (mots blessants), M6_Q24 (gifle « compréhensible »), M9_Q24 (insistance après un refus), V82_M9_06 et 07 (téléphone, localisation), M9_Q16 (bouderie), M10_Q19 (capacité à dire non), M8_Q20 (châtiment corporel).',
        'Ces réponses ne sont jamais comparées comme des préférences, jamais affichées à l’autre, jamais utilisées pour une étiquette (« dangereux », « manipulateur », trouble psychologique) ni pour une exclusion automatique à partir d’une réponse isolée.',
        'Usage : questions de limite écrites à l’avance dans le Sondeur (règle en service), information sur l’aide disponible, et, en cas de signalement ou de messages inquiétants, la modération humaine existante.',
        'M8_Q20 : lue sous l’angle de la protection de l’enfant. En France, l’article 371-1 du Code civil (loi du 10 juillet 2019) exclut les violences physiques dans l’exercice de l’autorité parentale. Réponse A ou B : information privée et neutre sur la loi du pays de résidence. Écart A/B face à D : point de vigilance traité comme un sujet de sécurité (questions de limite, jamais de compromis).',
        'M10_Q19 B ou C (difficulté à refuser) : message bienveillant au membre lui-même sur le droit de dire non ; jamais montré à l’autre.'])
    h3('7.7 Écarts avec le moteur en service (à corriger à l’intégration, sans toucher la V7.1 avant)')
    w(table(['Question', 'Moteur en service (V7.1)', 'Règle V8.2'], [
      ['M1_Q20 polygamie', 'A/C et B/C = critique (exclusion)', 'A/C écart majeur ; B/C à discuter'],
      ['M4_Q16 aide familiale', 'A/D = critique', 'écart majeur'],
      ['M0_Q06 enfants', 'B/D = critique', 'écart majeur (seul A/D exclut)'],
      ['M8_Q18 religion des enfants', 'A/D = critique', 'écart majeur ; A/A avec religions différentes = incompatibilité'],
      ['M6_Q04 violence physique', 'A ou B face à C = critique ; C/C = critique', 'circuit de sécurité, aucune exclusion automatique'],
      ['M6_Q24 gifle', 'règle de vigilance « critique »', 'circuit de sécurité, aucune exclusion automatique'],
    ]))
    p('Conséquence : tant que ces règles en service ne sont pas alignées, une V8.2 intégrée telle quelle hériterait de ces exclusions. L’alignement fait partie de l’intégration (section 14) et se teste sur une copie des données.')

    h2('8. Choix multiples')
    w(table(['Question', 'Règle'], [[k, v['note']] for k, v in M.MULTI.items()]))
    p('Contrôle côté application (une option exclusive décoche les autres) ET côté serveur (refus de toute combinaison invalide, règle déjà en service pour M8_Q12 K, M8_Q16 D et M6_Q19 G). Valeur enregistrée : codes séparés par des virgules, dans l’ordre des options.')

    h2('9. Conditions d’affichage, questions sensibles et facultatives')
    w(table(['Question', 'Condition'], [[q, BY[q]['cond']] for q in M.COND]))
    w(table(['Question', 'Catégorie (article 9)'], [[k, v] for k, v in M.SENSITIVE.items()]))
    p(f'Questions facultatives : {len(M.OPTIONAL)}. Toute question sensible est facultative. Les questions de sécurité ne sont pas soumises au consentement de l’article 9 (elles ne relèvent pas de ses catégories) et restent obligatoires, avec « Non applicable » quand elles supposent une relation vécue. M8_Q16 (mariage religieux) et M4_Q17 (dot) gardent le statut non sensible qu’elles ont en service ; à confirmer par le délégué à la protection des données.')

    h2('10. Migration des réponses V7 vers la V8.2')
    h3('10.1 Vérifications réalisées')
    ul(['Historique complet du fichier des questions (13 versions, de juillet au 11 octobre 2026) : pour chaque question reprise, comparaison du texte, des options, des codes, du choix multiple et de l’échelle.',
        'Base BOLIGO, lecture seule, distributions agrégées : 2 entretiens (comptes de test), 72 réponses aux questions reprises ou sources de migration, toutes enregistrées le 10/10/2026 en codes V7.1 valides.',
        'M0_Q10 : dans toutes les versions du code depuis la V6, le code C est l’arabe et le code H l’espagnol. Les documents V6.2 et V7 décrivaient les quatre propositions affichées (A langue du pays, B anglais, C espagnol, D autre) : ce sont des positions d’écran, pas des codes. Le serveur garde le code de la langue quelle que soit sa position (questions.service.ts, withSuggestion). Aucune conversion n’est donc nécessaire et une conversion « C → espagnol » serait une erreur.'])
    h3('10.2 Statuts')
    ul([f'{M.KEEP} : question, options, codes, type et sens identiques ; la réponse est gardée telle quelle, jamais réinterprétée.',
        f'{M.CONFIRM} : une option voisine a été ajoutée ou un libellé a changé sans changer la famille de réponse ; la réponse est préremplie et le membre la confirme ou la corrige. En attendant, elle ne crée jamais d’incompatibilité.',
        f'{M.NEW} : sens différent, ambigu ou réponse invalide ; question reposée ; l’ancienne réponse reste stockée en lecture V7.'])
    rows = []
    for q in I:
        if q['id'].startswith('V82_'): continue
        groups = {}
        for c in [k for k, _, _ in V71[q['id']]['options']]:
            for d in ('2026-10-05', '2026-10-10'):
                tgt, val, st, rule = M.migrate(q['id'], c, d, {'M0_Q05': 'B'} if q['id'] == 'M0_Q06' else None)
                groups.setdefault((d, st, rule, val == c), []).append(c)
        merged = {}
        for (d, st, rule, same), cs in groups.items():
            merged.setdefault((st, rule, same, ','.join(cs)), []).append(d)
        for (st, rule, same, cs), ds in merged.items():
            when = 'toutes dates' if len(ds) == 2 else ('avant le 07/10/2026' if ds == ['2026-10-05'] else 'à partir du 07/10/2026')
            if q['id'] == 'M0_Q02' and 'avant le 11/10' in rule: when = 'avant le 11/10/2026'
            if q['id'] == 'M0_Q06' and st == M.CONFIRM: when += ' (membre parent)'
            rows.append([q['id'], cs, (cs if same else '—'), when, rule, st])
        if q['id'] == 'M0_Q06':
            rows.append(['M0_Q06', 'A,B,C,D', 'A,B,C,D', 'avant le 07/10/2026 (membre sans enfant, M0_Q05 = A)', 'question identique pour une personne sans enfant', M.KEEP])
    w(table(['Ancien identifiant', 'Ancien code', 'Nouvelle valeur', 'Date de la réponse', 'Règle de transformation', 'Statut'], rows))
    h3('10.3 Questions V7 sources de nouvelles questions')
    w(table(['Ancien identifiant', 'Ancien code', 'Nouvelle question', 'Nouvelle valeur', 'Règle', 'Statut'], [
      ['M0_Q01', 'A, B, C, D', 'V82_M0_02', 'plage préremplie', 'A ±5 ans ; B −5 à 0 ; C 0 à +5 ; D ±10', M.CONFIRM],
      ['M0_Q05', 'A', 'V82_M0_03', 'A', 'pas d’enfants = pas d’enfant', M.KEEP], ['M0_Q05', 'D', 'V82_M0_03', 'E', 'tous autonomes = majeurs ou autonomes', M.KEEP],
      ['M0_Q05', 'B, C', 'V82_M0_03', '—', 'résidence des enfants inconnue', M.NEW],
      ['M3_Q11', 'E, A, B, C, D', 'V82_M3_01', 'A, B, C, D, D', 'jamais → A ; séparation en cours → B ; moins de 6 mois → C ; plus de 6 mois → D', M.KEEP],
      ['M8_Q01', 'A, B, D', 'V82_M8_01', 'A, B, D', 'mêmes intentions', M.KEEP], ['M8_Q01', 'C', 'V82_M8_01', '—', 'sens différent', M.NEW],
      ['M8_Q17', 'A, B, C', 'V82_M8_02', 'A, B, C', 'C (2 à 3 ans) incluse dans « plus de deux ans »', M.KEEP], ['M8_Q17', 'D', 'V82_M8_02', '—', 'C, D ou E possibles', M.NEW],
      ['M4_Q01', 'A, B', 'V82_M4_01', 'A, B', 'mêmes organisations', M.KEEP], ['M4_Q01', 'C, D', 'V82_M4_01', 'C, D', 'formulations voisines non identiques', M.CONFIRM],
      ['Autres questions V7 retirées', 'tous', '—', '—', 'aucune recopie ; réponses gardées en lecture V7', M.NEW]]))
    h3('10.4 Cas de test de migration')
    p('22 cas exécutés (rapport de validation) : positifs (M0_Q10 H → espagnol ; M0_Q05 A → V82_M0_03 A), négatifs (M0_Q10 C reste l’arabe ; M8_Q16 « B,D » refusé ; code inconnu refusé ; question retirée jamais recopiée), ambigus (M0_Q04 D avant le 07/10 ; M0_Q02 A avant le 11/10 ; M8_Q17 D ; M0_Q05 B ; M0_Q10 I avant l’ajout du créole, gardé sans réinterprétation).')
    tally, detail = RES['migration_real']
    p('Application aux réponses réelles de la base : ' + ', '.join(f'{v} {k}' for k, v in tally.items()) + '. Détail : ' + ' ; '.join(detail) + '.')

    h2('11. Couche de compatibilité avec le moteur et le Sondeur')
    h3('11.1 Principe')
    ul(['Le Sondeur et le moteur ne sont pas modifiés. Une fonction pure v7_view(réponses V8.2) fournit les réponses V7 que ces modules lisent : les 36 questions reprises sous leur identifiant, plus 14 correspondances démontrées. Elle ne produit une valeur V7 que si la valeur V8.2 l’implique sans ambiguïté ; sinon la réponse est absente.',
        'Absence = règle inactive : le moteur ignore toute règle dont une réponse manque (divergence.engine.ts, fonction applyRule) ; les listes du générateur (sujets de fond, aveux personnels, sujets de contrôle) ne se déclenchent pas. Aucune divergence, aucun accord, aucune exclusion n’est inventé.',
        'Les membres V7.1 ne passent pas par cette couche : leurs résultats restent strictement identiques.',
        'Les questions de sécurité lues par le Sondeur (SAFETY_QUESTIONS : M6_Q04, M6_Q05, M6_Q24, M9_Q24) sont toutes conservées à l’identique.'])
    FN = {'engine': 'moteur de divergences', 'pool': 'Sondeur (banque de questions)', 'gen': 'Sondeur (générateur)', 'psy': 'psychométrie V7',
          'portrait': 'portrait', 'phrases': 'portrait (phrases)', 'bridge': 'pont V6/V7', 'affinity': 'affinités', 'filters': 'filtres Découverte', 'biog': 'garde-fou bio'}
    COVER = {'M1_Q21': 'V82_M1_01', 'M1_Q02': 'V82_M1_03', 'M1_Q13': 'V82_M1_03', 'M1_Q15': 'V82_M1_04', 'M2_Q23': 'V82_M2_01', 'M2_Q07': 'V82_M6_08',
             'M2_Q22': 'V82_M6_08', 'M2_Q19': 'Mini-IPIP (descriptif)', 'M3_Q13': 'M6_Q19', 'M4_Q14': 'V82_M4_06', 'M4_Q03': 'V82_M4_05', 'M4_Q04': 'V82_M4_05',
             'M4_Q11': 'V82_M4_02', 'M4_Q12': 'V82_M4_06', 'M5_Q10': 'V82_M5_04', 'M5_Q02': 'V82_M5_01', 'M5_Q03': 'V82_M5_03', 'M5_Q09': 'M6_Q19',
             'M6_Q16': 'V82_M6_06', 'M6_Q03': 'V82_M6_05', 'M6_Q11': 'V82_M6_08', 'M6_Q13': 'V82_M6_03', 'M6_Q15': 'V82_M6_07', 'M6_Q18': 'M6_Q19',
             'M7_Q05': 'Mini-IPIP (descriptif)', 'M7_Q08': 'V82_M9_03', 'M7_Q36': 'V82_M8_05', 'M8_Q04': 'V82_M10_01', 'M8_Q06': 'V82_M9_02',
             'M9_Q06': 'V82_M4_06', 'M9_Q07': 'V82_M10_04', 'M9_Q11': 'V82_M9_06, V82_M9_07', 'M9_Q19': 'M9_Q16', 'M10_Q18': 'M10_Q19', 'M10_Q15': 'V82_M10_02'}
    V7T = {l.split('\t')[0]: l.split('\t')[1] for l in open(os.path.join(D, 'v7list.tsv'))}
    rows = []
    dep = [x for x in DEPS['dep'] if x != 'M6_Q04']
    for x in dep:
        fns = ', '.join(FN[c] for c in DEPS['use'][x])
        if x in M.COMPAT:
            src, _, tr = M.COMPAT[x]
            rows.append([x, V7T[x][:70], fns, src, tr, 'valeurs non couvertes : règle inactive', 'T1, T2, T4'])
        else:
            rows.append([x, V7T[x][:70], fns, '—', 'aucune (pas d’équivalence démontrée)', 'règle ou thème inactif pour les couples V8.2 ; thème V8.2 pour un futur gabarit natif : ' + COVER.get(x, 'aucun'), 'T3, T4'])
    w(table(['Question V7', 'Libellé', 'Fonctions concernées', 'Équivalent V8.2', 'Transformation', 'Sans équivalent fiable', 'Tests'], rows))
    h3('11.2 Les 47 dépendances sans équivalent : classement et stratégie')
    p('Classement établi à partir du rôle de chaque question dans le code en service (règle du moteur, banque du Sondeur, listes du générateur) et d’une simulation : le moteur et le générateur du Sondeur EN SERVICE, non modifiés, ont été exécutés hors application sur 300 couples V7.1 et 300 couples V8.2 aux réponses tirées au hasard. La colonne « Sélections » indique combien de fois le sujet a été retenu dans les 6 300 questions V7.1 simulées. Des réponses aléatoires ne reflètent pas de vrais couples : ces chiffres comparent des capacités, ils ne mesurent pas un usage réel.')
    sel = SIM['v71']['subjects']
    cat_rows = []
    for x in sorted(INU): cat_rows.append([x, V7T[x][:60], 'Devenue inutile', sel.get(x, 0), INU[x], 'aucune action'])
    for x in sorted(COV): cat_rows.append([x, V7T[x][:60], 'Couverte autrement', sel.get(x, 0), COV[x], 'aucune action ; vérifier par le test T3'])
    for x in sorted(SA): cat_rows.append([x, V7T[x][:60], 'Perte réelle — une question V8.2 traite le même sujet', sel.get(x, 0), 'Nouvelle règle native sur ' + SA[x] + ', avec ses propres options et ses propres gabarits (aucune conversion de réponses)', 'stratégie A'])
    for x in SB: cat_rows.append([x, V7T[x][:60], 'Perte réelle — aucune question V8.2 sur ce sujet', sel.get(x, 0), 'Question V7 reprise mot pour mot (même identifiant, mêmes codes) dans un complément facultatif, ou perte acceptée', 'stratégie B (décision produit)'])
    w(table(['Question V7', 'Libellé', 'Catégorie', 'Sélections (sim. V7.1)', 'Justification / remplacement', 'Action'], cat_rows))
    p(f'Bilan : {len(INU)} devenues inutiles, {len(COV)} couvertes autrement, {len(SA) + len(SB)} pertes réelles ({len(SA)} avec une question V8.2 sur le même sujet, {len(SB)} sans).')
    h3('11.3 Stratégie de remplacement (sans modifier le Sondeur maintenant, sans correspondance inventée)')
    ul(['Membres existants : leurs réponses V7 d’origine aux questions retirées restent stockées. La couche de compatibilité les transmet telles quelles (même question, même réponse, avec leur date) : aucune perte pour eux tant qu’elles ne sont pas périmées. Proposition : les considérer comme valides 24 mois, puis inviter à les mettre à jour.',
        'Stratégie A (13 sujets) : à l’intégration, ajouter au moteur et à la banque du Sondeur des règles et des gabarits NOUVEAUX, rédigés pour les options des questions V8.2 indiquées. Ce sont des ajouts de données dans les tables existantes : la logique du Sondeur (planification, sécurité, plafonds, relecture) ne change pas. Aucune réponse V8.2 n’est convertie en réponse V7. Écriture et tests soumis à votre accord.',
        'Stratégie B (14 sujets) : aucune question V8.2 ne porte ces sujets. Deux options sans invention : (1) un complément facultatif reprenant les 14 questions V7 mot pour mot (mêmes identifiants et codes, donc lues telles quelles par le moteur et le Sondeur), environ 3 minutes, proposé après les trois séances et sans bloquer le matching ; M6_Q18 reste soumise au consentement « vie intime » ; (2) accepter la perte, le Sondeur remplissant alors ces créneaux par ses questions de thème. Recommandation : option 1, car les sujets famille, tendresse, engagement dans l’épreuve et fidélité sont au cœur de BOLIGO.',
        'Ces 14 questions ne sont pas ajoutées aux 113 : la V8.2 reste inchangée tant que vous n’avez pas décidé.'])
    h3('11.4 Résultats de la simulation (code en service, hors application)')
    rows = []
    lab = {'v71': 'V7.1 (toutes les questions)', 'v82': 'V8.2 seule (vue de compatibilité)', 'v82c': 'V8.2 + complément B (14 questions V7)', 'v82max': 'Plafond : V8.2 + sujets A et B restaurés'}
    for k, nm in lab.items():
        st = SIM[k]; n = st['couples'] * 21
        pers = (st['src'].get('divergence', 0) + st['src'].get('convergence', 0)) / n
        rows.append([nm, st['couples'], st['errors'], st['not21'], f'{pers:.0%}', len(st['subjects'])])
    w(table(['Configuration', 'Couples', 'Erreurs', 'Séries ≠ 21 questions', 'Questions personnalisées', 'Sujets distincts utilisés'], rows))
    themes = sorted(SIM['v71']['themesTotal'])
    w(table(['Thème'] + [lab[k] for k in lab], [[t] + [f"{SIM[k]['themesPersonal'].get(t, 0) / SIM[k]['themesTotal'][t]:.0%}" for k in lab] for t in themes]))
    p('Lecture : le Sondeur ne casse pas (0 erreur, toujours 21 questions), mais il devient moins personnalisé pour un couple V8.2 (56 % contre 67 % de questions tirées des réponses des deux membres), surtout dans le thème famille (46 % contre 89 %). Le complément B seul remonte à 62 %, sans combler la famille ; la famille dépend surtout de la stratégie A (77 % dans le plafond). Le « plafond » suppose que les nouvelles règles A seront aussi riches que les anciennes : c’est une borne, pas une prévision.')
    h3('11.5 Tests de non-régression (à automatiser à l’intégration)')
    ul(['T1 — Pour chaque correspondance : réponse V8.2 → v7_view → rapport du moteur identique au rapport obtenu avec la réponse V7 native équivalente.',
        'T2 — Valeurs ambiguës (exemples : V82_M3_01 = D, V82_M0_03 = B, V82_M8_02 = E) : réponse V7 absente, aucune divergence sur la question, hardStop inchangé.',
        'T3 — Questions sans équivalent : pour un couple V8.2, aucune divergence ni accord sur ces questions ; le Sondeur produit toujours 7 questions par jour pendant 3 jours (repli sur d’autres thèmes) ; aucune erreur.',
        'T4 — Membres V7.1 : rapport du moteur, plan du Sondeur et portrait strictement identiques avant et après l’ajout de la couche (instantanés sur les scénarios du laboratoire ai-lab).',
        'T5 — Couple mixte V7.1 × V8.2 : seules les questions communes ou correspondantes sont comparées.',
        'T6 — Sécurité : comportement identique de SAFETY_QUESTIONS, des questions de limite et des alertes pour des réponses à risque identiques.'])
    h3('11.6 Autres modules qui lisent des questions V7 retirées')
    others = Counter()
    for x in DEPS['other']:
        for c in DEPS['use'][x]: others[c] += 1
    w(table(['Module', 'Questions V7 retirées lues', 'Comportement pour un membre V8.2', 'Action d’intégration'], [
      ['Filtres de la Découverte', 'M0_Q01 (âge), M7_Q07, M7_Q36', 'M0_Q01 absente → écart d’âge par défaut de 5 ans, qui peut être plus large ou plus étroit que la plage choisie', 'Obligatoire avant tout membre V8.2 : filtre d’âge sur V82_M0_02, dans les deux sens'],
      ['Psychométrie V7', f'{others["psy"]} questions', 'dimensions V7 « information insuffisante »', 'brancher le scoring V8.2 (section 5)'],
      ['Portrait et phrases', f'{others["portrait"] + others["phrases"]} lectures', 'phrase omise si la réponse manque', 'phrases V8.2 (section 12)'],
      ['Affinités par module', f'{others["affinity"]} questions', 'module moins renseigné', 'recalcul sur les questions V8.2'],
      ['Pont V6/V7', f'{others["bridge"]} questions', 'sans effet', 'aucune']]))

    h2('12. Parcours et expérience')
    paths = RES['paths']
    w(table(['Parcours type', 'Questions affichées', 'Durée estimée', 'Séances 1 / 2 / 3'], [[k, v[0], f'≈ {v[1]} min', ' / '.join(f'{a} q. ≈ {b} min' for a, b in v[2])] for k, v in paths.items()]))
    ul(['Durées : hypothèses (7 s par item d’échelle, 6 s par item de personnalité, 14 s par choix unique, 20 s par choix multiple, 15 s par curseur), à mesurer en test ; « 21 minutes » n’est plus présenté comme un fait.',
        'Ordre : séance 1 factuelle et rapide (cadre, enfants, projet, habitudes, convictions après consentement) ; séance 2 relationnelle, alternant blocs d’échelle de 4 à 6 items et situations concrètes ; séance 3 quotidien et famille, avec le Mini-IPIP en deux blocs de 10 séparés par des situations concrètes.',
        'Matching : les premières propositions s’ouvrent quand les trois séances sont terminées (choix produit retenu : entretien intégral avant le premier vrai matching). Entre deux séances, l’écran d’accueil indique la séance suivante et sa durée.',
        'Sauvegarde automatique à chaque réponse ; reprise sur la question exacte ; retour en arrière libre ; modification ultérieure possible depuis le profil (le portrait est alors recalculé).',
        'Questions conditionnelles évaluées à partir de réponses déjà données (contrôle automatique : aucune condition ne dépend d’une question posée après elle).'])
    w(table(['Écran', 'Exemple de synthèse personnelle (non diagnostique)'], M.SUMMARY_EXAMPLES))

    h2('13. Données personnelles et droits')
    ul(['Consentement explicite (article 9 du RGPD) avant les questions sensibles, avec le mécanisme en service ; retrait = réponses masquées et exclues des calculs.',
        'Aucune réponse brute n’est montrée à l’autre membre ; seules des synthèses (accords, écarts à discuter), après la réponse des deux.',
        'Réponses de sécurité, de contrôle et indicateurs de qualité : jamais montrés à l’autre, jamais utilisés pour la publicité ou les partenaires ; les indicateurs ne quittent pas le serveur.',
        'Une réponse sensible ne devient jamais une réponse V7 non protégée par la couche de compatibilité (contrôle automatique).',
        'Droits d’accès, de rectification, d’export et d’effacement : règles en vigueur ; suppression du compte = suppression des réponses V7 et V8.2.',
        'Analyse d’impact (AIPD) à mettre à jour avant déploiement (profilage, données sensibles, nouvelle question sur le Mahr).'])

    h2('14. Intégration : prêt et à tester')
    w(table(['Élément', 'État'], [
      ['113 questions FR/EN, codes, conditions, choix multiples', 'Prêt (recette documentaire réussie)'],
      ['Règles de compatibilité (section 7), table de migration (section 10), couche de compatibilité (section 11)', 'Spécifiés et testés sur un modèle exécutable ; à coder et tester dans l’application'],
      ['Alignement du moteur en service (section 7.7) et filtre d’âge V8.2', 'À faire et tester avant tout membre V8.2'],
      ['Gabarits natifs du Sondeur pour les thèmes sans équivalent', 'À créer ; test T3 de couverture'],
      ['Mini-IPIP français, attachement, régulation, seuils, durées, indicateurs de qualité', 'Validation empirique obligatoire avant tout affichage de score'],
      ['Déploiement', 'Aucun ; version 8.2 à côté de la V7.1, un membre sur une seule version, test A/B volontaire']]))
    h3('14.1 Validation empirique prévue')
    ul(['Traduction inverse indépendante et entretiens cognitifs : 15 à 20 personnes par langue (âges, pays, religions variés).',
        'Pilote : au moins 300 répondants par langue ; distributions, non-réponses, durées réelles par écran et par séance, abandons.',
        'Fidélité : oméga par dimension (objectif ≥ 0,70 pour 4 items, sinon restitution plus prudente) ; test-retest à 2–4 semaines.',
        'Structure : analyse factorielle confirmatoire (Mini-IPIP, attachement) ; invariance FR/EN et entre sexes.',
        'Règles de compatibilité : suivi des couples (taux d’acceptation, signalements, fins de parcours) pour vérifier que les exclusions et les écarts majeurs ont un sens ; jamais présenté comme une prédiction.',
        'Aucune mention « validé scientifiquement » avant ces étapes et leur revue par un spécialiste.'])

    h2('15. Références')
    refs = [
     ('Baldasaro, R. E., Shanahan, M. J., & Bauer, D. J. (2013). Psychometric properties of the Mini-IPIP in a large, nationally representative sample of young adults. Journal of Personality Assessment, 95(1), 74–84. https://doi.org/10.1080/00223891.2012.700466', 'vérifiée (notice bibliographique)'),
     ('Brennan, K. A., Clark, C. L., & Shaver, P. R. (1998). Self-report measurement of adult attachment: An integrative overview. In J. A. Simpson & W. S. Rholes (Eds.), Attachment theory and close relationships (pp. 46–76). Guilford Press.', 'référence classique, à revérifier avant publication'),
     ('Davis, M. H. (1983). Measuring individual differences in empathy: Evidence for a multidimensional approach. Journal of Personality and Social Psychology, 44(1), 113–126.', 'référence classique'),
     ('Donnellan, M. B., Oswald, F. L., Baird, B. M., & Lucas, R. E. (2006). The Mini-IPIP scales: Tiny-yet-effective measures of the Big Five factors of personality. Psychological Assessment, 18(2), 192–203. https://pubmed.ncbi.nlm.nih.gov/16768595/', 'vérifiée (PubMed)'),
     ('Gershoff, E. T., & Grogan-Kaylor, A. (2016). Spanking and child outcomes: Old controversies and new meta-analyses. Journal of Family Psychology, 30(4), 453–469.', 'référence classique'),
     ('Goldberg, L. R., et al. (2006). The International Personality Item Pool and the future of public-domain personality measures. Journal of Research in Personality, 40(1), 84–96 ; IPIP : https://ipip.ori.org/ (domaine public ; cotation sur l’échelle Very inaccurate – Very accurate)', 'vérifiée (site IPIP)'),
     ('Gottman, J. M. (1994). What predicts divorce? Lawrence Erlbaum ; Gottman, J. M., & Levenson, R. W. (2000). The timing of divorce. Journal of Marriage and Family, 62(3), 737–745.', 'références classiques'),
     ('Gross, J. J., & John, O. P. (2003). Individual differences in two emotion regulation processes. Journal of Personality and Social Psychology, 85(2), 348–362. https://doi.org/10.1037/0022-3514.85.2.348', 'vérifiée (DOI)'),
     ('Joel, S., et al. (2020). Machine learning uncovers the most robust self-report predictors of relationship quality across 43 longitudinal couples studies. PNAS, 117(32), 19061–19071. https://doi.org/10.1073/pnas.1917036117', 'vérifiée (DOI)'),
     ('Meade, A. W., & Craig, S. B. (2012). Identifying careless responses in survey data. Psychological Methods, 17(3), 437–455.', 'vérifiée par articles citants'),
     ('Stark, E. (2007). Coercive control: How men entrap women in personal life. Oxford University Press.', 'référence classique'),
     ('Wei, M., Russell, D. W., Mallinckrodt, B., & Vogel, D. L. (2007). The Experiences in Close Relationship Scale (ECR)-Short Form. Journal of Personality Assessment, 88(2), 187–204. https://doi.org/10.1080/00223890701268041', 'vérifiée (DOI)'),
     ('Code civil, article 371-1 (rédaction issue de la loi n° 2019-721 du 10 juillet 2019 relative à l’interdiction des violences éducatives ordinaires).', 'texte de loi connu ; vérifier la rédaction en vigueur sur Légifrance avant publication'),
    ]
    for r, s in refs: w(f'<p>{e(r)} <i>[{e(s)}]</i></p>')
    return page('Spécifications V8.2', o)

# ════════════════ Rapport de validation ════════════════
def report():
    o = []; w = o.append
    R = RES['results']; ok = sum(r['ok'] for r in R)
    w('<h1>BOLIGO — Grand Entretien V8.2 : rapport de validation</h1>')
    w(f'<p>{e(DATE_FR)}. Recette documentaire et logique sur un modèle exécutable unique (questions, codes, conditions, règles, migration, compatibilité), dont sont générés les trois autres documents. Aucun test n’a été réalisé dans l’application réelle : les tests d’intégration restent à faire (section 5).</p>')
    w('<h2>1. Résultat</h2>')
    paths = RES['paths']
    w('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in [
      f'{len(R)} contrôles automatiques : {ok} réussis, {len(R) - ok} en échec.',
      f'{N} questions définitives, 11 modules, 3 séances, 24 écrans.',
      'Questions affichées : ' + ' ; '.join(f'{k} : {v[0]}' for k, v in paths.items()) + '.',
      '9 règles d’incompatibilité retenues (enfants, partenaire avec enfants mineurs, tabac, alcool, jeux d’argent, religion, dot, Mahr, religion des enfants).',
      'Migration : 36 questions reprises sous leur identifiant ; conservation automatique pour 29 d’entre elles quel que soit le code ; confirmation ou nouvelle réponse pour certains codes de 7 questions (M0_Q02, M0_Q04, M0_Q06, M0_Q11, M0_Q13, M3_Q04, M5_Q08) ; 6 questions V7 alimentent partiellement de nouvelles questions.',
      'Réponses réelles en base (2 entretiens de test) : ' + ', '.join(f'{v} {k}' for k, v in RES['migration_real'][0].items()) + '.',
      'Moteur et Sondeur : 61 questions V7 retirées encore lues (et non 31) ; 14 correspondances démontrées ; 47 sans équivalent : 8 devenues inutiles, 12 couvertes autrement, 27 pertes réelles (13 avec une question V8.2 sur le même sujet, 14 sans). Simulation sur le code en service, hors application : 0 erreur, 21 questions dans 100 % des séries, part de questions personnalisées 56 % en V8.2 contre 67 % en V7.1 (famille : 46 % contre 89 %).']) + '</ul>')
    w('<h2>2. Corrections réellement effectuées</h2>')
    w(table(['Point', 'Correction'], [
      ['A', 'Migration vérifiée sur 13 versions du code et sur la base ; M0_Q10 : aucune conversion nécessaire (C = arabe, H = espagnol depuis la V6 ; les documents décrivaient des positions d’affichage) ; table par code ; 3 statuts.'],
      ['B', 'Exclusions limitées à 9 règles explicites ; exclusivité, polygamie, vie commune, intimité, aide familiale, religion des enfants A/D et mobilité requalifiées ; règle religieuse affinée (adoption possible, religion traditionnelle, Églises différentes) ; « je préfère ne pas répondre » et absence neutres.'],
      ['C', 'Mini-IPIP sur échelle d’exactitude ; anglais conforme à l’original ; 7 traductions corrigées ; clés vérifiées ; limites et absence d’étalonnage français documentées.'],
      ['D', 'Indice des 9 paires « opposées » supprimé ; 3 indicateurs expérimentaux sans effet sur la compatibilité.'],
      ['E', 'Dot (M4_Q17, identique V7.1) et Mahr (V82_M4_08, conditionnel) séparés.'],
      ['F', 'Règles d’exclusivité et de maximum pour les 7 questions à choix multiple ; « je préfère ne pas répondre » exclusif.'],
      ['G', 'M6_Q04 rétablie ; circuit de sécurité séparé ; M8_Q20 sous l’angle du droit ; aucune étiquette.'],
      ['Autres', 'V82_M3_03 et V82_M9_04 retirées ; ordre de passation en 3 séances ; durée présentée comme hypothèse ; conditions rendues exécutables ; statut sensible aligné sur la table en service ; recensement exact des dépendances du Sondeur.']]))
    w('<h2>3. Contrôles</h2>')
    w(table(['Famille', 'Contrôle', 'Résultat'], [[r['fam'], r['name'], 'réussi' if r['ok'] else 'ÉCHEC'] for r in R]))
    w('<h2>4. Problèmes encore ouverts</h2>')
    w('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in [
      'Le moteur en service exclut encore sur la polygamie, l’aide familiale, les enfants (B/D), la religion des enfants (A/D) et les questions de violence : à aligner lors de l’intégration (spécifications, 7.7). La V7.1 en production n’est pas modifiée par ce travail.',
      'Le filtre d’âge en service lit M0_Q01 : il doit passer sur V82_M0_02 avant le premier membre V8.2.',
      '27 sujets du Sondeur sont réellement perdus pour un nouveau membre V8.2 (spécifications, 11.2) : décision attendue sur la stratégie A (nouvelles règles natives, 13 sujets) et la stratégie B (complément facultatif de 14 questions V7 reprises mot pour mot, ou perte acceptée).',
      'Décisions à confirmer : statut non sensible de M8_Q16 et M4_Q17 (avis du délégué à la protection des données) ; condition d’affichage du Mahr ; texte d’information sur la loi pour M8_Q20 selon les pays.',
      'La commande SQL de nettoyage du parcours de test Steve / Olivera reste à exécuter par vous dans Supabase (sans lien avec la V8.2).']) + '</ul>')
    w('<h2>5. Ce qui reste à valider</h2>')
    w(table(['Type', 'À faire'], [
      ['Tests d’intégration', 'Codage des règles, de la migration et de la couche de compatibilité ; tests T1 à T6 ; filtre d’âge ; alignement du moteur ; parcours en 3 séances dans l’application (sauvegarde, reprise, conditions, exclusivités) ; rendu FR/EN.'],
      ['Validation empirique', 'Traduction inverse et entretiens cognitifs ; pilote (≥ 300 par langue) ; fidélité, structure, invariance ; durées réelles ; calibrage des bandes et des indicateurs de qualité ; suivi des règles de compatibilité.'],
      ['Limites scientifiques', 'Mini-IPIP français non étalonné ; échelles d’attachement et de régulation originales et courtes ; comportements auto-déclarés (désirabilité sociale) ; règles de compatibilité fondées sur l’expertise, non sur des données ; aucun score ne prédit la réussite d’un couple.']]))
    return page('Rapport de validation V8.2', o)

OUT = {'BOLIGO_Grand_Entretien_V8_2_FINAL_FRANCAIS': questionnaire('fr'), 'BOLIGO_Grand_Entretien_V8_2_FINAL_ENGLISH': questionnaire('en'),
       'BOLIGO_V8_2_SPECIFICATIONS_TECHNIQUES_FINAL': spec(), 'BOLIGO_V8_2_RAPPORT_DE_VALIDATION': report()}
os.makedirs(os.path.join(D, 'sortie'), exist_ok=True)
for k, v in OUT.items():
    open(os.path.join(D, 'sortie', k + '.html'), 'w').write(v)
print('ok')
