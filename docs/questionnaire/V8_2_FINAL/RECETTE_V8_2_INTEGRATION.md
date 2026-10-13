# BOLIGO — Recette de l'intégration V8.2 (branche de test)

Branche : `claude/magical-keller-kw9t2c` · Date : 11/10/2026
Commits : `0c35081` (moteur V7), `20d7e8c` (V8.2), `33ed05a` (contrat de preuves), `eb89704` (filtre d'âge, profil, app, recette)

Périmètre respecté : `main`, la production (Render, Supabase `hhnnsevawhhtzdffnomv`) et les données existantes n'ont pas été touchés ; aucune commande SQL sur une base réelle, aucun déploiement, aucun appel d'IA réel, aucun e-mail ni notification réels. Les tests d'intégration ont tourné sur une base PostgreSQL **locale** créée pour l'occasion (`boligo_recette_v82`), vidée à la fin de chaque exécution (0 membre restant, vérifié).

## 1. Ce qui a été livré

| Lot | Contenu | Activation |
|---|---|---|
| Moteur V7 (exclusions corrigées) | M0_Q06 B/D, M1_Q20 A/C, M4_Q16 A/D, logement (fermeté 2), religion des enfants A/D : « majeure » au lieu d'une exclusion. Écart de foi critique ramené à « majeure » si l'un se dit traditionnel, spirituel ou « autre ». | Immédiate dès la fusion (V7.1 comprise) |
| Sécurité séparée de la compatibilité | M6_Q04, M6_Q05, M6_Q24, M9_Q24 et M8_Q20 → `safetyAlerts` : jamais d'exclusion, de pénalité ni de plafond d'affinité ; libellé « Point de sécurité », jamais « Incompatibilité déclarée ». Le Sondeur garde ses questions de limite. | Immédiate dès la fusion |
| Grand Entretien V8.2 | 113 questions du modèle validé + M5_Q07, M9_Q07, M4_Q14, M10_Q15 (identiques à la V7) + **V82_M8_06** (M8_Q13 reformulée : réparation, limites, « sans violence ni danger », aide de sécurité). Total servi : **118** (117 + la reformulation). FR/EN, conditions, choix exclusifs, « Non applicable », curseurs d'âge. | `INTERVIEW_VERSION=8.2` (par défaut : 7.1) |
| Version par entretien | Un entretien commencé garde sa version ; seul un nouvel entretien suit `INTERVIEW_VERSION`. | — |
| Règles natives | N1–N11 (stratégie A), N12 enfants de l'autre, N13 Mahr, N14 exclusivité (règles du modèle V8.2), N15 (V82_M8_06). **N3 corrigée** : plus de croisement avec M6_Q19 ; comparaison du lien avec l'ex des deux membres, aucun accord affiché. | Entretiens V8.2 |
| Vue moteur V8.2 | Questions V7 reprises lues directement ; « je préfère ne pas répondre », « non applicable » et options nouvelles retirées (aucune réponse inventée) ; équivalences du modèle seulement. | Entretiens V8.2 |
| Sondeur V8.2 | Gabarits natifs (3 jours), accords (une relance par jour servi), 4 questions neutres B (servies seulement quand les deux entretiens sont en V8.2). Gabarits présupposants réécrits (dont « les liens que l'autre garde avec son passé »). | Entretiens V8.2 |
| Contrat de preuves | Index de preuves construit par le code (sans aucune réponse) transmis à l'IA ; champs `preuves`/`nature` exigés ; validateur déterministe P1–P14 avant relecture ; règle 25 du relecteur ; trace de preuves de chaque question servie dans `HarmonyQuestion.meta`. | Parcours payés (IA) ; trace pour toutes les questions |
| Découverte | Plage d'âges acceptée V8.2 (V82_M0_02) : filtre réciproque et borne de requête. | Entretiens V8.2 |
| Profil relationnel | Attachement, régulation, conflit, Mini-IPIP lus sur les échelles V8.2. | Entretiens V8.2 |
| App (`mobile-steve`) | Saisie « âge minimum – âge maximum » pour les curseurs V8.2. | Questions V8.2 |

## 2. Tests réellement exécutés et résultats

| Test | Commande | Résultat |
|---|---|---|
| Typecheck backend | `npx tsc --noEmit -p tsconfig.build.json` | OK |
| Tests unitaires backend | `npx jest src` | **1212/1212** (80 suites) ; référence `main` avant travaux : 1159/1159 |
| Non-régression V7.1 (intégration, base locale) | `npm run test:int` | **26/26** |
| Recette V8.2 (intégration, base locale, IA simulée) | `npm run test:int:v82` | **9/9** |
| Typecheck app | `npx tsc --noEmit` (mobile-steve) | OK |
| Tests app | `npx jest services` (mobile-steve) | **112/112** |
| Lint | eslint sur chaque fichier modifié, comparé à `main` | Aucune erreur ajoutée (erreurs préexistantes inchangées ou réduites) |
| Données V8.2 à jour | `python3 -I preuves/export_app.py --check` | à jour |

### Détail de la recette V8.2 (9 vérifications, services réels)
1. Sans `INTERVIEW_VERSION` : entretien V7.1 complet, aucune question V8.2.
2. `INTERVIEW_VERSION=8.2` : questions V8.2, curseurs d'âge, textes anglais (dont V82_M8_06).
3. Refus serveur : plage invalide, plages incohérentes, question V7.1 dans un entretien V8.2, « pas d'enfant » combiné.
4. Entretien V7.1 commencé : reste en V7.1 malgré le passage à 8.2.
5. Deux entretiens V8.2 complets (dont un en anglais) ; sans accord, **aucune** réponse sensible enregistrée ; carte mentale créée.
6. Réponses opposées : vraies incompatibilités déclarées, jamais tirées d'une alerte de sécurité.
7. Couple proche : écarts natifs, gifle en alerte, aucune exclusion, profil relationnel à 5 traits, invitation et parcours créés.
8. Sondeur : 21 questions, trace de preuves sur chacune, questions sans preuve ou affirmant un écart non établi **jamais** servies, `meta` jamais renvoyé aux membres.
9. Confidentialité : l'index transmis à l'IA ne contient aucune réponse ; ni e-mail ni nom de famille envoyés ; aucune réponse de sécurité citée.

### Contrat de preuves (validateur intégré, mesuré)
| Corpus | Fautives rejetées | Légitimes acceptées |
|---|---|---|
| Initial | 34/34 | 17/17 |
| Indépendant 1 (réglage) | 40/40 | 20/20 |
| Indépendant 2 (réglage) | 50/50 | 22/25 |
| **Indépendant 3 (jamais vu, figé, SHA-256 `fd74086f…`)** | **55/60** | **28/30** |

Sondeur assemblé sur 120 couples V8.2 tirés au hasard (2 520 questions) : 0 question sans preuve valide, 0 sujet absent du rapport ; 120 couples V7.1 : 0 contenu V8.2 servi.

**Aucune garantie de zéro hallucination.** Sur le corpus jamais vu, 5 questions fautives sur 60 passent le contrôle déterministe ; elles restent soumises au relecteur d'une autre famille (règle 25), dont l'efficacité réelle n'a pas été mesurée ici (aucun appel d'IA réel). 2 questions légitimes sur 30 sont écartées à tort (repli sur les gabarits).

## 3. Blocages et points restants

| # | Point | Effet | Proposition |
|---|---|---|---|
| 1 | Le Sondeur ne rédige qu'en français (limite antérieure) | Un membre anglophone reçoit un Sondeur en français | Traduire les gabarits avant d'ouvrir la V8.2 aux anglophones |
| 2 | Saisie d'âge de l'app : typecheck et test unitaire seulement | Rendu non vérifié sur appareil ou navigateur | Essai sur un build de test |
| 3 | Relecteur IA (règle 25) non testé avec un vrai modèle | Taux réel inconnu | Laboratoire IA avec budget plafonné, sur accord |
| 4 | Migration des réponses V7 vers V8.2 non implémentée | Les membres existants restent en V7.1 (voulu pour l'instant) | Implémenter `migrate()` du modèle si vous décidez de basculer les anciens |
| 5 | Indicateurs de qualité V8.2 (contradictions, réponses identiques) non branchés | Aucun effet sur le score | À brancher sur le portrait |
| 6 | Tranche d'âge idéale (V82_M0_01) non utilisée pour le classement | Seule la limite filtre | À ajouter au tri de la Découverte |
| 7 | Sujets non négociables (M8_Q12) n'aggravent pas les écarts natifs | Écarts natifs jamais rehaussés | À ajouter si souhaité |
| 8 | L'analyse envoyée à l'IA cite toujours les réponses des écarts citables (conception existante, sans sécurité ni aveu) | Inchangé | À réévaluer avec l'AIPD si vous voulez n'envoyer que l'index |
| 9 | Les correctifs du moteur V7 et la séparation de la sécurité changent les scores **V7.1** dès la fusion | Moins d'exclusions affichées | Voulu ; à annoncer à l'équipe avant fusion |

## 4. Reproduire
```
npx jest src
DATABASE_URL=postgresql://<local>@localhost:5432/<base> DIRECT_URL=… npx prisma db push --skip-generate
DATABASE_URL=… npm run test:int
DATABASE_URL=… npm run test:int:v82
cd mobile-steve && npx tsc --noEmit && npx jest services
```
Les deux recettes d'intégration refusent toute base non locale.
