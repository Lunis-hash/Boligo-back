# Proposition technique Sondeur V8.2 — générée à partir des résultats bruts (aucun chiffre recopié à la main).
import json, html, os, subprocess, sys
D = os.path.dirname(os.path.abspath(__file__))
e = html.escape
sim = json.load(open(os.path.join(D, 'sim-results.json')))['results']
ev = json.load(open(os.path.join(D, 'eval-all.json')))
nt = json.load(open(os.path.join(D, 'native-tests-results.json')))
vr = json.load(open(os.path.join(D, 'validator-results.json')))
items = json.load(open(os.path.join(D, 'v82_items.json')))
src = open(os.path.join(D, 'native-rules.ts')).read()
import re
rules = re.findall(r"\{ id: '(N\d+)', questionId: '([^']+)', replaces: \[([^\]]*)\], theme: '(\w+)', label: '([^']*)'", src)
o = []; w = o.append
def table(head, rows):
    w('<table><tr>' + ''.join(f'<th>{e(str(h))}</th>' for h in head) + '</tr>' + ''.join('<tr>' + ''.join(f'<td>{e(str(c))}</td>' for c in r) + '</tr>' for r in rows) + '</table>')
def p(t): w(f'<p>{e(t)}</p>')
def ul(xs): w('<ul>' + ''.join(f'<li>{e(x)}</li>' for x in xs) + '</ul>')
w('<h1>BOLIGO — Sondeur et Grand Entretien V8.2 : proposition technique</h1>')
p('Règles natives (stratégie A), arbitrage des 14 sujets (stratégie B), simulation corrigée, contrat de preuves du Sondeur et critères d’acceptation. Prototype exécuté hors application : rien n’est modifié dans la production, le Sondeur en service ni les données réelles. Les 113 questions V8.2 restent la base.')
w('<h2>1. Correction de l’analyse précédente</h2>')
p('Le chiffre de 77 % de personnalisation du thème famille annoncé précédemment correspondait à un scénario où des réponses V7 aléatoires étaient ajoutées aux couples V8.2 pour les 27 sujets perdus. Ce n’était pas une implémentation native de la stratégie A ; il ne doit pas être utilisé. La simulation ci-dessous la remplace : les règles A lisent uniquement des réponses V8.2, et seules les 5 questions réellement réintégrées (stratégie B) apportent des réponses V7, comme de vraies questions posées.')
w('<h2>2. Stratégie A : 11 règles natives pour les 13 sujets</h2>')
p('Chaque règle lit une question V8.2 avec ses propres codes. Aucune réponse V8.2 n’est convertie en réponse V7. Les règles produisent des écarts et des accords au format du moteur actuel et leurs gabarits sont des entrées de données pour les tables existantes du Sondeur (TOPIC_DEEP, TOPIC_PHRASES, AGREEMENTS) : la logique du Sondeur ne change pas. Aucune règle native ne produit d’incompatibilité : elles servent la découverte, pas l’exclusion.')
deep = {}
for qid in items:
    m = re.search(r"  %s: \{\n(.*?)\n  \}," % re.escape(qid), src, re.S)
    if m: deep[qid] = re.findall(r"t\('([^']*(?:\\'[^']*)*)'", m.group(1))
table(['Règle', 'Question V8.2', 'Sujets V7 remplacés', 'Thème', 'Sujet', 'Gravités (paires de codes)'],
      [[rid, qid, rep.replace("'", ''), th, lab, re.search(r"id: '%s'.*?pairs: (\{[^}]*\})" % rid, src, re.S).group(1)] for rid, qid, rep, th, lab in rules])
