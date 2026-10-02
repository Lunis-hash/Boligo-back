# BOLIGO — Architecture d'hébergement à bas coût et mode d'emploi de test

Date : 2026-10-01. Périmètre : application mobile/web BOLIGO (`mobile-steve/`) et
son backend `Boligo-back` (NestJS + Prisma). Tout ce qui est décrit ici tient
dans les offres gratuites de Supabase, Render et Expo.

## 1. Répartition des rôles

| Brique | Service | Rôle | Coût |
|---|---|---|---|
| Base de données | **Supabase** « Lunis-hash's Project » (`hhnnsevawhhtzdffnomv`, eu-central-1, PostgreSQL 17) | Seule base de données : utilisateurs, entretiens, cartes mentales, matchs, parcours, messages, crédits, paiements | gratuit |
| API | **Render Web Service** `Boligo-back` (`srv-d9ah0tlaeets73dvl13g`, région Virginia, plan free) | NestJS, Prisma → Supabase, Socket.IO, Stripe, Daily.co, IA | gratuit |
| Web | **Render Static Site** `boligo-web` (à créer, voir § 3) | Export web Expo de l'application | gratuit |
| Mobile | **Expo** (Expo Go pour les tests, EAS Build pour les binaires) | iOS / Android | gratuit (file d'attente EAS) |
| Base Render | **bannie** | Les bases PostgreSQL gratuites de Render expirent au bout de 30 jours | — |

Le backend ne connaît Supabase que par `DATABASE_URL` / `DIRECT_URL` (Prisma) ;
l'application mobile ne parle **jamais** à Supabase directement (la dépendance
`@supabase/supabase-js`, inutilisée, a été retirée).

```
Expo Go / binaire EAS ──┐
                        ├── HTTPS + Socket.IO ──► Render Web Service (NestJS) ──► Supabase PostgreSQL
Navigateur (Static Site)┘                                 │
                                                          ├──► Stripe (test)  ├──► Daily.co (vidéo)  ├──► OpenRouter / Groq (IA)
```

## 2. Supabase : Row Level Security

Constat initial : RLS désactivé sur les 20 tables BOLIGO (alerte critique du tableau de bord).

Vérifications faites avant d'agir :
- toutes les tables appartiennent au rôle `postgres`, qui possède `BYPASSRLS` ;
- aucun autre rôle de connexion BOLIGO n'existe (seuls `postgres`, `authenticator` pour PostgREST et un rôle du projet voisin) ⇒ Prisma se connecte forcément en `postgres` ;
- aucun client (mobile, admin, site) n'utilise l'API PostgREST / `supabase-js`.

Action réalisée (migration `enable_rls_boligo_tables`) : `ALTER TABLE … ENABLE ROW LEVEL SECURITY` sur
les 20 tables. Résultat : le backend est inchangé (rôle propriétaire), les rôles `anon` et
`authenticated` de l'API REST Supabase n'ont plus accès à aucune ligne (aucune policy = aucun accès).
Le linter Supabase ne remonte plus qu'une information « RLS enabled, no policy », attendue.

Points restants, hors BOLIGO, signalés par le linter : fonctions `public.app_doc_merge` et
`public.app_lock_acquire` (SECURITY DEFINER exécutables par `anon`) et schémas `oweke*` d'un
autre projet hébergé sur la même base.

## 3. Render

### 3.1 Web Service `Boligo-back` (existant)

