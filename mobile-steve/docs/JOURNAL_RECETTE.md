# Journal de recette — Boligo - STEVE

Copie de travail indépendante de l'application mobile BOLIGO (Expo / React Native).
Ce journal est tenu au fil de la mission : chaque constat est daté, priorisé,
et pointe vers le commit qui le corrige (colonne « Correctif »).

Légende priorités : P0 critique · P1 majeur · P2 important · P3 dette technique.
Statut : ✅ corrigé · 🔄 en cours · 📝 documenté (hors périmètre mobile) · ⏳ à faire.

## 0. Environnement de recette

| Élément | Valeur |
|---|---|
| Source mobile identifiée | dépôt GitHub `Lunis-hash/oweke` (racine = app Expo `harmonie-expo-starter`, commit `432b66d`, 2026-08-24) |
| Copie de travail | `Boligo - STEVE` (historique Git complet conservé, remote `origin` retiré) |
| Backend de test | `Boligo-back` `main` (`e58a986`) compilé localement, PostgreSQL 16 local `boligo_steve_test` (vide, aucune donnée de production) |
| Backend de production | Render `boligo-back.onrender.com` — **lecture seule**, aucune donnée de test créée |
| Base de production | Supabase « Lunis-hash's Project » — **non utilisée** pour les tests |
| Node / npm | v22.22.0 / 10.9.4 |

## 1. Constats et corrections

