# Boligo - STEVE — application mobile BOLIGO (Expo / React Native)

Copie de travail **indépendante** de l'application mobile BOLIGO, extraite du
dépôt `Lunis-hash/oweke` (racine Expo `harmonie-expo-starter`, commit `432b66d`).
L'historique Git d'origine est conservé ; le remote `origin` a été retiré pour
qu'aucune commande ne puisse pousser vers le dépôt d'origine.

- Stack : Expo SDK 54 · React Native 0.81 · React 19 · expo-router 6 · TypeScript 5.9
- Backend : `Boligo-back` (NestJS + Prisma), préfixe `/api`, WebSocket Socket.IO
- Documentation : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
  [`docs/JOURNAL_RECETTE.md`](docs/JOURNAL_RECETTE.md),
  [`docs/API_AUDIT.md`](docs/API_AUDIT.md),
  [`docs/BACKEND_ISSUES.md`](docs/BACKEND_ISSUES.md),
  [`docs/E2E_RESULTATS.md`](docs/E2E_RESULTATS.md)

## Démarrer

```bash
npm ci                      # installation reproductible (registre npmjs.org)
npm run typecheck           # tsc --noEmit
npm run lint                # expo lint (eslint-config-expo)
npm test                    # tests unitaires Jest (jest-expo)
npm start                   # Expo dev server (Expo Go / dev build)
```

### Backend ciblé

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de l'API (ex. `https://boligo-back.onrender.com/api`). Sur le web elle est utilisée telle quelle ; sur mobile, une URL `localhost` est remplacée par l'IP du poste qui sert le bundle (`:3000/api`). Sans variable : production. |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publiable Stripe (PaymentSheet natif). |

Les profils EAS (`eas.json`) fixent ces variables par environnement.

### Recette

```bash
# API : scénario d'acceptation complet contre un backend de TEST (jamais la production)
API_URL=http://localhost:3000/api npm run test:api

# Navigateur : parcours complet rejoué dans Chromium sur l'export web (voir e2e/README.md)
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo export --platform web --output-dir /tmp/boligo-web
node e2e/static-server.js /tmp/boligo-web 8081 &
APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api node e2e/journey.e2e.js
```

## Structure

```
app/                 écrans expo-router (file-based routing)
  (auth)/            login, verify (OTP), forgot-password, reset-password
  onboarding/        value-slides, profile-details (inscription 4 étapes), payment
  interview/         [moduleNumber] (11 modules), generation, summary
  (tabs)/            discover, index (Matchs / Sondeur), messages, profile
  profile/edit       édition du profil
  video-call         appel vidéo (WebView Daily/Jitsi)
components/          ErrorBoundary, ui/Button, ui/Input
context/             auth (session, tokens), AppContext (crédits, matchs)
services/            api (axios + refresh JWT), storage (SecureStore/localStorage),
                     auth, interview, payment, video, notifications, chatSocket,
                     cacheService, chatModeration, soundService, webAlert, stripe(.web)
constants/           thème, métiers, pays
scripts/             backend-flow-smoke.js (recette API)
e2e/                 recette navigateur Playwright
docs/                audit, journal de recette, résultats, captures
```

## Règles de sécurité de la recette

- Aucun test contre la base de production ; la recette API/E2E cible un backend
  local avec une base PostgreSQL vide.
- Aucun paiement réel : le code promo `BOLIGO100` (100 %) ou le mode mock sont
  utilisés ; Stripe n'est appelé qu'en mode TEST.
- Aucun secret versionné : les clés vivent dans les variables d'environnement
  EAS / `.env` local (ignoré par Git).
