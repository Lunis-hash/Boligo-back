# Questionnaire BOLIGO V6

Date : 5 octobre 2026. Ce document compare le questionnaire V5 du Drive au Grand
Entretien de l'application, puis décrit la V6 telle qu'elle est désormais
appliquée.

Le document complet, question par question, est généré depuis le code
(`npx ts-node -P tsconfig.json --transpile-only scripts/questionnaire-doc.ts`) :
- `docs/questionnaire/BOLIGO_Questionnaire_V6_FR.html` ;
- `docs/questionnaire/BOLIGO_Questionnaire_V6_EN.html`.

Les mêmes documents sont déposés dans le Drive, dossier « Questionnaire »
(`BOLIGO_Questionnaire_V6_FRANCAIS`, `BOLIGO_Questionnaire_V6_ENGLISH`). Les
fichiers V5 n'ont pas été modifiés.

## 1. Écart entre la V5 et l'application (avant la V6)

| | V5 (Drive) | Application avant la V6 |
|---|---|---|
| Questions | 102 | 77 |
| Questions de la V5 absentes de l'app | — | 33 (dont les 7 questions miroir) |
| Questions propres à l'app | — | 8 : tabac ×2, polygamie, dettes, téléphone, réconciliation, temps ensemble, divergence de projets |
| Échelles validées (plusieurs affirmations par trait) | aucune | aucune |
| « Deux D → impasse » (même réponse à risque) | prévu | non appliqué |
| Version anglaise | document seulement | aucune |
| Langue des membres dans le croisement | non | non |

Trois identifiants se contredisaient :
- `M1_Q11` : polygamie dans l'app, identité culturelle dans la V5 ;
- `M4_Q09` : dettes dans l'app, « si votre partenaire arrête de travailler » dans la V5 ;
- `M5_Q08` : téléphone dans l'app, jugement de l'entourage dans la V5.

La V6 garde les identifiants de l'application, qui sont déjà stockés dans les
réponses des membres.

## 2. Ce que la V6 ajoute (115 questions)

| Ajout | Questions | Pourquoi |
|---|---|---|
| Langues du quotidien (choix multiple) | M0_Q10 | Croisement par langue (section 4) |
| V5 rétablies | M1_Q09, M1_Q13, M1_Q15, M2_Q05, M2_Q07, M3_Q07, M4_Q07, M6_Q02, M6_Q04, M6_Q05, M6_Q08, M8_Q06, M10_Q02 | Thèmes de rupture fréquents (alimentation, transmission, famille, dot, limites, réparation) et questions miroir |
| Attachement : anxiété et évitement | M2_Q11 à M2_Q16 (deux items inversés) | Modèle de l'ECR-R, principal prédicteur des dynamiques de couple |
| Régulation émotionnelle | M2_Q17, M2_Q18 | Réévaluation et suppression (ERQ) |
| Les « quatre cavaliers » de Gottman | M6_Q12 à M6_Q15 (fréquence) | Comportements de dispute les plus prédictifs de l'usure d'un couple |
| Personnalité en cinq traits | M7_Q09 à M7_Q18 (un item inversé par trait) | Structure du BFI-10 |
| Contrôle de sincérité | M9_Q08, M9_Q09 | Repère un portrait idéalisé ; jamais montré ni pénalisé |
| Reformulées | M2_Q10, M3_Q10 | On ne demande plus d'antécédent de suivi psychologique (donnée de santé), mais l'ouverture à l'aide. Les clés gardent leur sens. |

Toutes les affirmations sont des formulations originales BOLIGO, construites sur
la structure de ces questionnaires de recherche (aucun item protégé n'est
reproduit).

**Questions V5 volontairement non reprises (20).** Elles sont déjà couvertes
par une autre question ou par une échelle, ce qui garde l'entretien sous
25 minutes :

| Question V5 | Déjà couverte par |
|---|---|
| M1_Q12 langue de l'amour | M8_Q04 |
| M1_Q11 identité culturelle | M1_Q02 et M1_Q13 |
| M1_Q07 jeûne et fêtes | M1_Q05 et M1_Q06 |
| M1_Q14 choc culturel passé | M1_Q02 |
| M2_Q09 et M10_Q08 (miroirs) | M10_Q02 et M2_Q05 |
| M3_Q06 et M4_Q10 (miroirs ex) | M6_Q02 et M2_Q05 |
| M3_Q09 parler de son passé | évitement d'attachement |
| M4_Q02 et M4_Q09 (rôles financiers) | M4_Q03 et M4_Q04 |
| M5_Q06 et M5_Q08 (famille) | M5_Q01 et M1_Q15 |
| M6_Q09 initiative intime | M6_Q06 et M6_Q07 |
| M7_Q04 routine | M7_Q05 et ouverture |
| M7_Q06 réussite à 10 ans | M7_Q01 |
| M8_Q07 amour à long terme | M8_Q01 et M8_Q02 |
| M9_Q05 ce que je peux donner | M9_Q06 |
| M10_Q05 et M10_Q07 | M10_Q09 et M10_Q04 |

Elles peuvent être ajoutées sur demande : le moteur les prend en charge sans
autre changement.

## 3. Utilisation dans le matching

- **Règles question par question** (`divergence.engine.ts`) : chaque question
  rétablie a sa règle (gravités dans le document V6).
