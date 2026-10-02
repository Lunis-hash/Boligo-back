# Architecture — application mobile BOLIGO (copie « Boligo - STEVE »)

Reconstituée à partir du code (Expo SDK 54 · React Native 0.81 · React 19 ·
expo-router 6 · TypeScript 5.9) et vérifiée par la recette (API + navigateur).
Les numéros de section renvoient aux fichiers de la copie.

## 1. Identification de la source

| Preuve | Valeur |
|---|---|
| `package.json` | `harmonie-expo-starter`, dépendances `expo@54`, `expo-router@6`, `react-native@0.81.5`, `socket.io-client`, `@stripe/stripe-react-native`, `expo-notifications`, `expo-secure-store` |
| `app.json` | nom `Harmonie`, slug `harmonie-expo`, scheme `harmonie`, bundle `com.harmonie.app`, plugins `expo-router`, Stripe, SecureStore |
| `eas.json` | `EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api` (backend BOLIGO) |
| Routes | `interview/`, `(tabs)/discover`, Sondeur, parcours Harmonie — vocabulaire identique au backend `Boligo-back` |
| Dépôt d'origine | `Lunis-hash/oweke` (racine), mélangé avec un site Next.js OWEKE sans rapport (retiré dans `1f61545`) |

`Boligo-Website` n'est que le site vitrine (son README pointe vers un dossier `project/` Expo absent).

## 2. Navigation (expo-router, file-based)

```
app/_layout.tsx            Providers : SafeArea → Auth → App → Stripe → Stack ; NotificationRouter
├─ index.tsx               écran de reprise : token ? statut d'entretien → /interview/N | /(tabs)/discover : /(auth)/login
├─ (auth)/                 login · verify (OTP 4 chiffres) · forgot-password · reset-password
├─ onboarding/             value-slides (6 écrans + CGU) → profile-details (4 étapes) → [verify] ; payment (formule + promo)
├─ interview/              [moduleNumber] 0..10 → generation (POST complete) → summary (bilan)
├─ (tabs)/                 discover (découverte / match en cours) · index (Matchs + Sondeur) · messages (liste + chat) · profile
├─ profile/edit            édition du profil (PATCH partiel)
└─ video-call              appel vidéo (WebView Daily.co) — natif uniquement
```

Règles de garde :
- `app/index.tsx` et `(tabs)/_layout.tsx` utilisent `getResumeModule(status)` (`services/interview.ts`) :
  entretien incomplet ⇒ redirection vers le premier module manquant ; erreur ⇒ écran « Réessayer ».
- `(auth)/login` redirige de la même façon après connexion.
- Sur le web, les onglets inactifs restent montés sous l'onglet actif (comportement react-navigation) ;
  la recette navigateur cible donc toujours le dernier élément correspondant.

## 3. État et contextes

| Contexte | Contenu | Source de vérité |
|---|---|---|
| `context/auth.tsx` | `token`, `userId`, `signIn(token, userId, refresh?)`, `signOut()` | `services/storage.ts` (SecureStore natif / localStorage web / mémoire) — clés `userToken`, `refreshToken`, `userId` |
| `context/AppContext.tsx` | `credits`, `creditsLoaded`, `refreshCredits()`, `spendCredit()`, `matches`, `loadMatches(force)` | backend (`GET /credit/balance`, `GET /matching/my-matches`) — **aucun crédit n'est ajouté localement** |
| `services/cacheService.ts` | cache mémoire TTL (profil, accès chat, statut de parcours) | invalidé à la déconnexion et après édition du profil |

`signOut()` : déconnexion du socket, vidage du cache, suppression de la session, `router.replace('/(auth)/login')`.
`triggerGlobalSignOut()` est appelé par l'intercepteur HTTP quand le refresh échoue.

## 4. Couche API (`services/api.ts`)

- Client axios, `baseURL = resolveApiUrl(...)` (testé unitairement) : `EXPO_PUBLIC_API_URL` telle quelle sur le web,
  IP du poste de dev en natif si l'URL est `localhost`, sinon production.
- Intercepteur requête : `Authorization: Bearer <accessToken>` depuis le stockage sécurisé.
- Intercepteur réponse : 401 ⇒ file d'attente de refresh (`POST /auth/refresh`, rotation des deux tokens),
  rejeu de la requête ; échec ⇒ session vidée + déconnexion globale. Routes exclues : login, register, verify-email, refresh.
