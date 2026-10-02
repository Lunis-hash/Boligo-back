# Rapport de mission — application mobile BOLIGO (« Boligo - STEVE »)

Ce dossier `mobile-steve/` contient la copie de travail **indépendante** de l'application
mobile BOLIGO (Expo / React Native), avec son historique Git complet, corrigée, testée et documentée.
Il est déposé ici (branche `claude/magical-keller-kw9t2c` de `Boligo-back`) parce que la création du
dépôt GitHub `Boligo-STEVE` a été refusée par l'intégration (HTTP 403 : « Resource not accessible by
integration » / « sessions are bound to their configured repositories »). **Aucun fichier de `Boligo-back`
n'est modifié** par cette branche en dehors de ce dossier et de ce rapport.

## 1. Source identifiée

| Preuve | Valeur |
|---|---|
| Dépôt | `Lunis-hash/oweke`, racine = application Expo `harmonie-expo-starter` (commit `432b66d`, 2026-08-24) |
| `app.json` | `Harmonie` / `harmonie-expo` / `com.harmonie.app`, plugins `expo-router`, Stripe, SecureStore |
| `eas.json` | `EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api` |
| Code | routes `interview/`, `discover`, Sondeur, parcours Harmonie ; événements Socket.IO du `ChatGateway` |

`Boligo-Website` est le site vitrine (Next.js) ; son README mentionne un dossier `project/` Expo qui n'existe plus.
Le dépôt `oweke` mélangeait l'app mobile et un site Next.js OWEKE sans rapport : seul le mobile a été conservé.

## 2. Transplanter vers un dépôt `Boligo-STEVE`

```bash
# depuis un clone de Boligo-back sur cette branche
git subtree split --prefix=mobile-steve -b boligo-steve
git push git@github.com:Lunis-hash/Boligo-STEVE.git boligo-steve:main
```

Le sous-arbre conserve l'historique d'origine (`432b66d` et antérieurs) suivi des commits de la mission.

## 3. Ce qui a été fait

Voir `mobile-steve/docs/JOURNAL_RECETTE.md` (22 constats, priorité, preuve, commit correctif),
`mobile-steve/docs/ARCHITECTURE.md`, `mobile-steve/docs/API_AUDIT.md`, `mobile-steve/docs/E2E_RESULTATS.md`
et les captures `mobile-steve/docs/screenshots/`.

Corrections principales (commits atomiques, messages conventionnels) :

| Priorité | Domaine | Commit |
|---|---|---|
| P0 | installation reproductible, extraction du dépôt mélangé | `dbb404f`, `1f61545` |
| P0 | session sécurisée, refresh JWT, erreurs lisibles, plus de tokens dans les logs | `806ebcf` |
| P0 | socket authentifié, événements alignés sur le gateway, contacts révélés seulement après double consentement | `4fc69f9` |
| P0 | suppression de la connexion sociale simulée et des écrans morts, ajout mot de passe oublié / réinitialisation | `0b27b4e`, `6983211` |
| P0 | entretien : reprise correcte, module 10 posé, modules vides tolérés | `2472946` |
| P0 | crédits : solde backend seule source de vérité ; paiement : formules du backend, plus de crédit local | `060b71a`, `9a64fd8` |
| P0 (web) | résolution de l'URL API sûre sur le web | `0275522` |
| P1 | fin d'appel vidéo alignée sur le backend ; token push enregistré ; navigation depuis une notification | `eac4ecf`, `66fe9a1`, `75ab531` |
| P1 | périmètre de rencontre envoyé à l'inscription ; Sondeur : refus de modération affiché | `5a0ef4c`, `225b685` |
| P1 | profil : envoi des seuls champs modifiés ; carrousel d'accueil et étapes d'inscription | `5f71525`, `cd80bd9`, `4e5e568` |
| P2 | marges de barre d'état via safe-area ; `Alert` sur le web ; lint | `b9ecf63`, `daa89b1`, `779aaec` |
| Tests | Jest (8 suites, 33 tests), recette API (`scripts/backend-flow-smoke.js`), recette navigateur Playwright | `59fe0e0`, `82d1dfd`, `daa89b1` |

## 4. Résultats de recette