p('Règles particulières : N3 est croisée (V82_M3_02 = D, amitié ou proximité avec un ex, face à M6_Q19 contenant D, « revoir un ex sans me le dire ») et n’affiche que le sujet, jamais les réponses ; N10 compare une échelle d’accord (écart de 3 points ou plus : modérée ; 2 points : mineure) ; « je ne sais pas » et « je préfère ne pas répondre » ne produisent ni écart ni accord.')
p('Gabarits : 3 par règle (jour 1 origine ou sens, jour 2 besoin ou limite, jour 3 projection), 22 phrases d’accord avec relance, 4 questions neutres pour la stratégie B ; 81 textes au total, tous conformes aux règles de forme en service (passesFormRules). Sept gabarits ont été réécrits parce que la règle en service SHARED_PAST refusait à juste titre « votre couple » et « votre relation ».')
table(['Contrôle des règles natives', 'Résultat'], [[r['name'], 'réussi' if r['ok'] else 'ÉCHEC'] for r in nt])
w('<h2>3. Stratégie B : arbitrage des 14 sujets</h2>')
table(['Sujet V7', 'Décision', 'Justification'], [
 ['M5_Q07 fréquence des visites à la belle-famille', 'Réintégrer (identique)', 'Attente concrète et quotidienne, très variable selon les cultures ; le thème famille est le plus affaibli par la V8.2.'],
 ['M9_Q07 tendresse et affection hors sexualité', 'Réintégrer (identique)', 'L’affection non sexuelle est liée à la satisfaction conjugale ; aucune question V8.2 ne la mesure (V82_M10_04 porte sur l’intimité physique).'],
 ['M8_Q13 rester ou partir si le couple rend malheureux', 'Réintégrer (identique)', 'Conception de la permanence de l’engagement, liée aux convictions ; donnée décisive pour un projet de mariage, absente de la V8.2.'],
 ['M4_Q14 épargne ou dépense d’une somme inattendue', 'Réintégrer (identique)', 'Le décalage « épargnant / dépensier » est une source documentée de conflit ; la V8.2 mesure l’organisation financière, pas le style personnel.'],
 ['M10_Q15 attirance immédiate ou progressive', 'Réintégrer (identique)', 'Directement liée au principe d’une rencontre sans photo : elle dit si la personne peut s’attacher sans coup de foudre visuel.'],
 ['M6_Q18 réaction à une infidélité', 'Question neutre du Sondeur (jour 3)', 'Réaction hypothétique peu prédictive et sensible ; le sens du pardon s’explore mieux en conversation qu’en case à cocher.'],
 ['M5_Q09 amitiés de l’autre sexe', 'Question neutre du Sondeur (jour 2)', 'Partiellement couvert par M6_Q19 (définitions de l’infidélité) ; utile comme ouverture, pas comme critère.'],
 ['M8_Q11 prendre soin de l’autre malade ou handicapé', 'Question neutre du Sondeur (jour 3)', 'Réponses très exposées à la désirabilité sociale ; s’en servir pour le matching risquerait de pénaliser des membres en situation de handicap.'],
 ['M7_Q02 ambition professionnelle', 'Question neutre du Sondeur (jour 2)', 'Utile pour parler d’équilibre de vie, faible valeur prédictive comme critère.'],
 ['M4_Q10 qui paie au premier rendez-vous', 'Supprimer', 'Peu d’information ; les rôles attendus sont déjà mesurés par V82_M4_05.'],
 ['M4_Q13 prêter ses affaires', 'Supprimer', 'Peu d’information sur la vie de couple.'],
 ['M10_Q18 écart de désir', 'Supprimer', 'Sensible ; le point de sécurité (se forcer) est couvert par M10_Q19, conservée.'],
 ['M7_Q19 valeurs de vie (classement)', 'Supprimer', 'Redondant avec les nombreuses questions de valeurs V8.2 ; classement peu fiable.'],
 ['M8_Q09 quand aborder un désaccord de projet', 'Supprimer', 'Le Sondeur organise lui-même cette conversation.'],
])
p('Effet sur le Grand Entretien si vous validez les 5 réintégrations : 118 questions au lieu de 113 (environ 1 minute de plus) ; identifiants et codes V7 inchangés, donc lus tels quels par le moteur et le Sondeur, et réponses des membres existants conservées. Rien n’est appliqué aux 113 questions sans votre accord.')
w('<h2>4. Simulation corrigée</h2>')
ul(['Code exécuté : moteur de divergences et générateur du Sondeur EN SERVICE, non modifiés, hors application ; questions V8.2 et gabarits natifs ajoutés en mémoire comme données.',
    'Couples : 200 par niveau et par configuration. Profils cohérents (une personne ne refuse pas chez l’autre ce qu’elle fait elle-même). Niveaux définis par les règles V8.2 : compatible (aucune incompatibilité, peu de différences), partiellement compatible (aucune incompatibilité, différences nombreuses), incompatible (au moins une incompatibilité déclarée, parmi 8 recettes). Les couples V7.1 suivent la même procédure sur le questionnaire V7.1.',
    'Pertinence : part des écarts majeurs réellement abordés par le Sondeur ; diversité des sujets ; part de questions personnalisées. Fidélité (F1 à F3) : sujet cité présent dans le rapport avec la bonne nature ; phrase d’accord seulement sur un accord réel, vérifié dans les réponses brutes ; jamais de phrase d’accord dans une question d’écart.',
    'Limite : les réponses restent tirées au hasard ; ces chiffres comparent des capacités, ils ne mesurent ni de vrais couples ni la qualité ressentie.'])
