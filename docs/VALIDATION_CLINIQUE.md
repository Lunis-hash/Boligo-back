# Validation clinique du Grand Entretien BOLIGO (V7.1)

Date : 7 octobre 2026. Ce document fixe le protocole qui permettra de
vérifier, sur des données réelles, que le Grand Entretien mesure ce qu'il
prétend mesurer (validation psychométrique) et que le moteur de
divergences rend le jugement qu'un clinicien rendrait (validation
clinique). Tant que ces deux validations n'ont pas eu lieu, les seuils
(40 / 60 sur 100, 75 pour un retrait confirmé, gravités des règles) restent
des choix de raisonnement clinique, et doivent être présentés comme tels.

Outils :
- `scripts/psychometric-validation.ts` : rapport Markdown, en lecture seule ;
- `src/psychometrics/reliability.ts` : alpha, oméga, corrélations
  item-total (fonctions pures, testées) ;
- `src/psychometrics/validation-report.ts` : construction du rapport et
  garde-fous (base locale, identifiants jamais recopiés).

## 1. Garde-fous

- **Lecture seule.** Le script ne lit que les réponses brutes des entretiens
  terminés (`InterviewIA.status = termine`), dans une transaction
  `READ ONLY` : la base refuse toute écriture (vérifié sur la base locale de
  test : « cannot execute UPDATE in a read-only transaction »).
- **Base locale par défaut.** L'adresse est passée en argument, jamais lue
  dans `.env`. Une base qui n'est pas locale (localhost, 127.0.0.1, ::1 ou
  socket Unix) est refusée, sauf option `--allow-remote` donnée
  explicitement. Pour la production, on travaille de préférence sur une
  copie restaurée en local.
- **Pas de donnée personnelle.** Ni nom, ni adresse, ni identifiant de
  membre ; le rapport ne contient que des effectifs, des moyennes et des
  coefficients. Les identifiants de connexion ne sont jamais recopiés dans
  le rapport.
- **Consentement.** Les réponses aux questions sensibles (article 9) ne
  sont enregistrées qu'avec l'accord explicite du membre. Le rapport ne
  porte que sur les échelles, qui n'en contiennent pas. Toute analyse qui
  croiserait des données sensibles demande un avis du délégué à la
  protection des données et une mention dans la politique de
  confidentialité.

Usage :

```
npx ts-node -P tsconfig.json --transpile-only scripts/psychometric-validation.ts \
  postgresql://utilisateur@localhost:5432/boligo_copie --out validation.md
```

## 2. Validation psychométrique (au moins 300 entretiens V7)

### 2.1 Échantillon

- **Effectif** : au moins 300 entretiens V7 terminés, le rapport le signale
  en dessous (« échantillon insuffisant ») ; 200 par sous-groupe pour
  l'invariance (2.4).
- **Exclusions déclarées, jamais silencieuses** : entretiens acquiescents
  (d'accord avec une affirmation et son contraire sur trois échelles, ou
  toujours la même réponse) et portraits idéalisés (contrôle de sincérité)
  sont comptés, et chaque analyse est faite avec et sans eux.
- **Versions** : seules les affirmations V7 sont analysées ; les
  entretiens V6 sont comptés à part.

### 2.2 Fiabilité de chaque échelle

| Indicateur | Seuil | Si le seuil n'est pas atteint |
|---|---|---|
| Alpha de Cronbach | ≥ 0,70 | l'échelle ne produit plus de divergence ni d'observation tant qu'elle n'est pas reprise |
| Oméga (modèle à un facteur) | ≥ 0,70 | idem ; un écart alpha / oméga > 0,05 signale des affirmations hétérogènes |
| Corrélation item-total corrigée | ≥ 0,30 | l'affirmation est reformulée en premier, surtout si l'alpha monte sans elle |
| Distribution par affirmation | aucune option > 80 % | affirmation sans pouvoir de discrimination : reformuler ou retirer |
| Contradictions (direct et inversé ≥ 4) | ≤ 10 % des répondants | l'affirmation inversée est mal comprise : reformuler |