| Vérification | Résultat |
|---|---|
| `npm ci` / `npm run typecheck` / `npm run lint` | OK / 0 erreur / 0 erreur (69 avertissements hérités) |
| `npm test` | 8 suites, 33 tests OK |
| Recette API contre backend local (base vide) | 60/64 — les 4 échecs sont des bugs backend documentés |
| Recette navigateur (parcours complet, 390×844 + 360×640 + 768×1024) | **44/44 étapes OK** (`mobile-steve/docs/E2E_RESULTATS.md`) |

La production (Render, Supabase, Stripe) n'a été utilisée **qu'en lecture** ; aucun paiement, aucune donnée
client, aucune notification ou e-mail réel n'a été déclenché.

## 5. Points d'attention hors périmètre mobile (à traiter côté backend / infra)

Détail, preuves et corrections proposées : `mobile-steve/docs/BACKEND_ISSUES.md`.

1. **`Boligo-back` `main` ne compile pas** (`src/admin/admin.service.ts`) : les 3 derniers déploiements Render
   sont en `build_failed`, la production tourne toujours sur `0046ad8`.
2. **Sécurité** : IDOR sur `GET /journey/:id/*` ; contacts du partenaire renvoyés sans consentement ;
   `POST /credit/add` ouvert ; `connect`/`accept` ne débitent rien ; `otpDebugCode` renvoyé et code `1234`
   accepté en production ; `push-token` renvoie l'objet `User` complet (hash du mot de passe inclus) ;
   connexion sociale créant un compte sur simple `profile`.
3. **Supabase** : RLS désactivé sur les 20 tables (avis critique du tableau de bord).
4. **Secrets** : `eas.json` embarque une clé **publiable** Stripe de test dans le profil `production`
   (non secrète, mais à remplacer par la clé live via variable EAS). Aucun secret n'est reproduit dans les rapports.

## 6. Hypothèses temporaires

Listées dans `mobile-steve/docs/JOURNAL_RECETTE.md` § 4 (débit du crédit au like côté app tant que le backend
ne le fait pas ; crédit débité avant d'accepter un like reçu ; paiement carte et vidéo indisponibles sur le web).

---

## 7. Phase 2 — Produit fini, hébergement bas coût et flux métier (2026-10-01)

Cahier des charges « BOLIGO (Mobile & Web) », six jalons. Détail : `mobile-steve/docs/DEPLOIEMENT.md`
(architecture et mode d'emploi), `mobile-steve/docs/AUDIT_METIER.md` (entretien, découverte, tunnel
relationnel, modération, vidéo, modèle économique), `mobile-steve/docs/backend-proposals/` (patchs).

| Jalon | Fait | Reste à faire (humain) |
|---|---|---|
| 1. Hébergement | **RLS activé sur les 20 tables Supabase** (migration `enable_rls_boligo_tables`, backend non affecté : rôle propriétaire). Base Render bannie, tout repose sur Supabase. Cold start : réveil du serveur au lancement de l'app + message d'attente. Arborescence : `mobile-steve/` + README. | Créer le Static Site Render `boligo-web` (réglages prêts, § 3.2 de DEPLOIEMENT.md ; la création par API a été refusée par la politique de permissions). Appliquer `admin-service-build-fix.patch` pour que `main` redéploie. |
| 2. Grand Entretien | 69 questions / 11 modules auditées : bonne couverture valeurs, projet, communication, lignes rouges. 7 questions ciblées proposées (substances, polygamie, dettes, confiance/téléphone, réconciliation, temps ensemble, gestion des divergences) + coquille. | Relire et appliquer `interview-questions-enrichment.patch` (décision produit sur la question polygamie). |
| 3. Découverte | Score et filtres audités : like/match reposent sur les cartes mentales issues de l'entretien. App : nouveau bloc **« Sujets à aborder »** (piliers faibles → questions d'ouverture), distance inventée supprimée. | Appliquer `discover-strict-filters-real-details.patch` (fin du repli hors périmètre, fin des données inventées). Décider des critères durs (enfants, religion, fidélité). |
| 4. Modèle économique | Formule unique « Parcours Harmonie » 15 € / 1 crédit verrouillée côté app ; crédit validé par le serveur ; dépendance Supabase inutile retirée ; `pk_test` dans les profils de test. | Renseigner `STRIPE_SECRET_KEY` (`sk_test`) et `STRIPE_WEBHOOK_SECRET` sur Render ; clé live en production via EAS. |
| 5. Tunnel relationnel | **7 questions par jour pendant 3 jours appliqué dans l'app** (ouverture calendaire, « Disponible demain »), chat libre après réponses des deux, chat → vidéo après 3 jours, règle de justice, double consentement : vérifiés. Questions de scénarios : IA personnalisée à partir des deux profils quand `OPENROUTER_API_KEY` est configurée. | Appliquer `sondeur-day-gating.patch` (le serveur acceptait les 21 réponses d'une traite). |
| 6. Modération & vidéo | Filtrage avant envoi, modération serveur, signalement : testés. **Un compte suspendu peut encore se connecter** (prouvé) → patch `account-status-enforcement.patch`, message clair dans l'app. Vidéo : 2 minutes, Daily éphémère avec éjection à 120 s, repli Jitsi, tempo vérifié. | Créer le compte Daily.co et renseigner `DAILY_API_KEY` sur Render (inscription humaine requise). |