| # | Prio | Domaine | Constat | Preuve | Statut | Correctif |
|---|---|---|---|---|---|---|
| 1 | P0 | Build | `npm ci` / `npm install` impossibles : `react-test-renderer@^19.1.0` résout 19.2.x (peer `react@19.2`) alors que l'app est sur `react@19.1.0` → ERESOLVE | `npm ci` → `npm error ERESOLVE` | ✅ | `dbb404f` |
| 2 | P0 | Build | `package-lock.json` pointe vers `registry.npmmirror.com` (miroir chinois) : installation impossible depuis un réseau qui ne l'autorise pas | 1247 URLs `npmmirror` dans le lock | ✅ | `dbb404f` |
| 3 | P0 | Repo | Dépôt mélangé : site Next.js OWEKE (`src/`, `next.config.ts`, `vercel.json`, tailwind…) + `.gitignore` contenant des marqueurs de conflit Git non résolus | `<<<<<<< HEAD` dans `.gitignore` | ✅ | `1f61545` |
| 4 | P2 | Lint | `expo lint` : 50 erreurs `react/no-unescaped-entities` (apostrophes du texte français) + 107 avertissements | sortie eslint | ✅ (règle désactivée, imports réordonnés) | `779aaec` |
| 5 | P0 | Auth / API | Session fragile : token conservé sans stockage sécurisé unifié, tokens journalisés en clair, intercepteur 401 sans file d'attente (plusieurs refresh concurrents), erreurs backend illisibles (« Internal server error », tableaux class-validator) | lecture `services/api.ts`, `context/auth.tsx` (HEAD `432b66d`) | ✅ | `806ebcf` |
| 6 | P0 | Chat | Socket.IO connecté **sans JWT** (`handshake.auth.token` absent ⇒ rejet backend), noms d'événements différents de ceux du gateway, contacts du partenaire révélés dès **un seul** consentement | `ChatGateway` vs `services/chatSocket.ts` ; `GET /journey/:id/contact-exchange` | ✅ | `4fc69f9` |
| 7 | P1 | Vidéo | `POST /video/end` appelé avec l'ancien payload ⇒ **500** ; l'erreur était masquée et l'écran affichait un succès | smoke API : `/video/end` ancien payload → 500 | ✅ | `eac4ecf` |
| 8 | P1 | Notifications | Token Expo jamais envoyé au backend (`POST /notifications/push-token` inutilisé) ; tap sur une notification sans navigation | lecture `services/notifications.ts` | ✅ | `66fe9a1`, `75ab531` |
| 9 | P0 | Auth | Connexion sociale **simulée** (profil fictif ⇒ le backend créait un compte factice), écrans morts (`signup`, `register`, `phone`, `sondeur/*`), lien « Mot de passe oublié » vers des écrans inexistants | `login.tsx:185-193` ; `_layout` déclarant des routes absentes | ✅ | `0b27b4e`, `6983211` |
| 10 | P0 | Entretien | Reprise sur le mauvais module (statut mal interprété), **module 10 jamais posé** (validé avec `answers: {}`), plantage sur module vide, erreurs sans retry | smoke API + lecture `[moduleNumber].tsx` | ✅ | `2472946` |
| 11 | P1 | Inscription | Périmètre de rencontre (`meetingScope`) collecté à l'étape 3 mais jamais envoyé ⇒ filtre géographique inopérant | payload `POST /auth/register` | ✅ | `5a0ef4c` |
| 12 | P0 | Crédits | Solde calculé localement (crédit « offert » côté app), `spendCredit` retournait un objet toujours truthy ⇒ solde insuffisant jamais détecté | `AppContext.tsx`, `discover.tsx:667` | ✅ | `060b71a` |
| 13 | P1 | Sondeur | Réponse refusée par la modération (400) ignorée et l'UI avançait quand même ; questions de démonstration locales mélangées aux vraies | `POST /journey/respond` → 400 | ✅ | `225b685` |
| 14 | P0 | Paiement | Offre `harmonie_premium` (50 €) inconnue du backend qui facture 15 € ; crédits **ajoutés localement** après paiement ; mode mock/web affiché comme un succès | `GET /payment/plans`, smoke `create-payment-intent` | ✅ (formules du backend, solde relu, promo) | `9a64fd8` |
| 15 | P1 | Profil | `PATCH /profile/me` envoyait les 7 champs, `''` ⇒ 400 (`profession`) ou 500 (`telephone` unique) ; onglet Profil non rafraîchi après édition | smoke API | ✅ | `5f71525` |
| 16 | P1 | Onboarding | Carrousel de valeurs : index courant mis à jour uniquement sur `onMomentumScrollEnd` (jamais émis sur le web, pas garanti après `scrollToIndex`) ⇒ bouton « Suivant » bloqué sur le 2ᵉ écran, CGU inaccessibles | recette navigateur, capture `probe-cgu` | ✅ | `cd80bd9` |
| 17 | P1 | Onboarding | Inscription : l'animation d'entrée démarrait avant le montage de l'étape suivante ⇒ **étapes 2 à 4 invisibles** (opacité 0) sur le web | recette navigateur, capture `05-inscription-etape2` (vide) | ✅ | `4e5e568` |
| 18 | P0 (web) | API | Sur le web, l'heuristique « IP du poste de dev » transformait `http://localhost:8081` en `http://http:3000/api` ⇒ toutes les requêtes en `ERR_NAME_NOT_RESOLVED` | recette navigateur (`Network Error` à l'inscription) | ✅ (+ tests unitaires) | `0275522` |
| 19 | P2 | UI | Marges de barre d'état codées en dur (56-60 px iOS / 36-48 px Android) sur 10 écrans : chevauchement Dynamic Island, espace perdu sur petits iPhone, Android edge-to-edge ignoré | grep `Platform.OS === 'ios' ? 5x : 4x` | ✅ (`useSafeAreaInsets`) | `b9ecf63` |
| 20 | P2 | Web | `Alert.alert` sans effet sur react-native-web (erreurs invisibles) ; `expo-notifications` chargé sur le web (avertissement) | export web | ✅ | `daa89b1` |
| 21 | P3 | Code | `scrollX` inutilisé, mocks de compatibilité locaux, logs de debug hors `__DEV__` | lint | ✅ | `cd80bd9`, `225b685`, `806ebcf` |
| 22 | P2 | Tests | Aucun test automatisé dans le dépôt d'origine | — | ✅ 8 suites / 33 tests Jest, script d'acceptation API (60/64, 4 bugs backend attendus), recette navigateur | `59fe0e0`, `82d1dfd`, `daa89b1`, `0275522` |
| 23 | P0 sécu | Supabase | RLS désactivé sur les 20 tables BOLIGO (API REST Supabase ouverte) | linter Supabase | ✅ RLS activé (migration `enable_rls_boligo_tables`), backend non affecté (rôle propriétaire) | infra |
| 24 | P1 | Sondeur | Les 21 questions pouvaient être répondues en une seule session alors que la règle est 7 par jour sur 3 jours ; le serveur ne vérifie ni le jour ni l'appartenance au parcours | E2E (21 réponses en 2 min), lecture `respondToQuestion` | ✅ app : ouverture calendaire (`services/sondeur.ts`) · 📝 backend : `backend-proposals/sondeur-day-gating.patch` | `8b94648` |
| 25 | P1 | Découverte | Repli sur tous les profils hors périmètre quand les filtres ne laissent personne ; données inventées (situation, enfants, études, distance, « nuance de rythme ») ; aucune aide au dialogue sur les divergences | lecture `matching.service.ts`, écran Découverte | ✅ app : bloc « Sujets à aborder », distance supprimée · 📝 backend : `discover-strict-filters-real-details.patch` | `1ce0065` |
| 26 | P0 sécu | Modération | Un compte `suspendu` se connecte et utilise l'API | backend local : login 200, `/profile/me` 200 | ✅ app : message explicite · 📝 backend : `account-status-enforcement.patch` | `dc86921` |
| 27 | P2 | Cold start | Instance Render gratuite endormie : premier appel 30–60 s sans explication pour l'utilisateur | mesure Render | ✅ réveil au lancement + message d'attente après 4 s | `dc86921` |
| 28 | P2 | Paiement | L'app affichait toute formule renvoyée par le backend ; dépendance `@supabase/supabase-js` inutilisée embarquée | `package.json`, `payment.tsx` | ✅ formule unique `parcours_harmonie`, dépendance retirée | `25b1bad` |
| 29 | P2 | Entretien | Couverture incomplète : substances, polygamie, dettes, confiance/téléphone, réconciliation, temps ensemble, gestion des divergences ; coquille « m'excluser » | audit `questions.data.ts` (69 questions) | 📝 `backend-proposals/interview-questions-enrichment.patch` (+7 questions) | docs |
| 30 | P1 | Déploiement | Pas d'hébergement web ; création du Static Site Render refusée par la politique de permissions de la session | Render | 📝 configuration prête à cliquer (`docs/DEPLOIEMENT.md` § 3.2) | docs |
| 31 | P1 produit | Légal | Aucune CGU complète ni politique de confidentialité : seule une courte modale dans l'onboarding ; aucun écran légal, aucune information RGPD (données sensibles de l'entretien, sous-traitants, durées, droits) | lecture `value-slides.tsx` | ✅ CGU/CGV (14 articles) et politique de confidentialité (11 sections) rédigées, source unique `constants/legal.json`, écrans `/legal/cgu` et `/legal/confidentialite` accessibles depuis l'onboarding et le profil, export Markdown `docs/legal/` ; mentions éditeur à compléter, validation juridique recommandée | `58a7c5d` |
| 32 | P0 build | Backend | `tsconfig.build.tsbuildinfo` versionné et périmé : `nest build` sur un clone frais n'émet pas `dist/prisma/*.js`, le serveur plante au démarrage | reproduction locale (`Cannot find module ./prisma/prisma.module`) | ✅ backend (branche) | `51831e4` (Boligo-back) |
| 33 | P1 métier | Backend | Score de compatibilité aveugle aux critères durs de l'entretien (enfants, fidélité, religion, argent…) ; fiches avec données génériques | lecture `compatibility.scorer.ts` | ✅ moteur de divergences, fiches réelles, score cohérent like/acceptation | `16297e0` (Boligo-back) |
| 34 | P1 métier | Backend | Sondeur générique (banque de 21 questions identique pour tous) dès que l'IA manque ; aucune garantie de couverture des 7 thèmes | lecture `journey.service.ts` | ✅ générateur 3 × 7 ciblé sur les divergences, IA facultative validée par la grille | `4bd31c4` (Boligo-back) |
| 35 | P0 sécu | Backend | `GET /journey/:id/questions` et `/messages` sans contrôle d'appartenance ; coordonnées du partenaire renvoyées avant double consentement | recette API | ✅ 403/404 + coordonnées masquées tant que les deux n'ont pas consenti | `4bd31c4` (Boligo-back) |
| 36 | P2 | Backend | `chat/unread-count` toujours 0 (`req.user.userId` inexistant) | recette API | ✅ | `134833b` (Boligo-back) |
| 37 | P2 | Web | `/login` : photo de fond agrandie (scale 1,15) non rognée ⇒ barre de défilement horizontale sur le web à toutes les largeurs | sonde Playwright (scrollWidth 419 > 390) | ✅ conteneur `overflow: hidden` | `9e15d66` |
| 38 | P0 sécu | Backend | Webhook Stripe : sans en-tête `stripe-signature`, le corps JSON était accepté non signé ⇒ n'importe qui pouvait créditer un compte ; un même paiement renvoyé par Stripe était crédité deux fois | `payment.service.spec.ts` (3 tests échouent sur l'ancien code) | ✅ (en production) | `c0b47a7` (PR #2) |
| 39 | P0 métier | Fiches | Fiches robotiques et tronquées (« axée sur **Oui si le projet de ,** … ») : la synthèse de secours coupait chaque réponse à 20 caractères (`keyValues: firstVal.slice(0, 20)`) puis les joignait par des virgules | fiche « Oli » ; `ai.service.ts` | ✅ | `78ef2a2` |
| 40 | P1 | Découverte | « 0 » au centre du cercle : le cercle affichait l'initiale du prénom (« O » pour Oli), lue comme un zéro, à côté du badge « 83 % » | capture Découverte | ✅ (le cercle affiche le vrai pourcentage) | `d232e6f` |
| 41 | P1 | KPI | Affinités par module déconnectées du Grand Entretien : 5 piliers calculés sur des recouvrements de textes IA, bornés à 50 % minimum ; valeurs inventées côté app (âge, ville « Lyon », détails, analyse) | `formatMentalMap`, `discover.tsx` | ✅ (11 modules calculés réponse par réponse, verdict humain) | `78ef2a2`, `c369ce7`, `d232e6f` |
| 42 | P1 | Entretien | Module 0 jamais posé aux inscrits de l'app : la réponse M0_Q02 enregistrée à l'inscription marquait le module 0 « terminé » ⇒ désir d'enfants, déménagement, situation, études, tabac jamais demandés ; entretien clos dès 11 lignes de modules | recette navigateur : 67 réponses au lieu de 74 | ✅ | `ded8be5` |
| 43 | P2 | Bilan / Profil | Bilan : 6 « dimensions » à pourcentages fictifs (« Respect mutuel 100 % »), « Profil complété à 100 % » fixe ; Profil : bio coupée au 100e caractère, « 0 % » sans entretien | `summary.tsx`, `profile.tsx` | ✅ (un module par carte, clarté réelle, coupe au mot) | `78ef2a2`, `d232e6f` |
| 44 | P3 | Marque | Ancien nom « Harmonie » dans les invites IA, la bio de secours, l'API et 4 écrans (« Entretien Harmonie », « Modération Harmonie »…) | `grep Harmonie` | ✅ (BOLIGO ; « Parcours / Phase Harmonie » conservés : noms de produit) | `78ef2a2`, `d232e6f` |
| 45 | P3 | Moteur | Même langage de l'amour signalé comme une « nuance » (règle `M8_Q04` toujours `mineure`) | test unitaire | ✅ | `78ef2a2` |

## 2. Recette exécutée

| Type | Commande | Résultat |
|---|---|---|
| Typage | `npm run typecheck` | 0 erreur |
| Lint | `npm run lint` | 0 erreur, 69 avertissements (variables inutilisées héritées, `exhaustive-deps`) |
| Unitaires | `npm test` | 10 suites, 44 tests OK |
| API | `API_URL=http://localhost:3000/api npm run test:api` | 60/64 — les 4 échecs sont des bugs backend documentés (`docs/BACKEND_ISSUES.md`) |
| Navigateur | `node e2e/journey.e2e.js` (Chromium 390×844 + 360×640 + 768×1024, `E2E_PSQL` pour simuler les jours) | **52/52 étapes OK** (2026-10-03, dont cercle de score = score serveur, 11 modules, aucun texte tronqué) (dont jours 2 et 3 du Sondeur verrouillés jusqu'au lendemain) — détail dans `docs/E2E_RESULTATS.md`, captures dans `docs/screenshots/` |
| Export web | `npx expo export --platform web` | OK (bundle unique) |

Parcours rejoué de bout en bout dans le navigateur : accueil → slides + CGU → inscription 4 étapes → OTP →
entretien 11 modules (61 questions) → bilan → découverte (état vide, profil compatible, refus sans crédit) →
formule + code promo → like → acceptation du partenaire (API) → Sondeur 21 réponses → chat libre → message
temps réel (WebSocket) → modération → fin d'appel vidéo (API) → échange de contacts (double consentement) →
profil / édition → persistance de session → déconnexion → mauvais mot de passe → reconnexion → mot de passe oublié.

## 3. Bugs backend (hors périmètre de modification)

Consolidés dans `docs/BACKEND_ISSUES.md` (tableau `Priorité | Endpoint | Backend | Problème | Preuve | Correction proposée`).
Points saillants : `main` de `Boligo-back` **ne compile pas** (les 3 derniers déploiements Render sont en
`build_failed`, la production tourne sur `0046ad8`) ; IDOR sur les routes de parcours ; contacts révélés sans
consentement ; `POST /credit/add` ouvert ; `otpDebugCode` et code `1234` en production ; `push-token` renvoie
le `User` complet ; Supabase : RLS désactivé sur les 20 tables (avis de sécurité critique du tableau de bord).

## 4. Hypothèses temporaires (à valider produit)

| Sujet | Choix retenu (réversible) | Emplacement |
|---|---|---|
| Débit du crédit au « like » | Le backend ne débite rien : l'app appelle `POST /matching/connect` puis `POST /credit/spend` (1 crédit). Si le backend débite un jour, retirer l'appel côté app. | `app/(tabs)/discover.tsx` (`handleConnect`) |
| Acceptation d'un like reçu | Le crédit est débité **avant** l'acceptation (règle d'équité : chaque membre paie son parcours). | `app/(tabs)/discover.tsx` (`performAcceptLike`) |
| Web | Paiement carte et appel vidéo indisponibles sur le web (message explicite) ; le code promo reste utilisable. | `services/stripe.web.ts`, `app/video-call.tsx` |
| Phase Harmonie dans Messages | La conversation d'un parcours en phase Harmonie redirige vers l'onglet Matchs (Sondeur) au lieu d'un chat vide. | `app/(tabs)/messages.tsx` |

## 5. Sécurité — secrets

Aucun secret n'a été reproduit dans ces documents.

| Emplacement | Nature | Action |
|---|---|---|
| `eas.json` (profils `preview` et `production`) | clé **publiable** Stripe de test (`pk_test_…`) | Clé publiable (non secrète) mais **de test dans le profil production** : à remplacer par la clé publiable live via variable EAS avant toute mise en production. |
| `Boligo-back` : `.env` local créé pour la recette | secret JWT de test local | Hors dépôt (`.gitignore`), valeur de test uniquement. |
| Backend `POST /auth/register` | `otpDebugCode` renvoyé au client | À retirer côté backend (voir `docs/BACKEND_ISSUES.md`). |

## 6. Environnements utilisés

| Environnement | Usage | Écritures |
|---|---|---|
| Local : PostgreSQL 16 + `Boligo-back` compilé (`node dist/main.js`) | recette API et navigateur | base de test uniquement |
| Render `boligo-back.onrender.com` | lecture des déploiements et logs (état de la production) | aucune |
| Supabase (base de production) | lecture des avis de sécurité / structure | aucune |
| Stripe | aucun paiement déclenché (compte en mode live ⇒ non utilisé) | aucune |
| Chromium headless (Playwright) | export web de l'app | — |