- **Risques partagés** (`sameRisk`) : la même réponse des deux côtés peut être
  un risque. La V5 le prévoyait (« deux D → impasse ») :
  - deux silences de plusieurs jours (M6_Q01 D+D) ;
  - deux refus de s'excuser (M2_Q08 D+D) ;
  - deux réparations très lentes (M2_Q07 D+D).

  Le Sondeur a des formulations propres à ce cas : « qui fera le premier
  pas ? » plutôt que « votre différence ».
- **Psychométrie** (`src/psychometrics/psychometrics.ts`) :
  - scores 0–100 ; une échelle est notée dès que la moitié de ses items est
    renseignée ;
  - style d'attachement (sécure, anxieux, évitant, craintif) ;
  - pour un entretien antérieur, une estimation à partir des scénarios
    M2_Q01 à M2_Q03 ;
  - lectures croisées :
    - besoin d'être rassuré(e) face à besoin d'espace → majeure ;
    - reproches face à repli → majeure ;
    - repli des deux côtés → à explorer ;
    - ironie ou mépris fréquents → à explorer ;
  - poids dans les affinités : sécurité d'attachement (module 2, poids 3),
    dispute (module 6, poids 2), stabilité, bienveillance et conscience
    (module 7, poids 2).
- **Alchimie** : l'énergie recherchée (M10_Q03) est aussi comparée à la façon
  dont les amis de l'autre le décrivent (M10_Q02).

**Mesure sur des profils fictifs** (mêmes réponses V5 des deux côtés ; seules
changent les échelles V6) :

| Paire | Avant la V6 | Avec la V6 |
|---|---|---|
| Deux profils sécures, disputes constructives | 98 % | 98 % |
| Sécure face à anxieux | 98 % | 97 % |
| Anxieux qui reproche face à évitant qui se ferme | 98 % | 69 % « Compatibilité à explorer », deux divergences majeures signalées et abordées par le Sondeur |

## 4. Langue des membres

- **Croisement** : deux membres ne se voient en Découverte, et ne peuvent
  s'inviter, que s'ils partagent au moins une langue du quotidien.
  - La règle s'applique dans les deux sens, comme les autres filtres du
    Module 0 (`discover-filters.ts`).
  - « Une autre langue » seule ne filtre pas.
  - Un entretien antérieur compte comme francophone.
- **Entretien en anglais** : `GET /interview/questions/:module?lang=en`. Les
  clés de réponse sont identiques ; deux membres ayant répondu dans deux
  langues restent comparables.
  - Dans l'app, un sélecteur FR / EN apparaît dans l'en-tête du Grand
    Entretien.
  - Par défaut, la langue est celle de l'appareil.
  - Changer de langue en cours de module ne perd pas les réponses.
- **Ajouter une langue** : créer un fichier sur le modèle de
  `questions.en.ts`, le faire relire par une personne de langue maternelle et
  l'ajouter à `TRANSLATIONS`. Le test vérifie que chaque question est traduite
  avec le bon nombre d'options.
- **Hors périmètre** : le reste de l'application, les fiches rédigées et le
  Sondeur restent en français. Une application entièrement en anglais est
  l'étape suivante, si elle est validée.

## 5. Éthique : rigueur « quasi clinique », sans diagnostic

**Ce que BOLIGO reprend des questionnaires médicaux :**
- des construits validés ;
- plusieurs items par trait ;
- des items inversés ;
- des questions miroir ;
- un contrôle de sincérité.

**Ce que BOLIGO ne fait pas :**
- aucun diagnostic ;
- aucune catégorie clinique ;
- aucune donnée de santé collectée (RGPD, article 9).

**« Votre profil relationnel » (bilan) :**
- une lecture bienveillante, visible du seul membre ;
- la mention « Ce n'est pas un diagnostic » figure sous la carte.

**Ce que voient les autres membres :** uniquement les points de vigilance du
couple, au même titre que les réponses déjà comparées.

**Ce que le score ne pénalise pas :** une réponse franche sur soi (par
exemple « je me ferme parfois »). Seules les combinaisons à risque entre deux
membres comptent.

**Pourquoi le parcours reste décisif :** la recherche (Joel et al., 2020,
43 études longitudinales) montre que la dynamique propre au couple prédit
mieux la satisfaction que les profils séparés. Le score propose et le Sondeur
oriente ; la décision se construit pendant le parcours.

## 6. Membres existants

- **Entretiens terminés** : ils ne sont jamais rouverts. Le matching utilise
  l'estimation par scénarios et considère le membre comme francophone.
- **Entretiens en cours** : les questions V6 des modules déjà enregistrés sont
  posées à la reprise.
- **Durée** : environ 20 à 25 minutes au lieu de 15. Les affirmations
  d'échelle se répondent en quelques secondes.

## 7. Tests

**Serveur :**
- `src/interview/questions.v6.spec.ts` : intégrité, choix multiple,
  traduction complète ;
- `src/psychometrics/psychometrics.spec.ts` ;
- `src/matching/v6-rules.spec.ts` : risques partagés, règles rétablies,
  croisement par langue.

**Application :** `services/__tests__/interview.test.ts`.

**Parcours complet dans le navigateur :** base neuve, 63 étapes sur 63. Il
couvre :
- la bascule en anglais ;
- le choix multiple ;
- 113 questions répondues ;
- l'affichage du profil relationnel au bilan.