Recette de non-régression après cette phase : typecheck 0 erreur, lint 0 erreur, Jest 10 suites / 44 tests,
recette navigateur **47/47 étapes OK** (`mobile-steve/docs/E2E_RESULTATS.md`).

Commits de la phase (dans `mobile-steve/`) : `25b1bad` paiement, `8b94648` Sondeur calendaire,
`1ce0065` sujets à aborder, `dc86921` réveil du serveur, puis tests, documentation et patchs.

---

## 8. Phase 3 — Cœur de BOLIGO : moteur de compatibilité, Sondeur ciblé, cloisonnement (2026-10-02)

Mission « Architecte Full-Stack & psychologie relationnelle ». Le code backend est commité sur **cette
branche** (`claude/magical-keller-kw9t2c`), jamais sur `main` : aucun déploiement de production n'a eu lieu.
Détail technique : `docs/BOLIGO_MOTEUR_COMPATIBILITE.md`.

### Livré

| Jalon | Réalisé | Commits |
|---|---|---|
| 1. Cloisonnement | **Constat** : le projet Supabase BOLIGO héberge aussi les schémas OWEKE (`oweke` 11 tables, `oweke_test` 29 tables) ; un seul compte Stripe connecté, celui d'OWEKE (live) ; aucun compte Daily. Aucune clé OWEKE n'a été utilisée pour BOLIGO. RLS déjà actif sur les tables BOLIGO. Variables documentées. | — |
| 2. Moteur de divergences | `src/matching/divergence.engine.ts` : 60 règles sur 7 thèmes, gravité critique/majeure/modérée/mineure, convergences, pénalité ≤ 0,30, `hardStop` ; fiches « Ce qui vous rassemble / Votre point de vigilance » ; score cohérent Découverte ↔ like/acceptation ; 9 tests. | `16297e0` |
| 3. Sondeur ciblé | `src/journey/sondeur.generator.ts` : 21 questions = 3 jours × 7 thèmes (grille vérifiée), ciblage des divergences réelles, 2 variantes de gabarits, couche IA facultative (OpenRouter gratuit puis Groq `llama-3.1-8b-instant`) validée par la grille ; plus jamais de banque générique ; 6 tests. | `4bd31c4` |
| 4. Tunnel & sécurité | Comptes suspendus refusés (403), règle 7 questions/jour et appartenance au parcours côté serveur, coordonnées uniquement après double consentement, routes `/journey/:id/*` sous contrôle d'appartenance, Découverte sans repli ni données inventées, 7 questions d'entretien ajoutées. | `3e50a6e`, `384757f`, `d1262e5`, `73ec406`, `4bd31c4` |
| Build | `main` ne compilait pas (`admin.service.ts`) et un cache `tsconfig.build.tsbuildinfo` versionné faisait sauter l'émission du module Prisma sur un clone frais : les deux corrigés. | `dde576a`, `6adbfb4`, `51831e4` |
| Divers | `chat/unread-count` lisait un champ inexistant (toujours 0). | `134833b` |

### Qualité