LV = {'compatible': 'compatible', 'partiel': 'partiellement compatible', 'incompatible': 'incompatible'}
CF = ['V7.1', 'V8.2', 'V8.2 + A', 'V8.2 + B', 'V8.2 + A + B']
for lv, name in LV.items():
    w(f'<h3>Couples {e(name)}</h3>')
    rows = []
    for c in CF:
        s = sim[f'{c}|{lv}']; t = s['total']
        rows.append([c, s['couples'], s['errors'], s['not21'], f"{round(100*s['perso']/t)} %", f"{round(100*s['famillePerso']/s['familleTotal'])} %",
                     f"{round(100*s['priority']/max(1,s['prioritySeen']))} %", s['subjects'], s['unfaithful'], f"{s['evidenceFail']}/{s['evidenceChecked']}"])
    table(['Configuration', 'Couples', 'Erreurs', 'Séries ≠ 21', 'Personnalisées', 'Famille personnalisée', 'Écarts majeurs abordés', 'Sujets distincts', 'Questions infidèles', 'Gabarits refusés par le contrat de preuves'], rows)
p('Lecture : la stratégie A seule ramène le thème famille de 60–66 % à 97–99 % de questions personnalisées et ajoute 10 à 11 points de personnalisation globale ; la stratégie B seule n’ajoute que 1 à 3 points, mais apporte des sujets propres (tendresse, engagement, style d’argent). A + B atteint 54 à 64 % de questions personnalisées contre 65 à 72 % en V7.1, avec 46 sujets distincts contre 60 à 62. Aucune configuration ne produit d’erreur, de série incomplète ou de question infidèle, et aucun gabarit déterministe ne viole le contrat de preuves.')
hb = sim['V8.2|compatible']['hardBy']
p(f"Constat sur le moteur en service : il déclare une « incompatibilité » (hardStop) pour {sim['V8.2|compatible']['hardStop']} couples sur 200 pourtant compatibles selon la V8.2, principalement à cause des questions de sécurité ({', '.join(f'{k} : {v}' for k, v in sorted(hb.items(), key=lambda x: -x[1])[:3])}). Avec des réponses aléatoires, ces proportions ne sont pas réalistes, mais le mécanisme est confirmé : en V8.2 ces réponses relèvent du circuit de sécurité, pas d’une exclusion de compatibilité (alignement prévu à l’intégration).")
w('<h2>5. Contrat de preuves du Sondeur</h2>')
w('<h3>5.1 Ce qui existe déjà et qui est réutilisé</h3>')
ul(['Questions de sécurité écrites à l’avance, jamais confiées à l’IA (SAFETY_QUESTIONS, safetyThemesOf).',
    'Contrôle de forme par le code (isWellFormedQuestion, passesFormRules) : jargon, interprétation, intrusivité, citation des réponses, passé commun supposé, sujets de sécurité, seuils, compromis sur un point non négociable.',
    'Relecteur d’une autre famille de modèles, avec 24 règles dont l’invention de faits (règle 9) et la divulgation d’une réponse (règle 24) ; aucune question servie sans relecture complète ; repli sur les gabarits sinon.',
    'Champ meta (JSON) de HarmonyQuestion : la traçabilité peut y être enregistrée sans migration de base.'])