| Réglage | Valeur |
|---|---|
| Dépôt / branche | `Lunis-hash/Boligo-back` / `main` |
| Build | `npm install; npm run build` |
| Start | `node --max-old-space-size=512 dist/main.js` |
| Variables | `DATABASE_URL`, `DIRECT_URL` (Supabase, pooler), `JWT_SECRET`, `STRIPE_SECRET_KEY` (`sk_test_…`), `STRIPE_WEBHOOK_SECRET`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`), `DAILY_API_KEY`, `OPENROUTER_API_KEY` / `GROQ_API_KEY`, SMTP ou `BREVO_API_KEY`, `APP_URL`, `NODE_ENV=production` |

**Bloquant actuel : `main` ne compile pas** (`src/admin/admin.service.ts`). Les trois derniers
déploiements sont en `build_failed` et la production tourne encore sur `0046ad8`. Le correctif est
fourni : `docs/backend-proposals/admin-service-build-fix.patch`. Tant qu'il n'est pas appliqué, les
corrections de l'app qui dépendent de `main` (formules de paiement, fin d'appel vidéo, etc.) ne sont
pas servies par la production.

### 3.2 Static Site `boligo-web` (à créer dans le tableau de bord)

La création par API a été refusée par la politique de permissions de cette session (déploiement
de production). Réglages à saisir sur <https://dashboard.render.com/static/new> :

| Réglage | Valeur |
|---|---|
| Name | `boligo-web` |
| Repository / Branch | `Lunis-hash/Boligo-back` / `claude/magical-keller-kw9t2c` (ou `main` après fusion) |
| Root Directory | `mobile-steve` |
| Build Command | `npm ci && npx expo export --platform web && cp dist/index.html dist/404.html` |
| Publish Directory | `dist` |
| Environment | `EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api`, `NODE_VERSION=22` |
| Redirects/Rewrites | `/*` → `/index.html` (Rewrite) — nécessaire pour les routes expo-router |

La copie `dist/404.html` sert de filet si la règle de réécriture est oubliée. Le fichier
`mobile-steve/render.yaml` reprend ces réglages (Blueprint, « Root Directory = mobile-steve »). Limites connues du
web : paiement carte natif (Stripe PaymentSheet) et appel vidéo (WebView) indisponibles, message
explicite dans l'app ; le code promo fonctionne.

### 3.3 Cold start (instance gratuite)

Render met l'instance en veille après 15 minutes sans trafic ; le premier appel prend 30 à 60 s.

Mesures prises dans l'app :
- `warmUpBackend()` (`services/api.ts`) : un `GET /api` est envoyé dès l'ouverture de l'app
  (`app/_layout.tsx`) pour réveiller le serveur pendant que l'utilisateur lit l'accueil ;
- écran de reprise (`app/index.tsx`) : après 4 s, message « Le serveur se réveille, cela peut
  prendre jusqu'à une minute… » ; le délai d'attente des requêtes est de 60 s avec bouton Réessayer.

Option non activée, à décider : un ping toutes les 10 minutes (par exemple `pg_cron` + `pg_net`
depuis Supabase, extensions disponibles mais non installées) garderait l'instance éveillée, mais
consommerait ~720 des 750 heures gratuites mensuelles de l'espace Render, **partagées avec les
trois autres services gratuits de l'espace** (`oweke-server*`). À réserver à une instance payante
ou à un espace dédié.

## 4. Variables de l'application (Expo)

| Variable | Où | Valeur |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `eas.json` (profils), Static Site Render, `.env` local | `https://boligo-back.onrender.com/api` (préfixe `/api` obligatoire) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `eas.json` | clé **publiable** Stripe : `pk_test_…` en test, `pk_live_…` en production via `eas env:create` |

Aucune clé secrète (`sk_…`, Daily, JWT) ne doit apparaître dans l'app ni dans ce dépôt.

## 4bis. Configuration Expo propre à BOLIGO (`app.json`, `eas.json`)

| Champ | Valeur | Remarque |
|---|---|---|
| `name` / `slug` / `scheme` | `BOLIGO` / `boligo` / `boligo` | plus aucune référence à l'ancien nom de code « Harmonie » |
| `ios.bundleIdentifier` / `android.package` | `com.boligo.app` | identifiants dédiés ; à réserver dans les stores avant publication |
| Stripe (plugin) | `merchantIdentifier: merchant.com.boligo.app` | Apple Pay / Google Pay nécessitent un development build (non disponibles dans Expo Go) |
| `extra.eas.projectId` | **retiré** | il appartenait à l'ancien projet EAS `harmonie-expo` ; `eas init` crée le projet `boligo` et le réécrit |
| Profils EAS | `development` (dev client, APK), `preview` (APK interne), `production` (`autoIncrement`) | `EXPO_PUBLIC_API_URL` = API Render BOLIGO ; clé publiable Stripe de test dans `development`/`preview`, clé live à fournir en `production` via `eas env:create` |

Compatibilité **Expo Go** (vérifiée sur la documentation Expo SDK 54 et `expo-doctor`, 16/18 contrôles —
les 2 restants sont des accès réseau bloqués dans le conteneur de recette) : `@stripe/stripe-react-native`,
`react-native-webview`, `expo-secure-store`, `expo-camera`, `expo-av`, `react-native-svg` sont inclus
dans Expo Go. Les notifications **push distantes** ne fonctionnent pas dans Expo Go (SDK 53+) : l'app
détecte l'échec et continue sans bloquer ; elles fonctionnent dans un development build. Apple Pay et
Google Pay nécessitent aussi un development build ; le paiement par carte via PaymentSheet fonctionne.

## 5. Mode d'emploi de test

### 5.1 Mobile (Expo Go)

```bash
cd mobile-steve
npm ci
cp .env.example .env            # EXPO_PUBLIC_API_URL + clé publiable Stripe (test)
npx expo start                  # ou : npx expo start --tunnel si le téléphone n'est pas sur le même Wi-Fi
# scanner le QR code avec Expo Go (iOS : appareil photo, Android : app Expo Go)
```

Première fois sur ce compte Expo : `npm install -g eas-cli && eas login && eas init` (crée le projet EAS
`boligo` et renseigne `extra.eas.projectId`, nécessaire aux notifications push des builds).

Compte de test : inscription dans l'app, code OTP `1234` (code passe-partout du backend, à retirer
en production, voir `docs/BACKEND_ISSUES.md`). Crédit de test : code promo `BOLIGO100` sur l'écran
Formule (100 %, sans paiement) ou paiement Stripe **test** avec la carte `4242 4242 4242 4242`.

### 5.2 Web

Static Site Render (§ 3.2) ou en local :

```bash
EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api npx expo export --platform web --output-dir /tmp/boligo-web
node e2e/static-server.js /tmp/boligo-web 8081   # http://localhost:8081
```

### 5.3 Recette automatisée (backend de test local, jamais la production)

```bash
npm run typecheck && npm run lint && npm test                 # statique + unitaires
API_URL=http://localhost:3000/api npm run test:api            # 64 contrôles API
APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api \
E2E_PSQL="psql postgresql://boligo:boligo_test@localhost:5432/boligo_steve_test" \
node e2e/journey.e2e.js                                       # parcours complet Chromium
```

`E2E_PSQL` sert uniquement à simuler le passage des jours du Sondeur (recul de `stepStartDate`
d'un jour dans la base de test).

### 5.4 Parcours à vérifier à la main (tempo relationnel)

1. Inscription → OTP → 11 modules d'entretien → bilan.
2. Formule « Parcours Harmonie » 15 € (1 crédit) → Découverte → like (1 crédit débité) → acceptation.
3. Sondeur : 7 questions le jour 1, **puis attente du lendemain** pour le jour 2, puis le jour 3 ;
   les deux membres doivent avoir répondu pour ouvrir le chat libre.
4. Chat libre 3 jours → appel vidéo 2 minutes (étape `video`, Daily.co) → échange de contacts
   (double consentement) → parcours terminé.
5. Modération : un message grossier est refusé avant envoi et par le serveur ; signalement depuis
   le chat ; un compte suspendu doit être refusé (correctif backend fourni).

## 6. Daily.co (appel vidéo)

Le backend crée des salles Daily éphémères (`eject_after_elapsed: 120 s`, jeton d'une heure) quand
`DAILY_API_KEY` est renseignée ; sinon il bascule automatiquement sur Jitsi Meet (salles publiques,
non recommandé en production). Création du compte test :

1. <https://dashboard.daily.co> → créer un compte (offre gratuite) → **Developers** → copier la clé API ;
2. Render → `Boligo-back` → Environment → `DAILY_API_KEY=<clé>` → redéployer ;
3. vérifier : `GET /api/video/session/:journeyId` renvoie `provider: "daily"` lors du `POST /api/video/call-token`.

La création du compte n'a pas pu être faite depuis cette session (inscription et validation
d'e-mail nécessaires) ; l'intégration côté app et backend est en place et testée en mode dégradé.

## 7. Stripe (test)

| Côté | Variable | Valeur |
|---|---|---|
| Backend (Render) | `STRIPE_SECRET_KEY` | `sk_test_…` (sans clé : mode simulation, aucun appel Stripe) |
| Backend (Render) | `STRIPE_WEBHOOK_SECRET` | `whsec_…` du webhook `https://boligo-back.onrender.com/api/payment/webhook` (événement `payment_intent.succeeded`) |
| App (`eas.json`) | `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` |

Le crédit n'est jamais ajouté par l'app : il est crédité par le webhook Stripe (ou par le code
promo) et relu via `GET /credit/balance`. Le compte Stripe connecté à cette session est en mode
live et n'a pas été utilisé ; les clés de test sont à créer dans le tableau de bord Stripe
(bascule « Mode test »).