Points d'attention connus : les quatre « cavaliers » (critique, mépris,
défensive, repli) n'ont que deux affirmations chacun, et leur antidote est
un comportement distinct plutôt qu'un item inversé ; une fiabilité basse y
est attendue (sur données simulées à saturation égale, leur alpha tombe
entre 0,37 et 0,56, contre 0,80 pour les six affirmations de
l'attachement). S'ils restent sous 0,60, la règle « deux sources
concordantes » doit être maintenue et les cavaliers ne doivent jamais
décider seuls d'une divergence majeure.

### 2.3 Structure

- **Attachement** : analyse factorielle confirmatoire à deux facteurs
  (inquiétude pour le lien, inconfort avec la proximité) sur les douze
  affirmations ; ajustement attendu CFI ≥ 0,95, RMSEA ≤ 0,06. Si la
  structure à deux facteurs ne tient pas, les styles d'attachement ne sont
  plus affichés.
- **Grands traits de personnalité** : cinq facteurs ; une affirmation qui
  sature plus sur un autre trait que le sien est reprise.
- **Régulation émotionnelle** : deux facteurs (prendre du recul, retenir
  ses émotions).

Ces analyses se font avec un logiciel statistique (R, `lavaan`), à partir
d'un export anonymisé des seules affirmations ; le script fournit les
indicateurs de première ligne.

### 2.4 Invariance

Comparer la structure (configurale, métrique, scalaire) entre :
- français et anglais ;
- Afrique (de l'Ouest, centrale, de l'Est, australe), Europe, Caraïbes et
  Maghreb (région d'origine, M1_Q21, seulement pour les membres qui ont
  donné leur accord) ;
- femmes et hommes.

Une affirmation non invariante est reformulée ; tant qu'elle ne l'est pas,
les scores ne sont pas comparés entre groupes.

### 2.5 Fidélité test-retest

Cinquante volontaires repassent les échelles à trois semaines d'intervalle ;
corrélation intra-classe attendue ≥ 0,70 par échelle.

### 2.6 Recalage des seuils

- Les zones 40 / 60 (style affiché ou non) et 75 (retrait confirmé) sont
  recalées sur la distribution observée : les pôles doivent correspondre au
  tiers inférieur et au tiers supérieur de l'échantillon, à 5 points près.
  Le rapport donne pour chaque échelle la part des membres sous 40, entre
  40 et 60 et au-dessus de 60.
- Un seuil ne se recale qu'une fois, sur au moins 300 entretiens, et chaque
  recalage est daté dans `docs/QUESTIONNAIRE_V7.md` avec ses chiffres.
- Les gravités des règles ne se recalent pas sur les distributions, mais
  sur la validation clinique (section 3).

## 3. Validation clinique du moteur (50 couples, deux cliniciens)

### 3.1 Matériel

- 50 couples réels (ou des paires de membres ayant parcouru le Sondeur),
  dont au moins 10 interculturels, 10 avec un écart religieux et 10 avec
  des enfants d'une union précédente ; avec l'accord des membres.
- Pour chaque couple, les deux entretiens anonymisés (prénoms retirés,
  villes ramenées au pays), sans le rapport du moteur.

### 3.2 Cotation à l'aveugle

- Deux cliniciens (psychologue clinicien ou conseiller conjugal formé),
  indépendants, sans accès au rapport du moteur ni à la cotation de l'autre.
- Pour chacun des sept thèmes (famille, argent, communication, intimité,
  spiritualité, projet, lieu de vie) : aucune divergence, mineure, modérée,
  majeure, incompatibilité déclarée ; et pour le couple : « mise en relation
  souhaitable », « à explorer », « déconseillée ».
- Grille de cotation et exemples d'ancrage rédigés avant la cotation, sur
  cinq couples d'entraînement qui ne comptent pas.

### 3.3 Accord

- **Entre cliniciens** : kappa pondéré ≥ 0,70 par thème. En dessous, la
  grille est précisée et la cotation refaite sur de nouveaux couples.
- **Moteur et consensus des cliniciens** : kappa pondéré ≥ 0,70 sur la
  distinction « majeure ou incompatibilité » contre « modérée ou moins »,
  et aucune incompatibilité déclarée par le moteur que les deux cliniciens
  jugent « mise en relation souhaitable ».
- Chaque désaccord moteur / cliniciens est relu : règle trop sévère, trop
  clémente, ou question manquante ; les corrections sont versionnées (V7.x)
  avec un test de non-régression par cas.

### 3.4 Suivi

- Motifs de sortie des parcours (fin polie, ghosting, échange de
  coordonnées) croisés avec les divergences signalées, sans les réponses
  sensibles : une divergence qui ne prédit rien après 200 parcours est
  rétrogradée.
- Revue annuelle du protocole.

## 4. Essai sur données simulées (7 octobre 2026)

Le script a été lancé une seule fois, sur une base PostgreSQL **locale**
créée pour l'occasion (`localhost:55471/boligo_ge71_validation`), remplie de
320 entretiens simulés : un trait latent par échelle, saturation 0,68 de
chaque affirmation, 5 % de répondants « d'accord avec tout ». Résultats
(ils valident l'outil, pas le questionnaire) :

| Échelle | Affirmations | Alpha | Oméga |
|---|---|---|---|
| Inquiétude pour le lien | 6 | 0,80 | 0,81 |
| Inconfort avec la proximité | 6 | 0,80 | 0,80 |
| Prendre du recul | 3 | 0,62 | 0,64 |
| Retenir ses émotions | 3 | 0,63 | 0,65 |
| Critique / mépris / défensive / repli | 2 chacun | 0,37 à 0,56 | 0,37 à 0,56 |
| Grands traits (3 ou 4 affirmations) | 3–4 | 0,61 à 0,70 | 0,62 à 0,70 |
| Contrôle de sincérité | 5 | 0,73 | 0,73 |

Lecture : à saturation égale, la fiabilité dépend surtout du nombre
d'affirmations (Spearman-Brown). Les échelles à deux ou trois affirmations
n'atteindront 0,70 que si leurs affirmations sont nettement plus saturées
que dans la simulation ; c'est la première chose à vérifier sur données
réelles. Acquiescement repéré : 8 % (dont les 5 % simulés), portrait
idéalisé : 13 %.