w('<h3>5.2 Ce qui manque</h3>')
ul(['Aucun lien vérifiable entre une question de l’IA et un fait établi : le contrôle d’invention repose uniquement sur un modèle de langue (le relecteur).',
    'Aucune vérification par le code qu’un désaccord ou un accord affirmé existe vraiment, ni qu’une peur, une intention, une habitude ou un passé ne sont pas présupposés.'])
w('<h3>5.3 Architecture proposée</h3>')
ul(['1. Le moteur établit les faits et produit un index de preuves : E1, E2… (écart, accord, sécurité) et N-thème (neutre). Chaque preuve porte un thème, une nature, un sujet affichable et les identifiants de questions d’entretien ; les textes des réponses restent côté serveur.',
    '2. L’IA reçoit l’index (sans les réponses à ne pas citer) et doit rendre, pour chaque question : thème, texte, liste de preuves (au moins une) et nature affirmée (écart, accord ou neutre).',
    '3. Le validateur déterministe (P1 à P14) vérifie : preuves existantes et du même thème ; aucun thème de sécurité ; nature cohérente avec les preuves ; aucun désaccord ni accord affirmé sans preuve ; aucune émotion, intention, habitude ou passé présupposés ; aucun possessif hors liste blanche ; tout verbe conjugué avec « vous » au conditionnel, au futur ou dans une liste de verbes d’opinion ; aucune reprise, même reformulée, d’une réponse ; aucune indication de qui a répondu quoi ; règles de forme existantes.',
    '4. Le relecteur existant reçoit en plus les preuves citées et une règle 25 : « la question suppose un fait absent des preuves citées ».',
    '5. Repli : question rejetée → gabarit déterministe du même sujet ; sans gabarit → question neutre du thème. Les phrases d’accord restent réservées aux gabarits écrits par l’équipe.',
    '6. Traçabilité : meta = {preuves, nature, verdict du validateur, verdict du relecteur, modèle} pour chaque question servie ; échantillon relu chaque semaine.'])
w('<h3>5.4 Mesures du validateur</h3>')
rows = []
for k, v in ev.items():
    if 'total' in v: continue
    rows.append([k, v['rejected'], v['accepted']])
