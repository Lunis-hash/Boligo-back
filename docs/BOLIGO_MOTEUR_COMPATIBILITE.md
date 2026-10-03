# BOLIGO — Moteur de compatibilité et Sondeur ciblé

Branche `claude/magical-keller-kw9t2c`. Architecture hybride **déterministe + IA ultra-légère**,
coût cible < 2 € pour 1 000 parcours (zéro sans IA ; avec Groq `llama-3.1-8b-instant`
ou les modèles gratuits d'OpenRouter : quelques millièmes d'euro par parcours).

## 1. Vue d'ensemble

```
Grand Entretien (11 modules, 76 questions en banque, 60–70 posées)
        │  réponses brutes : { M0_Q06: 'A', M6_Q10: 'C', … }  (ModuleResponse.rawResponses)
        ▼
┌───────────────────────────────┐      ┌──────────────────────────────┐
│ divergence.engine.ts          │      │ compatibility.scorer.ts       │
│ règles par question (7 thèmes)│      │ cartes mentales IA            │
│ gravité : critique > majeure  │      │ valeurs/besoins (Jaccard),    │
│   > modérée > mineure         │      │ maturité, alchimie            │
│ convergences, pénalité ≤ 0,30 │      └──────────────┬───────────────┘
│ hardStop (incompatibilité)    │                     │
└──────────────┬────────────────┘                     │
               ▼                                      ▼
      score ajusté = clamp(score − pénalité, 0,20 … 0,98)   → Découverte, like, acceptation
      fiche : « Ce qui vous rassemble » / « Votre point de vigilance » / 7 thèmes
      sujets à aborder (max 3, un par thème en divergence)
               │
               ▼  (match accepté → parcours)
┌───────────────────────────────────────────────────────────────┐
│ sondeur.generator.ts — 21 questions = 3 jours × 7 thèmes        │
│ créneau (jour, thème) : divergence réelle → IA conforme → gabarit│
│ jour 1 lignes rouges · jour 2 valeurs profondes · jour 3 futur   │
│ IA facultative : ai.service.generateTargetedHarmonyQuestions()   │
│ (prompt = rapport de divergences + grille), validée par la grille│
└───────────────────────────────────────────────────────────────┘
```

## 2. Moteur de divergences (`src/matching/divergence.engine.ts`)

- **Entrée** : deux dictionnaires `questionId → clé d'option`, fusionnés sur tous les modules
  (`collectRawAnswers`). Seules les questions répondues par les deux membres comptent.
- **Règles** : 60 règles, une par question structurante, chacune rattachée à l'un des 7 thèmes
  (famille, argent & dettes, religion & spiritualité, intimité & sexualité, communication &
  émotions, projet de vie, lieu de vie & mobilité). Une règle est une table de paires d'options →
  gravité ; une réponse identique est une **convergence** (libellé dédié pour les questions clés).
- **Règles croisées** : religion (M1_Q05 × M1_Q06 : « même foi obligatoire » avec des religions
  différentes ⇒ critique) et culture (M1_Q01 × M1_Q02).