- `getReadableError(error, fallback)` : message lisible (réseau, timeout, 429, 5xx, tableaux class-validator).
- Aucun token ni payload n'est journalisé hors `__DEV__`.

### Endpoints consommés (37)

| Domaine | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `DELETE /auth/delete-account` |
| Entretien | `GET /interview/status`, `GET /interview/questions/:module`, `POST /interview/save-module`, `POST /interview/complete`, `GET /interview/summary` |
| Profil | `GET /profile/me`, `PATCH /profile/me` (champs modifiés uniquement) |
| Matching | `GET /matching/discover`, `/matching/my-matches`, `/matching/received-likes`, `POST /matching/connect`, `/matching/accept` |
| Parcours | `GET /journey/:id/status`, `/journey/:id/questions`, `/journey/:id/messages`, `/journey/:id/contact-exchange`, `/journey/chat-access`, `POST /journey/respond`, `/journey/message`, `/journey/:id/exchange-contact` |
| Crédits / paiement | `GET /credit/balance`, `POST /credit/spend`, `GET /payment/plans`, `POST /payment/check-promo`, `/payment/apply-promo`, `/payment/create-payment-intent` |
| Vidéo | `GET /video/session/:journeyId`, `POST /video/call-token`, `POST /video/end` |
| Notifications | `POST /notifications/push-token` |

Le détail (payloads, codes HTTP, écarts) est dans `docs/API_AUDIT.md`.

## 5. Temps réel (`services/chatSocket.ts`)

- Socket.IO vers `SOCKET_URL` (= API sans `/api`), `auth: { token }` lu au moment de la connexion ; instance unique
  recréée si le token change ; reconnexion automatique avec ré-`joinJourney` des salons connus.
- Événements client → serveur : `joinJourney`, `leaveJourney`, `sendMessage`, `markAsRead`, `typing`, `callUser`, `rejectCall`.
- Serveur → client : `messageHistory`, `newMessage`, `messagesRead`, `userTyping`, `incomingCall`, `callRejected`, `error`.
- `ChatView` (`app/(tabs)/messages.tsx`) s'abonne au montage et se désabonne au démontage (pas de doublon d'écouteurs) ;
  l'envoi passe par `POST /journey/message` (persistance) et la réception par `newMessage`.
- Modération locale avant envoi (`services/chatModeration.ts`) + modération backend (400 ⇒ message affiché).

## 6. Flux métier

1. **Inscription** : slides → profil (identité, localisation, périmètre `meetingScope`, compte) → `POST /auth/register` → OTP (`verify-email`) → tokens.
2. **Entretien** : 11 modules (0–10), reprise au premier module manquant, `save-module` par module, `complete` puis bilan.
3. **Découverte** : `GET /matching/discover` (profils compatibles) ; like = `connect` puis débit d'un crédit (`HYPOTHÈSE TEMPORAIRE` : le backend ne débite pas) ; sans crédit ⇒ écran « Plus de crédits ».
4. **Crédits** : `GET /payment/plans` (formule `parcours_harmonie`, 15 €) ; code promo (`check-promo` / `apply-promo`) ou PaymentSheet Stripe natif ; le solde est relu depuis le backend après paiement.
5. **Parcours** : `phase_harmonie` (Sondeur 21 questions, onglet Matchs) → `chat_libre` (messages) → `video` (WebView Daily) → `echange_contacts` (double consentement, contacts révélés seulement quand les deux ont accepté) → `termine`.
6. **Notifications** : enregistrement du token Expo (`POST /notifications/push-token`) après connexion ; un tap ouvre l'onglet lié (`routeForNotificationData`).

## 7. Plateformes

| Fonction | Natif (iOS/Android) | Web (export) |
|---|---|---|
| Session | SecureStore | localStorage |
| Paiement carte | Stripe PaymentSheet | non disponible (message explicite, `services/stripe.web.ts`) |
| Appel vidéo | WebView Daily | non disponible |
| Notifications push | expo-notifications (chargé à la demande) | non chargé |
| `Alert.alert` | natif | `window.alert` / `window.confirm` (`services/webAlert.ts`) |

## 8. Qualité

- `npm run typecheck` (tsc strict), `npm run lint` (eslint-config-expo), `npm test` (Jest / jest-expo, services + contexte).
- `npm run test:api` : scénario d'acceptation complet contre un backend de test.
- `e2e/journey.e2e.js` : parcours complet dans Chromium (captures dans `docs/screenshots/`, résultats dans `docs/E2E_RESULTATS.md`).