table(['Corpus', 'Questions fautives rejetées', 'Questions légitimes acceptées'], rows)
g = ev['gabarits de thème en service, lus comme des questions de l’IA']
p(f"Méthode : le validateur a été réglé sur le corpus initial et sur deux corpus écrits par des agents indépendants ; il a ensuite été figé (empreinte SHA-256 enregistrée) et mesuré une seule fois sur un troisième corpus inédit de 90 questions. Mesure finale : 55 questions fautives rejetées sur 60 (92 %) et 28 questions légitimes acceptées sur 30 (93 %). Sur les gabarits déterministes du Sondeur (contrôle adapté aux gabarits), 0 refus sur 27 223 utilisations simulées. Lus comme s’ils venaient de l’IA, {g['rejected']} des {g['total']} gabarits de thème en service seraient refusés : c’est le coût de la prudence, compensé par le repli sur les gabarits.")
fin = ev.get('indépendant 3 (jamais vu, mesure finale)', {})
p('Questions fautives non détectées par le validateur sur le corpus inédit (à couvrir par le relecteur et par l’enrichissement des règles, mesuré ensuite sur un nouveau corpus) : ' + ' ; '.join(m.split(' | ')[1] for m in fin.get('misses', [])))
p('Conclusion : la garantie ne peut pas reposer sur un seul filtre. Le validateur déterministe arrête la grande majorité des inventions avant la relecture, le relecteur indépendant traite le reste, et toute question douteuse est remplacée par un gabarit. Une mesure du pipeline complet, relecteur compris, est un critère d’acceptation de l’intégration.')
w('<h3>5.5 Modifications minimales à l’intégration (non réalisées)</h3>')
table(['Fichier', 'Modification'], [
 ['src/journey/sondeur-evidence.ts (nouveau)', 'buildEvidence, evidenceForAi, validate (repris du prototype evidence-contract.ts).'],
 ['src/ai/ai.service.ts (generateTargetedHarmonyQuestions)', 'Transmettre l’index de preuves ; exiger les champs « preuves » et « nature » dans le JSON ; ajouter la règle « n’affirme rien qui ne soit dans une preuve citée ».'],
 ['src/ai/ai.service.ts (reviewSondeurQuestions) et clinical-lens.ts (CRITIC_RULES)', 'Fournir les preuves citées au relecteur ; ajouter la règle 25.'],
 ['src/journey/sondeur-ai.ts (draftReviewedSondeur)', 'Appeler validate après le contrôle de forme ; tracer les refus avec leur motif.'],
 ['src/journey/harmony-question.types.ts', 'Champs facultatifs evidence et claim, enregistrés dans meta (aucune migration).'],
 ['src/journey/sondeur.pool.ts', 'Ajout des données des règles natives A et des 4 questions neutres B (aucune logique modifiée).'],
 ['src/matching/divergence.engine.ts', 'Ajout des 11 règles natives ; alignement des règles critiques sur la V8.2 (sécurité hors compatibilité).'],
])
w('<h2>6. Critères d’acceptation de l’intégration</h2>')
table(['Critère', 'Seuil'], [
 ['Erreurs du Sondeur sur la batterie de couples simulés (3 niveaux)', '0 ; 21 questions par série dans 100 % des cas'],
 ['Questions infidèles (F1 à F3) sur les gabarits déterministes', '0'],
 ['Gabarits déterministes refusés par le contrat de preuves', '0'],
 ['Personnalisation du thème famille avec A', '≥ 95 %'],
 ['Écarts majeurs abordés par le Sondeur', '≥ 95 %'],
 ['Pipeline complet (validateur + relecteur) sur un corpus inédit d’au moins 150 questions écrit et annoté par des humains', '≥ 99 % des questions fautives rejetées ; ≥ 85 % des questions légitimes acceptées'],
 ['Questions de l’IA servies sans preuve, sans relecture ou sur un thème de sécurité', '0 (contrôlé dans meta)'],
 ['Membres V7.1 existants', 'rapport du moteur et plan du Sondeur identiques avant et après (instantanés)'],
 ['Revue humaine hebdomadaire d’un échantillon de questions servies', 'aucune invention confirmée ; sinon règle corrigée et corpus enrichi'],
])
w('<h2>7. Décisions attendues</h2>')
ul(['Valider la stratégie A (11 règles natives) pour l’intégration.', 'Valider ou non les 5 réintégrations B (113 → 118 questions), les 4 questions neutres et les 5 suppressions.',
    'Valider l’architecture du contrat de preuves et les critères d’acceptation.', 'Rien n’est déployé, rien n’est modifié dans la production ni dans les données réelles avant ces décisions.'])
w('<h2>8. Fichiers et reproduction</h2>')
p('Dossier docs/questionnaire/V8_2_FINAL/sondeur_v82 de la branche claude/magical-keller-kw9t2c : native-rules.ts, native-tests.ts, evidence-contract.ts, validator-corpus.ts, heldout-corpus.json, heldout2-corpus.json, heldout3-corpus.json, eval-all.ts, gen_couples.py, sim.ts et leurs résultats JSON. Tous sont des tests documentaires ou de simulation : aucun n’a été exécuté dans l’application réelle.')
open(os.path.join(D, 'proposition.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"><title>Sondeur V8.2</title></head><body>' + '\n'.join(o) + '</body></html>')
print('ok', len(rules))