| Vérification | Résultat |
|---|---|
| Backend `tsc -p tsconfig.build.json` | 0 erreur |
| Backend Jest | 10 suites, 52 tests OK (dont moteur et Sondeur) |
| Backend ESLint | nouveaux fichiers : 0 erreur ; le reste du dépôt porte 1 300+ erreurs de style préexistantes (prettier, `any`), non traitées |
| App `tsc` / lint / Jest | 0 erreur / 0 erreur / 11 suites, 48 tests |
| Recette API (`scripts/backend-flow-smoke.js`) | 64/67 — 2 écarts préexistants sur `interview/status` (module 0 pré-rempli par le périmètre) et `unread-count` corrigé après la mesure |
| Recette navigateur | **47/47 étapes OK** contre le backend reconstruit (règle calendaire serveur, moteur, routes durcies) |

### Reste à votre main

1. Séparer les bases : déplacer les schémas `oweke*` hors du projet Supabase BOLIGO (ou BOLIGO vers un projet dédié) ; opération de production, non exécutée.
2. Créer le compte Stripe BOLIGO (test) et le compte Daily.co BOLIGO ; renseigner `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `DAILY_API_KEY` sur Render. Créer une clé Groq gratuite (`GROQ_API_KEY`) pour la couche IA.
3. Fusionner cette branche dans `main` quand vous le décidez : Render redéploiera (build corrigé). Créer le Static Site `boligo-web`.

---

## 9. Complément — Configuration Expo BOLIGO, Expo Go, export web (2026-10-02)

| Point | Réalisé |
|---|---|
| Identité Expo | `app.json` : `BOLIGO` / slug `boligo` / scheme `boligo` / `com.boligo.app` (iOS et Android), marchand Stripe `merchant.com.boligo.app` ; plus aucune référence à « Harmonie » ni à un autre projet ; identifiant EAS de l'ancien projet retiré (`eas init` en crée un propre). `eas.json` : profils `development`, `preview`, `production` pointant vers l'API Render BOLIGO avec la clé publiable Stripe de test ; `.env.example` ; `render.yaml` pour le Static Site. Commit `982b776`. |
| Expo Go | Dépendances natives vérifiées sur la documentation Expo SDK 54 : Stripe, WebView, SecureStore, Camera, AV, SVG inclus dans Expo Go (Apple Pay / Google Pay et notifications push distantes nécessitent un development build ; l'app ne bloque pas sans elles). `expo-doctor` : 16/18 contrôles, les 2 restants sont des accès réseau refusés par le conteneur. Le test physique sur téléphone reste à faire par vous (`npx expo start`, QR code). |
| Routage et écrans | Export web validé : routes profondes `/`, `/login`, `/onboarding/value-slides`, `/legal/cgu`, `/legal/confidentialite`, `/forgot-password` servies avec le titre « BOLIGO », sans erreur JavaScript, sans débordement horizontal à 390, 768 et 1280 px (un débordement sur `/login` a été trouvé et corrigé : photo de fond agrandie non rognée). Parcours complet rejoué dans Chromium : **47/47 étapes OK** (bundle BOLIGO, backend reconstruit). |
| Export statique | `npx expo export --platform web` → `dist/`, `404.html` de secours, règle de réécriture `/*` → `/index.html` documentée pour Render (`DEPLOIEMENT.md` § 3.2, `render.yaml`). |
| Qualité | App : `tsc` 0 erreur, `expo lint` 0 erreur, Jest 11 suites / 48 tests. Backend : `tsc` 0 erreur, Jest 10 suites / 52 tests, recette API 66/68 (les 2 écarts restants : `interview/status` pré-remplit le module 0 avec le périmètre choisi à l'inscription, comportement voulu du backend). |

### Lancer l'app sur votre téléphone (Expo Go)

```bash
git clone -b claude/magical-keller-kw9t2c https://github.com/Lunis-hash/Boligo-back
cd Boligo-back/mobile-steve
npm ci
cp .env.example .env          # API Render BOLIGO + clé publiable Stripe de test
npx expo start                # ou npx expo start --tunnel
```

Scanner le QR code avec Expo Go. Compte de test : inscription dans l'app, code OTP `1234` tant que le
backend de production tourne avec le code passe-partout ; crédit via le code promo `BOLIGO100`.
Attention : la production Render tourne encore sur l'ancien build (`0046ad8`) tant que cette branche
n'est pas fusionnée dans `main` ; certains écrans (paiement, Sondeur ciblé, règles serveur) ne refléteront
les correctifs qu'après fusion et redéploiement.
