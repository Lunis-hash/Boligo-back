# BOLIGO — Audit métier : Grand Entretien, Découverte, tunnel relationnel, modération, vidéo

Date : 2026-10-01. Sources auditées : `Boligo-back` `main` (`e58a986`) et la copie mobile
`mobile-steve/`. Chaque constat indique ce qui a été **fait** (app) ou **proposé** (backend,
`docs/backend-proposals/`).

## 1. Jalon 2 — Le Grand Entretien (11 modules)

### 1.1 Existant

| Module | Thème | Questions | Couverture |
|---|---|---|---|
| 0 | Filtres non négociables | 7 (dont `M0_Q02` périmètre, désormais prise à l'inscription) | âge, mobilité, situation, enfants (actuels / souhaités), études |
| 1 | Identité & culture | 8 | origine, culture du partenaire, traditions, religion et son impact, langue, place des anciens |
| 2 | Attachement & régulation émotionnelle | 7 | style d'attachement, besoin, peur, colère, excuses, thérapie |
| 3 | Vécu & contexte | 7 (2 conditionnelles ≥ 35 ans) | leçons, rupture, ex, famille recomposée, violence, schémas |
| 4 | Vision économique | 6 (1 conditionnelle par origine) | argent du couple, rôles économiques, famille élargie, immobilier, épargne |
| 5 | Dynamique sociale & familiale | 6 | famille, belle-famille, amis, réseaux sociaux |
| 6 | Quotidien, communication, limites | 5 | dispute, dernier mot, sexualité (2), fidélité |
| 7 | Trajectoire & personnalité | 5 | 5 ans, ambition, intro/extraversion, changement, lieu de vie |
| 8 | Projet de couple | 6 | objectif, délai, mariage, langage de l'amour, ruptures non négociables (2) |
| 9 | Pouvoir, effort, capacité à aimer | 6 | décisions, effort, comptabilité affective, frustration, sacrifice, tendresse |
| 10 | Alchimie, vibe, désir | 6 | présence, énergie recherchée, humour, attirance, apport unique, mot-clé |

69 questions en banque, 60 à 63 posées selon l'âge, le genre et l'origine (règles `minAge`,
`maxAge`, `dependsOn`). Le ton est bienveillant, les options sont concrètes et mutuellement
exclusives. Les réponses alimentent la carte mentale IA (synthèse, bio, besoins, valeurs, lignes
rouges, 6 piliers) puis le score de compatibilité.

### 1.2 Manques identifiés

| Axe | Constat | Proposition (patch `interview-questions-enrichment.patch`) |
|---|---|---|
| Deal-breakers de mode de vie | tabac / alcool / substances jamais abordés, première cause de refus déclarée dans les apps de rencontre sérieuses | `M0_Q08` |
| Valeurs fondamentales | la polygamie, structurante pour une partie du public ciblé (modules culture/religion), n'est pas posée ; `M6_Q10` ne l'évoque qu'en creux | `M1_Q11` (formulation respectueuse, option « en parler en personne ») |
| Projet de vie / finances | transparence sur les dettes absente alors que `M4` couvre l'argent du quotidien | `M4_Q09` |
| Confiance / jalousie | accès au téléphone du partenaire, source majeure de conflit, absent (`M5_Q05` ne couvre que les réseaux) | `M5_Q08` |
| Style de communication | trois questions sur l'expression de la colère/frustration (`M2_Q06`, `M6_Q01`, `M9_Q04`) mais rien sur la **réparation** après conflit | `M6_Q11` |
| Rythme de vie | temps souhaité ensemble / séparément non mesuré (`M2_Q03` effleure) | `M7_Q08` |
| Capacité de dialogue sur les divergences | aucune question ne teste comment la personne gère un désaccord de projet de vie, objectif central de BOLIGO | `M8_Q09` |
| Qualité | coquille « m'excluser » (`M2_Q08`) | corrigée |

Sept questions ajoutées (+10 %), aucune retirée : l'entretien passe à 67–70 questions posées, ce
qui reste dans la fourchette actuelle d'expérience (une question ≈ 10 s). Le prompt IA de carte
mentale décrit « 4 modules » alors qu'il y en a 11 (`ai.service.ts`, directives bio) : à aligner
lors de l'application du patch (mention dans `docs/BACKEND_ISSUES.md`).

## 2. Jalon 3 — Découverte et compatibilité

### 2.1 Algorithme (backend `matching.service.ts`, `compatibility.scorer.ts`)

1. Règle d'or : un seul match actif ; tout profil en parcours ou en invitation est retiré.
2. Filtres **stricts** du Module 0 (tranche d'âge `M0_Q01`, périmètre `M0_Q02`) sur le genre opposé.
3. Score = 0,32 × similarité des valeurs + 0,28 × similarité des besoins + 0,14 × alignement maturité
   + 0,14 × alignement alchimie + 0,12 × vibe − pénalité lignes rouges ; borné 35–98 %.
   Les listes de valeurs/besoins viennent de la carte mentale IA (Jaccard sur les libellés).
4. Tri décroissant ; les piliers affichés (valeurs, attachement, projet, vécu, mode de vie) sont
   dérivés du score, bornés 50–99 %.
5. Like = `POST /matching/connect` (score recalculé depuis les cartes mentales), match = acceptation.

**Cohérence métier** : le like et le match reposent bien sur les cartes mentales issues de
l'entretien, pas sur des photos (il n'y en a pas) ni sur la géolocalisation.

### 2.2 Écarts constatés

| Constat | Gravité | Traitement |
|---|---|---|
| Si les filtres du Module 0 ne laissent aucun candidat, le backend **repliait sur tous les profils** (hors périmètre, hors tranche d'âge) | P1 métier | patch `discover-strict-filters-real-details.patch` : filtres stricts, état vide dans l'app |
| Données **inventées** quand elles manquent : situation « Célibataire », enfants par parité d'index, études « Bac +5 », distance « ~3 km × index », « nuance de rythme » fictive, profession « Cadre / Ingénieure » | P1 confiance | même patch : détails lus dans les réponses `M0_Q04/05/06/07`, `M1_Q05`, point de vigilance issu du score ; app : distance jamais affichée (`discover.tsx`) |
| Le score ignore les critères durs explicites (enfants souhaités vs refus définitif, « même foi obligatoire » vs autre religion, fidélité, délai d'engagement) : un couple incompatible sur ces points peut afficher 70 % | P2 évolution | documenté ci-dessous (§ 2.3), à implémenter côté backend après validation produit |
| Les piliers sont bornés à 50 % minimum : une divergence forte reste lisible mais atténuée | P3 | l'app traite « ≤ 50 % » comme divergence majeure |

### 2.3 Évolution livrée : divergences → dialogue (app)

Nouveau bloc **« Sujets à aborder »** dans la Découverte (`services/compatibility.ts`,
`app/(tabs)/discover.tsx`) : chaque pilier sous 60 % devient un sujet avec une question d'ouverture
(valeurs et culture, façon d'aimer, projet de vie et famille, vécu, mode de vie et argent), trois
sujets maximum, du plus faible au moins faible ; si seul le score global est bas, un sujet générique
est proposé. Au-dessus de 55 % de score global et sans pilier ≤ 50 %, le ton reste « différences à
explorer » ; sinon « vos profils divergent nettement… parlez-en franchement dès le Sondeur ».
Rien n'est masqué : BOLIGO montre la différence et propose d'en parler, à l'opposé du swipe.

**Livré ensuite côté backend (branche `claude/magical-keller-kw9t2c`)** : le moteur de divergences
déterministe (`src/matching/divergence.engine.ts`, 60 règles sur 7 thèmes, gravité, convergences,
pénalité de score, `hardStop`) alimente la Découverte (`compatibilitySheet`, `discussionTopics`),
le score enregistré au like/acceptation, et le Sondeur ciblé (`src/journey/sondeur.generator.ts`,
3 jours × 7 thèmes, IA Groq/OpenRouter facultative, gabarits personnalisés, plus jamais de banque
générique). L'app affiche en priorité les sujets calculés par le serveur. Détail :
`Boligo-back/docs/BOLIGO_MOTEUR_COMPATIBILITE.md`.

## 3. Jalon 5 — Tunnel relationnel

| Règle produit | Backend | App | Statut |
|---|---|---|---|
| 21 questions, 7 par jour, 3 jours | 21 générées (IA personnalisée à partir des deux cartes mentales, sinon banque), `day` 1–3, `currentDay` calendaire dans `GET /journey/:id/status` | **avant** : les 3 journées pouvaient être répondues d'une traite ; **maintenant** : une journée s'ouvre si la précédente est répondue **et** si le jour calendaire est atteint (`services/sondeur.ts`, « Disponible demain ») | ✅ app · patch backend `sondeur-day-gating.patch` (le serveur acceptait tout) |
| Chat libre quand les **deux** ont tout répondu | `checkProgression` : les deux × 21 ⇒ `chat_libre` | onglet Matchs → CTA messagerie | ✅ vérifié E2E |
| Chat libre → vidéo après 3 jours | `autoAdvanceStaleJourneys` | affichage de l'étape | ✅ code |
| Règle de justice (anti-ghosting) | 48 h sans réponse / message ⇒ parcours clos, crédit de la victime remboursé | — | ✅ code |
| Questions de scénarios selon les divergences | prompt IA : « exploite les lignes rouges pour choisir l'angle le plus risqué entre ces deux profils », jour 1 lignes rouges, jour 2 valeurs, jour 3 futur et intimité ; en repli banque : questions génériques | — | ✅ quand l'IA est configurée (`OPENROUTER_API_KEY`) ; en mode banque, non personnalisé (documenté) |
| Double consentement avant les coordonnées | `exchangeContact` : `consentA && consentB` ⇒ `termine` | carte « Échanger vos contacts ? », coordonnées révélées uniquement si `bothAccepted` | ✅ app (E2E) · ⚠ backend : `GET /journey/:id/contact-exchange` renvoie encore téléphone/e-mail avant consentement (`docs/BACKEND_ISSUES.md`) |

## 4. Jalon 6 — Modération et vidéo

| Contrôle | Résultat |
|---|---|
| Filtrage avant envoi (app) | `services/chatModeration.ts` : grossièretés bloquées localement, preuve E2E (message « ferme la connard » refusé) |
| Modération serveur | règles locales (`chat-moderation.ts`) + Groq pour les messages longs / à risque ; `POST /journey/respond` et `/journey/message` ⇒ 400 (recette API : 2 contrôles OK) |
| Signalement | `POST /report` ⇒ 201 (recette API OK) |
| Statuts de compte | **non appliqués** : un compte `suspendu` se connecte (200) et appelle l'API (200), prouvé sur le backend local ⇒ patch `account-status-enforcement.patch` (403 au login et à la validation du JWT) ; app : message « Votre compte est suspendu… » |
| Appel vidéo | 2 minutes (`VIDEO_CALL_MAX_SECONDS`), autorisé à l'étape `video` (ou en `chat_libre` avec `VIDEO_TEST_UNLOCK=true`), salle Daily éphémère avec éjection à 120 s, repli Jitsi sans clé ; fin d'appel ≥ 10 s ⇒ `echange_contacts` ; minuteur et fin automatique côté app (`video-call.tsx`) |
| Compte Daily.co | à créer par le propriétaire (voir `docs/DEPLOIEMENT.md` § 6) |

## 5. Jalon 4 — Modèle économique

- Backend : une seule formule, `parcours_harmonie`, 1 500 centimes, 1 crédit (`payment.service.ts`).
- App : `selectHarmoniePlan()` ne garde que cette formule même si le backend en exposait d'autres ;
  textes et visuels alignés (« 1 crédit · paiement unique · sans abonnement ») ; aucun crédit ajouté
  localement (webhook Stripe ou code promo, puis `GET /credit/balance`).
- Clés : `pk_test_…` dans `eas.json` (profils de test), `sk_test_…` et `whsec_…` à renseigner sur
  Render (non lisibles depuis cette session, connecteur Stripe non autorisé).