- **Gravités** : critique (désir d'enfants opposé, fidélité absolue contre « tentations »,
  monogamie contre polygamie, foi obligatoire différente), majeure (argent du couple, rôle des
  anciens, mariage religieux/optionnel, rythme d'intimité…), modérée, mineure (informative).
- **Pénalité** : critique −0,12, majeure −0,05, modérée −0,02, mineure 0, plafond 0,30.
  `hardStop = true` dès qu'une divergence critique existe : le profil reste visible (BOLIGO
  montre la différence et propose d'en parler) mais descend en bas de la Découverte et la fiche
  affiche « Incompatibilité déclarée ». HYPOTHÈSE TEMPORAIRE : l'exclusion pure est un choix
  produit à confirmer (un booléen à inverser dans `getDiscoverProfiles`).
- **Sorties** : `DivergenceReport` (divergences triées, convergences, synthèse par thème, pénalité,
  nombre de questions comparées), `buildCompatibilitySheet` (fiche), `buildDiscussionTopics`.
- **Tests** : `divergence.engine.spec.ts` (9 cas : cohérence des règles avec la banque, couverture
  des 7 thèmes, gravités, plafond, convergences, règles croisées, questions manquantes, fiche).

### Intégration

| Endroit | Effet |
|---|---|
| `GET /matching/discover` | score ajusté, tri, `positivePoints` = convergences réelles, `warningPoint` = divergence la plus grave, `compatibilitySheet`, `discussionTopics`, `hardStop`, détails lus dans l'entretien |
| `POST /matching/connect`, `accept` | `resolveCompatibilityScore` applique la même pénalité : le score enregistré sur la proposition est cohérent avec la Découverte |
| App (`mobile-steve`) | bloc « Sujets à aborder » alimenté par `discussionTopics` du serveur (repli : piliers) ; ton « divergence nette » si `hardStop` |

## 3. Sondeur ciblé (`src/journey/sondeur.generator.ts`, `journey.service.ts`)

- **Grille obligatoire** : chaque jour (7 questions) couvre les 7 thèmes ; `validateSondeurGrid`
  le vérifie. Angles : jour 1 « Lignes rouges » (non négociable ?), jour 2 « Valeurs profondes »
  (d'où vient ta position ?), jour 3 « Futur & intimité » (comment vous vivrez ce point à deux ?).
- **Priorité par créneau** : (1) divergence réelle du thème (la plus grave le jour 1, la suivante
  le jour 2…), formulée en citant les deux réponses sans dire qui a répondu quoi (la même question
  est posée aux deux membres) ; (2) question IA conforme au créneau ; (3) gabarit du thème.
  Deux variantes par gabarit : un couple qui recommence un parcours ne revoit jamais les mêmes
  textes (`avoidTexts`).
- **IA** : `generateTargetedHarmonyQuestions(rapport, grille, angles, déjàPosées)` ; fournisseur
  OpenRouter (modèles gratuits configurés) puis Groq (`GROQ_MODEL`, défaut `llama-3.1-8b-instant`).
  Le prompt ne contient que prénoms, âges et réponses : aucune coordonnée. Désactivable par
  `HARMONY_QUESTIONS_SOURCE=bank` (gabarits uniquement).
- **Plus jamais de banque générique** : l'ancienne banque de 21 questions n'est plus utilisée pour
  la génération ; elle reste disponible pour les anciens parcours (options par défaut).
- **Règle 7 questions / jour** : appliquée côté serveur (`respondToQuestion` refuse une question
  d'un jour non atteint, une double réponse, un non-membre) et côté app.
- **Tests** : `sondeur.generator.spec.ts` (6 cas : 21 questions et grille, ciblage des divergences,
  unicité et évitement, filtrage des questions IA hors grille, résumé pour l'IA sans coordonnées,
  couverture sans divergence).

## 4. Tunnel relationnel et sécurité (serveur)

| Règle | Implémentation |
|---|---|
| Chat libre | `checkProgression` : ouverture quand **les deux** membres ont répondu aux 21 questions |
| Vidéo 7 min | étape `video` (3 jours après le chat) ; salle Daily éphémère éjectant à 420 s ; `VIDEO_TEST_UNLOCK=true` uniquement pour la recette |
| Coordonnées | `getContactExchange` ne renvoie téléphone/e-mail que si `consentA && consentB` |
| Appartenance | `requireMember` sur statut, questions, messages, échange de contacts (404/403) |
| Comptes suspendus | 403 au login et à chaque requête (`jwt.strategy`) |
| Données réelles | Découverte sans repli hors périmètre ni données inventées |

## 5. Configuration (variables Render du service `Boligo-back`)

| Variable | Rôle | Valeur / état |
|---|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Supabase BOLIGO | existantes |
| `JWT_SECRET` | sessions | existante |
| `GROQ_API_KEY`, `GROQ_MODEL` | IA ultra-légère (Sondeur, modération) | clé à créer sur console.groq.com (offre gratuite) ; modèle défaut `llama-3.1-8b-instant` |
| `OPENROUTER_API_KEY` | IA alternative (modèles gratuits) | facultative |
| `HARMONY_QUESTIONS_SOURCE` | `bank` = gabarits seuls, sinon IA + gabarits | facultative |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | paiement test | **compte Stripe BOLIGO à créer** (le seul compte connecté est celui d'OWEKE, non utilisé) |
| `DAILY_API_KEY` | vidéo | **compte Daily.co BOLIGO à créer** |
| `VIDEO_TEST_UNLOCK` | recette uniquement | ne pas définir en production |

## 6. Cloisonnement BOLIGO / OWEKE — constat

| Service | État | Risque | Action recommandée |
|---|---|---|---|
| Supabase | Le projet « Lunis-hash's Project » héberge **à la fois** les tables BOLIGO (schéma `public`, 21 tables) et des schémas OWEKE (`oweke`, 11 tables ; `oweke_test`, 29 tables). RLS activé sur `public`. | Même instance, même rôle `postgres` : une fuite de credentials expose les deux projets ; quotas partagés. | Déplacer les schémas OWEKE vers le projet `oweke-staging` ou un projet dédié (pg_dump/restore), puis renommer le projet BOLIGO. Opération de production : décision humaine, non exécutée. |
| Render | Service `Boligo-back` isolé dans le projet « My project » ; services OWEKE non groupés. | confusion visuelle uniquement | renommer le projet en BOLIGO, grouper les services OWEKE à part |
| Stripe | Un seul compte connecté : OWEKE (live). | utiliser ses clés pour BOLIGO mélangerait les deux sociétés | créer un compte Stripe BOLIGO (test puis live) |
| Daily.co | aucun compte | — | créer un compte BOLIGO |
| Dépôts | `Boligo-back` + `mobile-steve/` distincts des dépôts `oweke*` | — | — |

## 7. Moteur de rédaction des fiches (`src/portrait/`)

Toutes les fiches (Découverte, match en cours, likes reçus, bilan de fin
d'entretien, onglet Profil) sont **rédigées à la lecture** à partir des
réponses structurées du Grand Entretien. Aucune donnée de membre n'est
modifiée : les fiches déjà générées, y compris les anciennes fiches tronquées,
s'affichent correctement dès la mise en ligne.

| Fichier | Rôle |
|---|---|
| `portrait.phrases.ts` | Les 11 modules (libellé, emoji, poids) et les tables de rédaction : une phrase écrite à la main par réponse. Les accords se font avec `{Il}`, `{e}` et `{masc|fem}`. |
| `portrait.text.ts` | Typographie : accords, nettoyage (virgules orphelines, « undefined », apostrophes), coupe au mot, « à Lyon » / « au Havre ». |
| `portrait.writer.ts` | `buildPortrait()` : en-tête, analyse à la 3e personne, bio à la 1re personne si la bio enregistrée est abîmée, 3 mots, valeurs, attentes, détails, bilan par module avec clarté. |
| `module-affinity.ts` | Affinités par module entre deux membres et score global. |
| `self-portrait.ts` | Fiche personnelle (bilan, `/profile/me`). |
| `../matching/match-view.ts` | Fiche vue par un autre membre, la même pour les trois écrans. |

### Exemple

> Oli, 38 ans, pilote de ligne à Écouis, aborde sa recherche avec **une exigence de clarté : les sujets importants se posent tôt**. Il cherche un **engagement officiel, le mariage**, envisagé dans les douze mois si tout va bien. Fonder une famille fait clairement partie de son projet. En couple, il recherche un équilibre entre intimité et liberté et préfère prendre du recul lors d'un désaccord, puis en reparler au calme. Sa foi chrétienne compte, et il reste ouvert à d'autres croyances. […] Ce qu'il apporte de plus précieux : **sa stabilité et sa fiabilité**, avec l'envie d'offrir la sécurité à la personne qui partagera sa vie.

### Affinités par module et score global

Pour chacun des 11 modules (0 → 10), chaque question répondue par les deux
membres donne une similarité :

| Cas | Similarité |
|---|---|
| Réponses identiques | 1 |
| Différentes mais jugées compatibles par le moteur de divergences | 0,85 |
| Différentes, question sans règle de divergence | 0,65 |
| Divergence mineure / modérée / majeure / critique | 0,72 / 0,5 / 0,25 / 0 |
| Module 10 : ce que l'un recherche (`M10_Q03`) face à ce que l'autre apporte (`M10_Q09`) | 1 si cohérent, sinon 0,5 |

Les faits personnels et les filtres déjà appliqués (origine, études, passé,
périmètre, tranche d'âge…) ne sont pas comparés.

- **Pourcentage du module** : moyenne de ces similarités, plafonnée à 64 % si
  le module contient une divergence majeure et à 35 % s'il contient une
  incompatibilité déclarée.
- **Verdict** : « Alignement fort sur … » (≥ 80), « Bonne base, avec une
  nuance : … » (≥ 65), « À explorer ensemble : … » (≥ 45), « Vigilance : … »,
  ou « Incompatibilité déclarée : … ».
- **Module sans réponse commune** : il reste affiché, sans pourcentage, avec
  « Pas encore de réponses communes sur ce module ».
- **Score global** (le cercle de Découverte) : moyenne des modules pondérée
  (critères essentiels et projet de couple ×1,5, identité ×1,3, attachement
  et communication ×1,2…). Il est plafonné à 60 % en cas d'incompatibilité
  déclarée. Il faut au moins 8 réponses comparables, sinon l'ancienne
  estimation par carte mentale sert de repli. Le cercle et les barres
  viennent donc du même calcul.

### Bilan personnel : la clarté

Le pourcentage d'un module dans le bilan est la **clarté** : la part des
questions applicables (âge, genre, dépendances) auxquelles le membre a donné
une réponse tranchée. Les réponses d'hésitation (« Je ne suis pas certain(e) »,
« Je ne sais pas vraiment »…) ne comptent pas.
