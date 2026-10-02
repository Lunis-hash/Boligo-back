# Audit API — application mobile BOLIGO (Expo) ↔ backend NestJS

Date de l'audit : 2026-09-30.

> **Mise à jour (fin de mission).** Cet audit a été réalisé sur un instantané intermédiaire de la copie
> (HEAD `779aaec` + modifications non commitées). Depuis, tous les écarts **côté application** listés en § 3.1
> (point 1 : références cassées `socialLogin` / `addCredits` / `SpendResult` / écrans `forgot-password` et
> `reset-password` absents ; point 2 : paiement ; point 5 : `meetingScope`, module 10 ; point 6 : champs vides
> du profil) et en § 3.2 ont été corrigés et sont couverts par des tests (voir `docs/JOURNAL_RECETTE.md`,
> colonne « Correctif »). Les écarts **côté backend** (points 3, 4, 7 et les fuites de données) restent ouverts :
> ils sont consolidés, avec preuves et corrections proposées, dans `docs/BACKEND_ISSUES.md`.
> Les numéros de ligne cités ci-dessous correspondent à l'instantané audité, pas au code actuel.

## 0. Périmètre et état des sources

| Élément | Valeur |
|---|---|
| App mobile | `Boligo - STEVE/` — HEAD `779aaec`, **copie de travail avec modifications non commitées** (voir ci-dessous) |
| Backend | `Boligo-back/` — HEAD `e58a986` (`src/admin/admin.service.ts` modifié localement, hors périmètre mobile) |
| URL API | `${API_URL}` = `EXPO_PUBLIC_API_URL` (`https://boligo-back.onrender.com/api`, `eas.json:18,25`) ou `http://<IP Expo>:3000/api` en dev (`services/api.ts:14-29`) |
| URL Socket.IO | `SOCKET_URL` = `API_URL` sans `/api` (`services/api.ts:32`) — le gateway n'est pas sous le préfixe global |
| Préfixe global backend | `api` (`src/main.ts:11`) |
| Validation | `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` (`src/main.ts:25-29`). Ne s'applique **qu'aux routes typées par une classe DTO** (auth/*, interview save-module/submit-module, profile PATCH, notifications/push-token). Les contrôleurs typés `body: {…}` (matching, credit, journey, video, payment, report) n'ont **aucune validation**. |
| Format d'erreur | `{ statusCode, timestamp, path, message }` — `message` est toujours une chaîne (tableaux class-validator joints par `\n`) (`src/common/filters/http-exception.filter.ts:25-45`). Exceptions non-HTTP ⇒ 500 `message: "Internal server error"`. |
| Rate limiting | `ThrottlerGuard` global, 120 req/min (`src/app.module.ts:47-58`) ⇒ 429 `message: "ThrottlerException: Too Many Requests"` |
| Auth | Bearer JWT `Authorization` (`src/auth/strategies/jwt.strategy.ts:9-12`) ; `req.user` = objet `User` sans `passwordHash` (`jwt.strategy.ts:24-25`) ⇒ `req.user.id`. Access token 1 h, refresh 30 j, rotation à chaque refresh (`src/auth/auth.service.ts:210-237`) |
| Statut POST par défaut | **201** sauf `@HttpCode(200)` (routes auth `verify-email`, `resend-verification`, `login`, `refresh`, `social-login`, `forgot-password`, `reset-password`, `delete-account`, et `payment/webhook`) |

### Modifications non commitées dans la copie mobile (au moment de l'audit)

`git status` : `services/api.ts`, `services/auth.ts`, `services/chatSocket.ts`, `services/notifications.ts`, `services/payment.ts`, `services/video.ts`, `context/AppContext.tsx`, `context/auth.tsx`, `app/_layout.tsx`, `app/(auth)/_layout.tsx` modifiés ; `services/storage.ts` nouveau ; `app/(auth)/register.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/phone.tsx`, `app/sondeur/*`, `components/ui/SocialButton.tsx` supprimés.

L'audit porte sur **la copie de travail**. Les écarts qui existaient dans HEAD et que ces modifications corrigent sont listés en § 3.3 ; les écrans (`app/**`) n'ont pas été mis à jour en conséquence, ce qui crée de nouvelles références cassées (§ 3.1, point 1).

---

## 1. Appels HTTP de l'application

Légende colonne « Auth » : **JWT** = `AuthGuard('jwt')`, **—** = public. Les numéros de ligne backend renvoient à `Boligo-back/src/…`, ceux de l'app à `Boligo - STEVE/…`.

### 1.1 Authentification

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/auth/register` | POST | `services/auth.ts:19-22` ← `app/onboarding/profile-details.tsx:202-212` | `{ email, password, firstName, lastName, birthDate (ISO), gender: 'H' ou 'F', city: "Région, Pays", telephone?, job }` | `auth/auth.controller.ts:19-25` → `RegisterDto` (`auth/dto/register.dto.ts:10-62`) | — | **201** `{ success, message, email, otpDebugCode }` (`auth/auth.service.ts:110-115`). 400 : date invalide, < 18 ans, > 120 ans (`auth.service.ts:20-35`) ou champ inconnu / `password` < 8. 409 : email ou téléphone déjà utilisé (`auth.service.ts:46-53`) | ⚠ `meetingScope` est collecté à l'étape 3 (`profile-details.tsx:151,377`) mais **jamais envoyé**, alors que le DTO l'accepte (`register.dto.ts:58-61`) et que le backend s'en sert pour pré-remplir `M0_Q02` (`auth.service.ts:80-99`). Comme `M0_Q02` n'est plus jamais posée (`interview/questions.service.ts:42`), le périmètre géographique n'est **jamais renseigné** ⇒ filtre géographique du matching inopérant (`matching/matching.service.ts:77,125-153`). ⚠ `otpDebugCode` renvoyé en clair (fuite OTP). App : n'utilise pas la réponse, redirige vers `/verify` (`profile-details.tsx:215-228`). Le type `RegisterData.password` est optionnel côté app (`auth.ts:5`) mais requis côté DTO ⇒ 400 si absent. |
| `/auth/login` | POST | `services/auth.ts:24-27` ← `app/(auth)/login.tsx:136`, `profile-details.tsx:245` | `{ email, password }` | `auth.controller.ts:44-51` `@HttpCode(200)` → `LoginDto` | — | **200** `{ access_token, refresh_token, userId }` (`auth.service.ts:232-236`) **ou** 200 `{ isVerified: false, message, email }` si compte non vérifié (`auth.service.ts:200-204`, renvoie un OTP). 401 « Adresse e-mail ou mot de passe incorrect » (`auth.service.ts:180,185`). 400 email invalide. | ✔ L'app gère les deux formes (`login.tsx:139`, `profile-details.tsx:248`). Mineur : `lastLogin` jamais mis à jour côté backend. |
| `/auth/refresh` | POST | `services/auth.ts:29-33` ← intercepteur 401 `services/api.ts:140-186` (appel `api.ts:160-161`) | `{ refreshToken }` | `auth.controller.ts:53-60` `@HttpCode(200)` → `RefreshDto` | — | **200** `{ access_token, refresh_token, userId }` ; 401 « Refresh token expired or invalid » / « Access Denied » (`auth.service.ts:239-264`) | ✔ Rotation gérée (`api.ts:164-165`). Échec ⇒ `storage.clearSession()` + `triggerGlobalSignOut()` (`api.ts:176-178`). Un seul `hashedRefreshToken` par utilisateur (`prisma/schema.prisma:41`) ⇒ une connexion sur un 2ᵉ appareil invalide le refresh du 1ᵉʳ. |
| `/auth/social-login` | POST | **Wrapper supprimé** de `services/auth.ts` (copie de travail) mais encore appelé : `app/(auth)/login.tsx:193` `AuthService.socialLogin(provider, \`token_${socialId}\`, mockProfile)` | (HEAD) `{ provider, token, profile: { email, firstName, lastName, id } }` | `auth.controller.ts:62-69` `@HttpCode(200)` → `SocialLoginDto` (`auth/dto/social-login.dto.ts`) | — | 200 `{ access_token, refresh_token, userId }` ; 400 DTO | ✖ **Référence cassée** : `AuthService.socialLogin` n'existe plus ⇒ erreur TypeScript / `is not a function` au clic Google/Facebook. De plus le flux est un mock (`login.tsx:185-191`) : token `token_user_google_official` non préfixé `mock_` ⇒ le backend tente une vérification Google qui échoue puis **crée un compte fictif** avec le `profile` fourni (`auth.service.ts:435-468,494-515`). |
| `/auth/verify-email` | POST | `services/auth.ts:46-49` ← `app/(auth)/verify.tsx:96` | `{ email, code }` (4 chiffres) | `auth.controller.ts:27-34` `@HttpCode(200)` → `VerifyEmailDto` (`@Length(4,6)`, `verify-email.dto.ts:13`) | — | **200** `{ access_token, refresh_token, userId }` ; 400 « Code de vérification incorrect » (`auth.service.ts:135`) ; 404 utilisateur inconnu (`auth.service.ts:124`) | ✔ App lit `access_token/userId/refresh_token` (`verify.tsx:97-99`). ⚠ Code passe-partout `1234` accepté en prod (`auth.service.ts:131-132`). Si déjà vérifié, renvoie des tokens sans vérifier le code (`auth.service.ts:127-129`). |
| `/auth/resend-verification` | POST | `services/auth.ts:51-54` ← `verify.tsx:117` | `{ email }` | `auth.controller.ts:36-42` `@HttpCode(200)` | — | 200 `{ success, message }` ; 404 | ✔ Pas de limitation spécifique (hors throttler global) ⇒ spam d'e-mails possible. |
| `/auth/forgot-password` | POST | `services/auth.ts:36-39` — **aucun écran ne l'appelle**. `login.tsx:349` pousse `/(auth)/forgot-password`, écran déclaré dans `app/(auth)/_layout.tsx:13` mais **fichier absent** | `{ email }` | `auth.controller.ts:71-78` `@HttpCode(200)` | — | 200 `{ success, message }` ; 404 « Aucun compte associé » (`auth.service.ts:527`) | ✖ Route mobile inexistante (navigation vers un écran manquant). 404 sur email inconnu ⇒ énumération d'adresses. |
| `/auth/reset-password` | POST | `services/auth.ts:41-44` — non appelé (écran `reset-password` déclaré `app/(auth)/_layout.tsx:14`, fichier absent) | `{ email, code, newPassword }` | `auth.controller.ts:80-87` `@HttpCode(200)` → `ResetPasswordDto` | — | 200 `{ success, message }` ; 400 code incorrect / expiré / demande invalide (`auth.service.ts:557-567`) | ✖ Non câblé côté app. `newPassword` optionnel dans le wrapper (`auth.ts:41`) mais requis (min 8) côté DTO. |
| `/auth/delete-account` | DELETE | `app/(tabs)/profile.tsx:81` | — | `auth.controller.ts:89-96` `@HttpCode(200)` | JWT | 200 `{ success, message }` ; 401 ; 404 (`auth.service.ts:266-427`) | ✔ Suppression en cascade manuelle dans une transaction. |

### 1.2 Entretien IA (`@Controller('interview')`, JWT sur toute la classe `interview/interview.controller.ts:9-11`)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/interview/status` | GET | `services/interview.ts:28-31` ← `app/index.tsx:56`, `app/(tabs)/_layout.tsx:23`, `login.tsx:160,197` | — | `interview.controller.ts:24-28` | JWT | 200 `{ interviewId, status: 'en_cours' ou 'termine', completedModules: number[], currentModule, isCompleted }` (`interview/interview.service.ts:13-53`) | ✔ App lit `isCompleted`, `currentModule`. Effet de bord : un GET **crée** un entretien s'il n'en existe pas (`interview.service.ts:33-41`). |
| `/interview/questions/:moduleNumber` | GET | `services/interview.ts:33-44` ← `app/interview/[moduleNumber].tsx:61` | — | `interview.controller.ts:18-22` → `questions.service.ts:9-62` | JWT | 200 `Question[]` `{ id, moduleNumber, text, options: [{ key, text }], rules? }` (`interview/questions.data.ts:16-22`). Jamais 404 : module inconnu ou `NaN` ⇒ `[]` | ⚠ Le type app attend `assistance?` et `dependsOn?` (`interview.ts:8-17`) : **jamais envoyés** (le filtrage `dependsOn` est fait côté serveur). Une question déjà répondue est exclue (`questions.service.ts:39`) ⇒ un module peut renvoyer `[]` ; l'écran n'a alors **aucun moyen de continuer** (`handleModuleComplete` n'est appelé qu'après une réponse, `[moduleNumber].tsx:119-128`). |
| `/interview/save-module` | POST | `services/interview.ts:63-67` ← `[moduleNumber].tsx:134` | `{ moduleNumber, moduleName, answers: Record<questionId, optionKey> }` | `interview.controller.ts:56-59` (alias de `submit-module`, `:36-41`) → `SaveModuleDto` (`interview/dto/save-module.dto.ts:4-21`) | JWT | **201** `{ success: true, allModulesCompleted }` (`interview.service.ts:118`). 400 : `moduleNumber` hors 0-10, `answers` non objet, champ inconnu | ✔ Payload conforme au DTO. Fusion des réponses si le module existe déjà (`interview.service.ts:86-97`). |
| `/interview/save-module` (fin d'entretien) | POST | `services/interview.ts:96-100` (`completeInterview`) ← `app/interview/generation.tsx:34` | `{ moduleNumber: 10, moduleName: 'Alchimie, Vibe & Désir', answers: {} }` | idem | JWT | 201 `{ success, allModulesCompleted: true }` puis **génération IA synchrone** (`interview.service.ts:114-135,287-341`) | ⚠ L'écran module enchaîne 0→9 puis `/interview/generation` (`[moduleNumber].tsx:136-145`) : les **6 questions du module 10** (`questions.data.ts`) ne sont jamais posées, le module est validé vide pour atteindre les 11 réponses requises. ⚠ Appel IA (OpenRouter) dans la requête : timeout axios 60 s (`api.ts:44`), aucun retry (`completeInterview` n'a pas la boucle de `saveModule`), et en cas d'échec l'écran reste sur « Oups » (`generation.tsx:46-49`). Si l'IA échoue après le passage en `termine`, la carte mentale sera regénérée au premier `GET /interview/summary` (`interview.service.ts:153-175`). |
| `/interview/summary` | GET | `services/interview.ts:104-107` ← `app/interview/summary.tsx:256` | — | `interview.controller.ts:43-47` (alias `mental-map` `:49-53`) | JWT | 200 `{ firstName, synthesis, bio, maturityScore (0-100), alchemyScore, keyValues[], needsList[], redFlags[], pillars[] }` (`interview.service.ts:274-284`) | ✔ App lit `pillars`, `maturityScore`, `synthesis`, `keyValues`, `needsList` (`summary.tsx:258-272`). Mineur : sans carte mentale le backend renvoie des **valeurs par défaut en 200** (jamais 404) — l'app ne peut pas distinguer un vrai bilan d'un placeholder. |

### 1.3 Profil (`@Controller('profile')`, JWT `profile/profile.controller.ts:8-10`)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/profile/me` | GET | `app/(tabs)/profile.tsx:40`, `app/profile/edit.tsx:24` | — | `profile.controller.ts:14-20` → `profile.service.ts:9-47` | JWT | 200 `{ id, userId, mainPhoto, secondaryPhotos, description, displayedCity, profession, profileStatus, user: { id, email, telephone, firstName, lastName, gender, birthDate, city, accountStatus, creditBalance, isVerified, createdAt }, mentalMap: MentalMap ou null }` ; 404 « Profile not found » | ✔ Champs consommés présents (`profile.tsx:104-112,117-120`, `edit.tsx:26-40`). |
| `/profile/me` | PATCH | `app/profile/edit.tsx:56-64` | `{ firstName, lastName, telephone, city, description, profession, displayedCity }` — toutes des chaînes, **éventuellement vides `''`** | `profile.controller.ts:22-27` → `UpdateProfileDto` (`profile/dto/update-profile.dto.ts:4-47`) | JWT | 200 profil complet (même forme que GET, `profile.service.ts:95`) ; 400 validation ; 404 | ✖ `profession: ''` : `@IsOptional` n'ignore que `null`/`undefined`, donc `@MinLength(2)` (`update-profile.dto.ts:21-25`) échoue ⇒ **400** « profession must be longer than or equal to 2 characters » alors que l'app laisse passer une profession vide (`edit.tsx:49`). ✖ `telephone: ''` est écrit tel quel dans `User.telephone @unique` (`schema.prisma:37`, `profile.service.ts:79-83`) ⇒ dès le 2ᵉ utilisateur sans téléphone : Prisma P2002 ⇒ **500**. Mineur : `mainPhoto` accepté mais jamais envoyé (pas d'upload photo). |

### 1.4 Matching (`@Controller('matching')`, JWT `matching/matching.controller.ts:5-6`, **aucun DTO**)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/matching/my-matches` | GET | `context/AppContext.tsx:89` (cache 20 s), `app/(tabs)/discover.tsx:545,676,707`, `app/(tabs)/messages.tsx:1023` | — | `matching.controller.ts:15-18` → `matching.service.ts:346-437` | JWT | 200 `[{ id (userId partenaire), name, compatibility (0-100), profession, location, phase: 'attente' ou 'sondeur' ou 'chat' ou 'video' ou 'contacts', journeyId ou null, proposalStatus, videoEnabled, testUnlock, contactsExchanged, slogan, mentalMap[], aiAnalysis, positivePoints[], warningPoint, details, interests[], threeWords[], expectations[] }]` (`matching.service.ts:385-422`) | ✔ Champs consommés présents (`messages.tsx:115-137`, `discover.tsx:485-506`, `(tabs)/index.tsx:235-244`). ⚠ Le backend n'envoie ni `stepStartDate` ni `currentDay` ⇒ `phaseDay` est **toujours 1** dans l'app (`messages.tsx:119`) : la progression « J1/J3 » affichée est fictive. Effet de bord : chaque appel exécute l'auto-avancement des parcours (`matching.service.ts:349,257-302`). |
| `/matching/received-likes` | GET | `discover.tsx:554` | — | `matching.controller.ts:28-31` → `matching.service.ts:493-524` | JWT | 200 `[{ id (proposalId), userId, name, firstName, compatibility, profession, location, slogan, mentalMap[], createdAt }]` | ✔ `id` utilisé comme `proposalId` pour `/matching/accept` (`discover.tsx:663,706`). |
| `/matching/discover` | GET | `discover.tsx:568` | — | `matching.controller.ts:10-13` → `matching.service.ts:13-253` | JWT | 200 `[{ id, firstName, age, location, distance, profession, compatibility, slogan, aiAnalysis, positivePoints[], warningPoint, details{}, interests[], threeWords[], expectations[], mentalMap[] }]`. `[]` si l'utilisateur a déjà un match/invitation active (`matching.service.ts:29-42`) | ✔ Tous les champs mappés (`discover.tsx:575-617`) sont fournis. |
| `/matching/connect` | POST | `discover.tsx:674` (après `POST /credit/spend`, voir § 1.5) | `{ targetUserId }` | `matching.controller.ts:20-26` → `matching.service.ts:440-490` | JWT | **201** `{ success: true, match, message }` ; ou 201 `{ success: false, message: 'Match déjà existant' }` (`:451-457`) ; ou, si like réciproque, 201 `{ success, match, journey, message }` (`acceptMatch`, `:608-613`) | ⚠ App teste `success && journey` (`discover.tsx:675`) ✔. ✖ Pas de DTO : `targetUserId` absent/invalide ⇒ erreur Prisma ⇒ **500**. ✖ Le backend **ne vérifie ni ne débite les crédits** : le débit est un appel séparé côté app (`discover.tsx:666`) ⇒ crédit perdu si `connect` échoue, match gratuit si `connect` est appelé directement. Mineur : `success:false` renvoyé en 201 au lieu de 409. |
| `/matching/accept` | POST | `discover.tsx:706` | `{ proposalId }` | `matching.controller.ts:33-39` → `matching.service.ts:527-614` | JWT | 201 `{ success, match, journey, message }` ; ou 201 `{ success: false, message }` (proposition introuvable / pas destinataire / déjà traitée, `:532-542`) — **jamais 403/404/409** | ⚠ App ignore le corps et relit `my-matches` ; un refus métier passe donc inaperçu (crédit déjà débité). |

### 1.5 Crédits (`@Controller('credit')`, JWT `credit/credit.controller.ts:5-6`, **aucun DTO**) — nouveau dans la copie de travail

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/credit/balance` | GET | `context/AppContext.tsx:49` (au login), `services/payment.ts:82-85` | — | `credit.controller.ts:10-13` → `credit.service.ts:9-16` | JWT | 200 `{ credits }` | ✔ Source de vérité du badge « crédits » (`discover.tsx:756,791`). |
| `/credit/spend` | POST | `context/AppContext.tsx:64` ← `discover.tsx:666,697` | `{ amount: 1, description }` | `credit.controller.ts:15-25` → `credit.service.ts:19-62` | JWT | **201** `{ success, newBalance, transaction }` ; 400 « Solde insuffisant… » (`credit.service.ts:29-33`) ; 400 utilisateur inconnu | ✖ `spendCredit` renvoie désormais un objet `SpendResult { ok, reason, insufficient }` (`AppContext.tsx:8-14,66,70`) mais `discover.tsx:667,698` fait `if (!ok)` ⇒ **jamais vrai** : le cas « solde insuffisant » n'est pas détecté et l'app enchaîne sur `connect`. Correctif : `if (!ok.ok)`. ✖ Pas de DTO : `amount` négatif ou non numérique accepté (`decrement: amount`) ⇒ crédit gratuit. |
| `/credit/add` | POST | non appelé | `{ amount, description }` | `credit.controller.ts:27-37` | JWT | 201 `{ success, newBalance, transaction }` | ✖ **Sécurité** : tout utilisateur authentifié peut se créditer sans paiement. À restreindre (admin/webhook) ou supprimer. |
| `/credit/history` | GET | non appelé | — | `credit.controller.ts:39-42` | JWT | 200 `CreditTransaction[]` (20 derniers) | Non utilisé. |

### 1.6 Parcours Harmonie / chat (`@Controller('journey')`, JWT `journey/journey.controller.ts:6-7`, **aucun DTO**)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/journey/:id/status` | GET | `app/(tabs)/index.tsx:385` | — | `journey.controller.ts:14-17` → `journey.service.ts:112-141` | JWT | 200 `{ id, currentStep, currentDay (1-3), partnerName, isCompleted }` ; 404 « Parcours non trouvé » | ⚠ **Aucun contrôle d'appartenance** : tout utilisateur connecté peut lire le statut de n'importe quel parcours (`userId` sert seulement à choisir `partnerName`). |
| `/journey/:id/questions` | GET | `index.tsx:386` | — | `journey.controller.ts:19-22` → `journey.service.ts:248-273` | JWT | 200 `[{ id, journeyId, day, theme, emoji, questionText, options: string[] ou null, sentAt, responses: [{ id, questionId, userId, responseText, respondedAt, delayHours }] }]` ; 404 | ✔ App lit `day/theme/emoji/id/questionText/options/responses[].userId/responseText` (`index.tsx:296-333,401-427`). Effet de bord : génère les 21 questions (appel IA lent) au premier GET (`journey.service.ts:256,144-184`). ✖ **Aucun contrôle d'appartenance** ⇒ fuite des réponses des deux partenaires à quiconque connaît l'id. |
| `/journey/respond` | POST | `index.tsx:470` | `{ questionId, text }` | `journey.controller.ts:24-34` → `journey.service.ts:477-504` | JWT | **201** `HarmonyResponse` `{ id, questionId, userId, responseText, respondedAt, delayHours }` ; 400 modération locale/IA (`:479-490`) | ⚠ Pas de vérification que l'utilisateur appartient au parcours de la question ; pas d'unicité (double réponse possible) ; `questionId` inconnu ⇒ violation FK Prisma ⇒ **500** (pas 404). App ignore le corps. |
| `/journey/message` | POST | `app/(tabs)/messages.tsx:597` | `{ journeyId, content, type: 'texte' }` | `journey.controller.ts:36-47` → `journey.service.ts:507-562` | JWT | **201** `Message` `{ id, journeyId, senderId, content (masqué), type, sentAt, isRead, moderationStatus, sender: { id, firstName } }` + diffusion WS `newMessage` (`:560`) ; 404 parcours ; 403 non membre ; 400 étape < `chat_libre` ou modération (`:512-541`) | ✔ Mapping `sender.id === userId` (`messages.tsx:94`). App affiche `message` serveur sur 400 (`messages.tsx:612-619`). ⚠ `type` non validé (`type as any`, `:548`) ⇒ valeur hors enum `MessageType` ⇒ Prisma ⇒ 500. |
| `/journey/:id/messages` | GET | `messages.tsx:486,1034` | — | `journey.controller.ts:49-52` → `journey.service.ts:565-576` | JWT | 200 `Message[]` (même forme, `moderationStatus: 'ok'` uniquement, ordre `sentAt` asc, **sans limite**) | ✖ **Aucun contrôle d'appartenance** (contrairement à `POST /journey/message`). |
| `/journey/chat-access` | GET | `messages.tsx:1011` (cache 30 s) | — | `journey.controller.ts:54-57` → `journey.service.ts:31-55` | JWT | 200 `{ canAccess, message }` | ✔ Effet de bord : auto-avancement + « Règle de Justice » (`journey.service.ts:33,626-781`). |
| `/journey/:id/exchange-contact` | POST | `messages.tsx:849` | `{ sharePhone: true, shareEmail: true }` | `journey.controller.ts:73-80` → `journey.service.ts:784-849` | JWT | **201** `{ consentA, consentB, phoneShared, emailShared, exchangedAt, bothAccepted }` | ✖ Parcours introuvable / non-membre ⇒ `throw new Error(...)` (`:790-793`) ⇒ **500** au lieu de 404/403. ⚠ L'app passe en « contacts révélés » **sans attendre `bothAccepted`** (`messages.tsx:854-856`, commentaire « TEST »). |
| `/journey/:id/contact-exchange` | GET | `messages.tsx:831,857` | — | `journey.controller.ts:82-88` → `journey.service.ts:852-886` | JWT | 200 `{ myConsent, partnerConsent, bothAccepted, phoneShared, emailShared, partner: { firstName, telephone, email, profession, displayedCity } }` | ✖ **Sécurité** : `partner.telephone` et `partner.email` sont renvoyés **même si `partnerConsent === false`** (`:878-884`) ; l'app les affiche dès son propre consentement. ✖ Erreurs en `Error` brut ⇒ 500 (`:862-865`). |
| `/journey/sondeur-progress` | GET | non appelé | — | `journey.controller.ts:59-62` | JWT | 200 `{ hasJourney, currentStep, sondeurCompleted, answeredCount, totalQuestions, partnerName, journeyId? }` | Non utilisé (l'app recalcule depuis `/questions`). |
| `/journey/:id/advance` | PATCH | non appelé | `{ step }` | `journey.controller.ts:64-71` → `journey.service.ts:889-918` | JWT | 201/200 `{ success, currentStep }` ; `Error` brut ⇒ 500 | ⚠ Permet à un membre de **sauter librement les étapes** (`chat_libre` → `termine`). |
| `/journey/:id/video/session`, `/journey/:id/video/join`, `/journey/:id/video/end` | GET/POST | non appelés | `{ durationSec? }` | `journey.controller.ts:90-107` | JWT | idem § 1.7 | Doublons de `/video/*`. |

### 1.7 Vidéo (`@Controller('video')`, JWT `video/video.controller.ts:5-6`)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/video/session/:journeyId` | GET | `services/video.ts:38-41` ← `app/video-call.tsx:114` | — | `video.controller.ts:10-14` → `video/video-call.service.ts:63-84` | JWT | 200 `{ journeyId, currentStep, canJoin, testUnlock, dailyConfigured: true, maxDurationSec: 120, partnerName, videoSession: { status, startDate, endDate } ou null }` ; 404 ; 403 non membre (`:52-58`) | ✔ App lit `dailyConfigured/canJoin/currentStep/partnerName/maxDurationSec` (`video-call.tsx:117-137`). Mineur : `dailyConfigured` est une **constante `true`** (`video-call.service.ts:73`, fallback Jitsi) ⇒ branche d'erreur `video-call.tsx:117-123` morte. |
| `/video/call-token` | POST | `services/video.ts:43-46` ← `video-call.tsx:140` | `{ journeyId }` | `video.controller.ts:22-26` → `video-call.service.ts:86-215` (même service que `POST /video/join/:journeyId`, `:16-20`) | JWT | **201** `{ meetingUrl, roomName, partnerName, maxDurationSec, provider: 'daily' ou 'jitsi' }` ; 400 étape non vidéo (`:89-95`) ; 403 ; 404. Effets : upsert `VideoSession`, WS `incomingCall`, push (`:168-206`) | ✔ Conforme. (HEAD utilisait `POST /video/join/:id`, équivalent.) |
| `/video/end` | POST | `services/video.ts:48-54` ← `video-call.tsx:74` | `{ journeyId, durationSec }` | `video.controller.ts:28-32` → `video-call.service.ts:217-259` | JWT | 201 `{ success, advanced, currentStep }` | ✔ Conforme dans la copie de travail. ✖ **HEAD** envoyait `{ callId, durationOrReason }` (`git show HEAD:services/video.ts`) ⇒ `journeyId` undefined ⇒ Prisma ⇒ 500 ⇒ parcours jamais avancé vers `echange_contacts`. Note : `durationSec < 10` ⇒ pas d'avancement (`:238`) ; l'app envoie `Math.max(1, écoulé)` (`video-call.tsx:74-77`). |

### 1.8 Paiement (`@Controller('payment')`, **aucun DTO**)

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/payment/create-payment-intent` | POST | `services/payment.ts:63-69` ← `app/onboarding/payment.tsx:123` | `{ optionId }` (+ `promoCode` si fourni — jamais le cas) | `payment.controller.ts:30-41` (alias `create-intent` `:44-55`) → `payment.service.ts:157-242` | JWT | **201** `{ paymentIntent (client_secret), ephemeralKey, customer, publishableKey, finalAmount, originalAmount, discount, isMock? }` ; 400 utilisateur inconnu / promo invalide / montant 0 / erreur Stripe en prod (`:159-175,240`). Hors prod ou sans `STRIPE_SECRET_KEY` : réponse **mock 201** avec `isMock: true` (`:225-239`) | ✖ L'app propose deux offres codées en dur, `parcours_harmonie` (15 €, 1 crédit) et `harmonie_premium` (50 €, 5 crédits) (`payment.tsx:75-111`), alors que le backend ne connaît que `parcours_harmonie` et **retombe silencieusement dessus** (`payment.service.ts:26-38`) ⇒ un client « Premium » paie 15 € et reçoit 1 crédit. `GET /payment/plans` (wrapper `getPlans`, `payment.ts:58-61`) n'est pas utilisé par l'écran. ✖ Les crédits ne sont ajoutés que par le **webhook Stripe** (`payment.controller.ts:58-66`, `payment.service.ts:291-297`) ; l'app appelle `addCredits(...)` (`payment.tsx:64,129,150,164`) qui **n'existe plus** dans `AppContext` ⇒ erreur TS/runtime ; il faudrait `refreshCredits()` après `presentPaymentSheet` (avec gestion du délai webhook). ✖ En mode `isMock` ou web (`payment.tsx:126-134`) l'app affiche « succès » sans crédit réel. Mineur : `publishableKey` renvoyé ignoré (clé `pk_test` codée en dur `app/_layout.tsx:8-10`). |
| `/payment/plans` | GET | wrapper `payment.ts:58-61`, non appelé | — | `payment.controller.ts:10-13` | — | 200 `{ plans: [{ id, name, price, currency, priceDisplay, credits, description, features[], guarantee, badge, promoCodes }] }` | Non utilisé. |
| `/payment/check-promo`, `/payment/apply-promo` | POST | wrappers `payment.ts:71-80`, non appelés | `{ code, optionId }` | `payment.controller.ts:16-27,69-80` | JWT | 201 `{ isValid, isFree, originalAmount, finalAmount, discountEur, message }` / 201 `{ success, isFree, newAmount, newAmountDisplay, message, discountEur, promoCodeId? }` ; 400 | Aucun champ « code promo » dans l'UI. Codes « legacy » en dur (`BOLIGO100`, `HARMONIE`, `WELCOME`, `BOLIGO50`, `BIENVENUE5`, `payment.service.ts:127-133`) toujours actifs et **gratuits**. |
| `/payment/confirm` | POST | (HEAD `services/payment.ts` `processPayment`) — supprimé dans la copie de travail | `{ paymentIntentId }` | **inexistante** | — | 404 | Écart HEAD corrigé par suppression. |

### 1.9 Notifications, signalement, chat REST

| Endpoint | Méthode | Appelé depuis | Payload envoyé | Route backend | Auth | Réponse backend | Écart / Constat |
|---|---|---|---|---|---|---|---|
| `/notifications/push-token` | POST | `services/notifications.ts:71` ← `context/auth.tsx:36-42` (au démarrage et après `signIn`) | `{ pushToken: 'ExponentPushToken[…]' }` | `notifications/notification.controller.ts:14-19` → `RegisterPushTokenDto` (`dto/register-push-token.dto.ts:4-12`) | JWT | **201 objet `User` complet** (`prisma.user.update`, `notification.service.ts:12-18`) | ✖ **Fuite de données** : la réponse contient `passwordHash`, `hashedRefreshToken`, `verificationCode`, `resetCode`, `resetCodeExpires`, `pushToken`… (aucun `select`). L'app ignore le corps mais il transite en clair côté client. HEAD : jamais appelé (stub renvoyait `null`) ⇒ aucune push livrée (`notification.service.ts:44`). |
| `/report` | POST | non appelé | `{ reportedUserId?, messageId?, reason, description? }` | `report/report.controller.ts:11-23` | JWT | 201 `{ success, reportId, message }` ; 400 ; 404 | Aucune UI de signalement (bouton « ⋮ » inerte, `messages.tsx:671-673`). `reason` non validé contre l'enum ⇒ Prisma ⇒ 500. |
| `/chat/journeys/:id/messages`, `/chat/unread-count`, `/chat/journeys/:id/last-message`, `/chat/journeys/:id/read` | GET/POST | non appelés | — | `chat/chat.controller.ts:10-29` | JWT | 200 / 201 `{ success }` | ⚠ Bug latent : `req.user.userId` (`chat.controller.ts:17,27`) est `undefined` (la stratégie expose `req.user.id`, `jwt.strategy.ts:24-25`) ⇒ `unread-count` = 0 et `read` marque les messages du mauvais utilisateur. Sans effet tant que l'app n'appelle pas ces routes. |

---

## 2. WebSocket (Socket.IO)

Client : `services/chatSocket.ts` (copie de travail) — une instance partagée, `io(SOCKET_URL, { transports: ['websocket'], autoConnect: false, reconnection: true, auth: cb => cb({ token }) })` (`chatSocket.ts:60-75`), le token étant relu à chaque (re)connexion depuis `storage` (`:69-74`). Serveur : `chat/chat.gateway.ts` (`@WebSocketGateway({ cors: { origin: '*' } })`, namespace `/`, chemin `/socket.io`, non affecté par le préfixe `/api`).

### 2.1 Connexion / authentification

| Aspect | Client | Serveur | Constat |
|---|---|---|---|
| Transmission du JWT | `handshake.auth.token` (`chatSocket.ts:69-74`) | `client.handshake.auth.token` ou header `Authorization: Bearer` (`chat.gateway.ts:35`) | ✔ Conforme (README backend `chat/README.md:91-111`). **HEAD** : aucun `auth` (`git show HEAD:services/chatSocket.ts:25-28`) ⇒ `client.disconnect()` immédiat (`chat.gateway.ts:37-40`) ⇒ le temps réel n'a jamais fonctionné. |
| Vérification | — | `jwtService.verify(token)` avec le secret du `ChatModule` (`chat/chat.module.ts:41` : `JWT_SECRET` ou `'your-secret-key'`) | ✔ Même secret que la signature (`auth/auth.module.ts:14`, `auth.service.ts:214-217`) tant que `JWT_SECRET` est défini. Mineur : trois secrets de repli différents (`'fallback-secret-key'` `jwt.strategy.ts:11`, `'your-secret-key'` `chat.module.ts:41`, `undefined` `auth.module.ts:14`). |
| Token invalide / expiré | écoute `connect_error` et `disconnect` en log (`chatSocket.ts:83-84`) | `client.disconnect()` **sans message** (`chat.gateway.ts:56-59`) | ⚠ Le client ne reçoit aucune raison exploitable (`reason = 'io server disconnect'`, pas de reconnexion automatique dans ce cas). Après un refresh HTTP, `connectChatSocket()` recrée une instance avec le nouveau token (`chatSocket.ts:97-108`) ✔. |
| Rooms | rejoint `journey:<id>` via `joinJourney` (`chatSocket.ts:119-123`), re-jointure après reconnexion (`:77-82`) | à la connexion, rejoint automatiquement **toutes** les rooms des parcours `result: 'en_cours'` (`chat.gateway.ts:50-54`, `chat.service.ts:101-116`) | ⚠ Le listener `newMessage` de l'écran ne filtre pas par `journeyId` (`messages.tsx:528-543`) : un message d'un autre parcours actif s'afficherait dans la conversation ouverte (peu probable avec la règle « 1 match actif », mais non protégé). |

### 2.2 Événements client → serveur

| Événement | Émis par le client | Handler serveur | Payload | Réponse serveur | Constat |
|---|---|---|---|---|---|
| `joinJourney` | `chatSocket.ts:81,122` ← `messages.tsx:516` | `chat.gateway.ts:70-90` | `{ journeyId }` | `messageHistory` (Message[] avec `sender { id, firstName, lastName }`, 50 max, `chat.service.ts:43-65`) ou `error { message }` si non membre | ✔ Noms alignés. **HEAD** émettait `joinRoom` (`git show HEAD:services/chatSocket.ts:35`) ⇒ ignoré par le serveur. |
| `leaveJourney` | `chatSocket.ts:128` ← `messages.tsx:563` | `chat.gateway.ts:92-99` | `{ journeyId }` | — | ✔ (HEAD : `leaveRoom` ✖). |
| `sendMessage` | **jamais** (l'envoi passe par `POST /journey/message`) | `chat.gateway.ts:101-149` | `{ journeyId, content, type? }` | `newMessage` à la room, push si destinataire hors ligne | ⚠ Cohérent côté app, mais le chemin WS **n'applique ni modération ni contrôle d'étape** (`chat.service.ts:9-41` vs `journey.service.ts:520-541`) ⇒ contournement possible par un client WS quelconque. `type` casté sans validation (`chat.gateway.ts:113`). |
| `markAsRead` | fonction `markJourneyAsRead` définie (`chatSocket.ts:132-136`) mais **jamais appelée** | `chat.gateway.ts:151-173` | `{ journeyId }` | `messagesRead { journeyId }` à l'autre utilisateur | ✖ `isRead` n'est jamais mis à jour depuis l'app ⇒ `unread-count` faux, accusés de lecture inexistants (`mapApiMessageToUi` force `isRead ?? true`, `messages.tsx:96`). |
| `typing` | fonction `sendTypingState` définie (`chatSocket.ts:138-142`), **jamais appelée** | `chat.gateway.ts:180-192` | `{ journeyId, isTyping }` | `userTyping { userId, isTyping }` | ✖ Non câblé dans l'UI. |
| `callUser` | jamais | `chat.gateway.ts:203-215` | `{ journeyId, callerName }` | `incomingCall` aux autres membres de la room | Non utilisé : l'appel entrant est diffusé par le backend lors de `POST /video/call-token` (`video-call.service.ts:172`, `chat.gateway.ts:195-201`). |
| `rejectCall` | jamais | `chat.gateway.ts:217-227` | `{ journeyId }` | `callRejected { journeyId, userId }` | Non câblé. |

### 2.3 Événements serveur → client

| Événement | Émis par le serveur | Écouté par le client | Payload | Constat |
|---|---|---|---|---|
| `messageHistory` | `chat.gateway.ts:86` | `messages.tsx:545` | `Message[]` (`sender { id, firstName, lastName }`, contenu **non masqué**) | ✔ Type `ChatSocketMessage` compatible (`chatSocket.ts:21-30`). Différence mineure avec HTTP : le contenu n'est pas passé par `maskProfanityForDisplay` (l'app masque elle-même, `messages.tsx:93`). |
| `newMessage` | `chat.gateway.ts:117` (WS) et `:176-178` via `journey.service.ts:560` (HTTP) | `messages.tsx:546` | `Message` (HTTP : `sender { id, firstName }`, contenu masqué) | ✔ Déduplication par `id` et remplacement du message « sending » (`messages.tsx:534-541`). |
| `messagesRead` | `chat.gateway.ts:167` | **non écouté** | `{ journeyId }` | ✖ |
| `userTyping` | `chat.gateway.ts:188` | **non écouté** | `{ userId, isTyping }` | ✖ |
| `incomingCall` | `chat.gateway.ts:196-201,210-214` | **non écouté** | `{ journeyId, callerId, callerName }` | ✖ L'appelé n'est prévenu que par notification push (et seulement si le push token est enregistré). |
| `callRejected` | `chat.gateway.ts:223-226` | **non écouté** | `{ journeyId, userId }` | ✖ |
| `error` | `chat.gateway.ts:88,147,171` | `chatSocket.ts:85` (log uniquement) | `{ message }` | ⚠ Non remonté à l'utilisateur (un `joinJourney` refusé est silencieux ; l'écran retombe sur le polling HTTP `fetchMessages`, `messages.tsx:547,570`). |

---

## 3. Écarts

### 3.1 Écarts bloquants (du plus grave au moins grave)

1. **Références cassées entre écrans et services refactorés (copie de travail)** — l'app ne compile pas / plante :
   - `app/(auth)/login.tsx:193` appelle `AuthService.socialLogin`, supprimé de `services/auth.ts` ;
   - `app/onboarding/payment.tsx:64,129,150,164` utilise `addCredits`, supprimé de `context/AppContext.tsx` ;
   - `app/(tabs)/discover.tsx:667,698` : `if (!ok)` sur un `SpendResult` (objet, toujours truthy, `AppContext.tsx:8-14`) ⇒ un 400 « solde insuffisant » de `POST /credit/spend` n'est jamais détecté ;
   - `app/(auth)/login.tsx:349` navigue vers `/(auth)/forgot-password` ; l'écran (et `reset-password`) est déclaré dans `app/(auth)/_layout.tsx:13-14` mais les fichiers n'existent pas.
2. **Paiement non aligné** — offre `harmonie_premium` (50 €, 5 crédits, `payment.tsx:93-110`) inconnue du backend qui facture silencieusement `parcours_harmonie` 15 €/1 crédit (`payment.service.ts:26-38`) ; crédits ajoutés uniquement par le webhook Stripe (`payment.service.ts:275-297`) sans rafraîchissement du solde côté app après paiement ; mode `isMock`/web affiché comme un succès sans crédit (`payment.tsx:126-134`).
3. **Crédits contournables (backend)** — `POST /credit/add` ouvert à tout utilisateur (`credit.controller.ts:27-37`) ; `POST /credit/spend` sans validation (`amount` négatif ⇒ crédit gratuit, `credit.service.ts:36-41`) ; `POST /matching/connect` et `/matching/accept` ne vérifient ni ne débitent les crédits (`matching.service.ts:440-490,527-614`) ⇒ le débit côté app (`discover.tsx:666,697`) est facultatif et non atomique.
4. **Fuites de données (backend)** — `GET /journey/:id/questions`, `/messages`, `/status` sans contrôle d'appartenance (`journey.controller.ts:14-22,49-52`) ; `GET /journey/:id/contact-exchange` renvoie téléphone/e-mail du partenaire sans son consentement (`journey.service.ts:878-884`) ; `POST /notifications/push-token` renvoie l'objet `User` complet avec `passwordHash`, `hashedRefreshToken`, codes OTP (`notification.service.ts:12-18`) ; `POST /auth/register` renvoie `otpDebugCode` (`auth.service.ts:114`) ; code OTP passe-partout `1234` (`auth.service.ts:131-132`).
5. **Flux entretien / Sondeur incomplet** — `meetingScope` jamais envoyé à `/auth/register` (`profile-details.tsx:202-212`) et `M0_Q02` jamais posée (`questions.service.ts:42`) ⇒ périmètre géographique absent ⇒ filtre géographique inopérant (`matching.service.ts:77,125-153`) ; module 10 jamais posé et validé avec `answers: {}` (`[moduleNumber].tsx:136-145`, `interview.ts:96-100`) ; génération IA synchrone dans `POST /interview/save-module` sans retry côté app (timeout 60 s, `api.ts:44`, `generation.tsx:46-49`).
6. **`PATCH /profile/me` en échec sur champs vides** — `profession: ''` ⇒ 400 (`update-profile.dto.ts:21-25`, `@IsOptional` n'exclut pas `''`) ; `telephone: ''` ⇒ P2002 ⇒ 500 dès deux utilisateurs sans téléphone (`schema.prisma:37`, `profile.service.ts:79-83`). L'écran envoie systématiquement les 7 champs (`edit.tsx:56-64`).
7. **500 au lieu de 4xx** — `exchange-contact`, `contact-exchange`, `advance` lèvent `Error` brut (`journey.service.ts:790-793,862-865,890-905`) ; `connect`, `accept`, `respond`, `message`, `report` sans DTO ⇒ erreurs Prisma sur champ manquant/invalide. L'app affiche alors le message générique « Le serveur rencontre un problème » (`api.ts:130-131`).
8. **Modération contournable via WebSocket** — `sendMessage` WS crée le message sans modération ni contrôle d'étape (`chat.gateway.ts:101-114`, `chat.service.ts:9-41`), contrairement au chemin HTTP (`journey.service.ts:520-541`).

### 3.2 Écarts mineurs

- `phaseDay` toujours 1 côté app (`messages.tsx:119`) : `my-matches` n'expose ni `stepStartDate` ni `currentDay` (`matching.service.ts:385-422`) ; ajouter `currentDay`/`stepStartDate` à la réponse.
- `dailyConfigured` constant `true` (`video-call.service.ts:73`) ⇒ branche d'erreur morte dans `video-call.tsx:117-123`.
- `connect`/`accept` renvoient `{ success: false }` en **201** (`matching.service.ts:456,532-542`) au lieu de 404/403/409 ; l'app ne peut pas distinguer un refus métier d'un succès sans lire le corps.
- POST sans `@HttpCode(200)` renvoient 201 (`save-module`, `connect`, `accept`, `respond`, `message`, `exchange-contact`, `credit/spend`, `video/*`, `payment/*`, `push-token`) — sans effet sur axios, à noter pour la doc.
- `GET /interview/status` crée un entretien (effet de bord d'un GET, `interview.service.ts:33-41`).
- `GET /interview/questions/:n` peut renvoyer `[]` ⇒ écran bloqué sans bouton « continuer » (`[moduleNumber].tsx:119-128`).
- `GET /interview/summary` renvoie des valeurs par défaut en 200 sans carte mentale (`interview.service.ts:177-179,274-284`).
- `Question.assistance`/`dependsOn` attendus par le type app (`interview.ts:13-16`) mais jamais envoyés ; `Question.rules` envoyé mais ignoré.
- `POST /auth/forgot-password` : 404 sur email inconnu ⇒ énumération d'adresses ; aucun écran ne l'utilise.
- `POST /journey/respond` : double réponse possible à la même question (pas d'unicité `questionId+userId`).
- `PATCH /journey/:id/advance` exposé à tout membre ⇒ saut d'étapes possible (non utilisé par l'app).
- `GET /journey/:id/messages` sans pagination ni limite (`journey.service.ts:565-576`) ; `messageHistory` WS limité à 50 (`chat.service.ts:43`).
- `chat.controller.ts:17,27` : `req.user.userId` undefined (bug latent, routes non appelées).
- Trois secrets JWT de repli différents (`jwt.strategy.ts:11`, `chat.module.ts:41`, `auth.module.ts:14`) ; `signOptions.expiresIn: '7d'` dans `AuthModule` inutilisé (surchargé à 1 h, `auth.service.ts:214-217`).
- `login.tsx:185-191` : le login social envoie un profil mock (`google.user@boligo.com`) que le backend accepte et enregistre comme compte réel.
- `messages.tsx:854-856` : contacts « révélés » sans `bothAccepted` (commentaire « TEST »).
- `messages.tsx:36` `VIDEO_TEST_UNLOCK = __DEV__` et `testUnlock` backend (`VIDEO_TEST_UNLOCK`, `video-call.service.ts:19-22`) : deux interrupteurs indépendants ; le backend fait foi (`joinCall`, `:89-95`).
- `publishableKey` renvoyé par le backend ignoré ; clé `pk_test` codée en dur (`app/_layout.tsx:8-10`, `eas.json:17,24`).
- Wrappers non utilisés : `getPlans`, `checkPromoCode`, `applyPromoCode`, `spendCredits` (`payment.ts`), `markJourneyAsRead`, `sendTypingState` (`chatSocket.ts`), `forgotPassword`, `resetPassword` (`auth.ts`). Routes backend non utilisées : `/report`, `/credit/history`, `/journey/sondeur-progress`, `/chat/*`, `/interview/start`, `/interview/submit-module`, `/interview/mental-map`, `/video/join/:id`, `/journey/:id/video/*`.
- `mainPhoto` accepté par `UpdateProfileDto` mais aucun upload de photo côté app.
- `city` envoyé sous la forme `"Région, Pays"` (`profile-details.tsx:209`) alors que le filtre géographique attend `"ville, région, pays"` (`matching.service.ts:126-151`) — sans effet tant que le périmètre n'est pas renseigné.

### 3.3 Écarts présents dans HEAD (`779aaec`) et corrigés par les modifications non commitées

| Écart HEAD | Preuve HEAD | État copie de travail |
|---|---|---|
| Socket.IO sans `auth.token` ⇒ déconnexion immédiate par le serveur | `git show HEAD:services/chatSocket.ts:25-28` vs `chat.gateway.ts:37-40` | ✔ `auth: cb => cb({ token })` (`chatSocket.ts:69-74`) |
| Événements `joinRoom`/`leaveRoom` inconnus du serveur (`joinJourney`/`leaveJourney`) | `git show HEAD:services/chatSocket.ts:35,40` | ✔ `SOCKET_EVENTS` alignés (`chatSocket.ts:32-49`) |
| `POST /video/end` avec `{ callId, durationOrReason }` ⇒ 500, parcours jamais avancé | `git show HEAD:services/video.ts:13-17` vs `video.controller.ts:28-32` | ✔ `{ journeyId, durationSec }` (`video.ts:48-54`) |
| `VideoService.getSession/join` avalaient les erreurs et renvoyaient `{ token: 'mock-token' }` ⇒ `meetingUrl` undefined | `git show HEAD:services/video.ts:23-39` | ✔ Erreurs propagées (`video.ts:38-46`) |
| `POST /payment/confirm` inexistant (404) | `git show HEAD:services/payment.ts:13-21` | ✔ Supprimé |
| `create-payment-intent` envoyait `amount` (ignoré) | `git show HEAD:services/payment.ts:5` | ✔ `{ optionId, promoCode? }` |
| Crédits purement locaux (`useState(10)`, `spendCredit` local) ⇒ jamais débités côté backend | `git show HEAD:context/AppContext.tsx:26-37` | ✔ `GET /credit/balance` + `POST /credit/spend` (`AppContext.tsx:47-74`) — mais voir § 3.1 point 1 (écrans non adaptés) |
| Push token jamais enregistré (`registerForPushNotificationsAsync` renvoyait `null`) | `git show HEAD:services/notifications.ts:1-7` | ✔ `POST /notifications/push-token` (`notifications.ts:71`) — mais voir § 3.1 point 4 (réponse fuit `User`) |
| Interceptor : 429 et 5xx sans message dédié | `git show HEAD:services/api.ts:110-127` | ✔ (`api.ts:128-131`) |

---

## 4. Codes HTTP à gérer côté app

### 4.1 Règles globales

| Code | Quand | Forme du corps | Traitement actuel côté app |
|---|---|---|---|
| **400** | Validation DTO (routes typées : `auth/*`, `interview/save-module`, `profile PATCH`, `notifications/push-token`) — champ manquant/invalide **ou champ inconnu** (`forbidNonWhitelisted`, message `property X should not exist`) ; règles métier (`BadRequestException`) | `{ statusCode: 400, timestamp, path, message: "…\n…" }` — `message` est une chaîne, lignes jointes par `\n` (`http-exception.filter.ts:31-33`) | `extractErrorMessage` (`api.ts:81-100`) ; affiché tel quel par la plupart des écrans (`Alert`). |
| **401** | Token absent/expiré/invalide sur toute route `AuthGuard('jwt')` (`{ message: "Unauthorized" }`) ; `login` identifiants incorrects ; `refresh` token invalide | `{ statusCode: 401, … }` | Intercepteur (`api.ts:140-186`) : refresh silencieux sauf pour `/auth/refresh`, `/auth/login`, `/auth/register`, `/auth/verify-email` (`api.ts:68`) ; échec ⇒ déconnexion globale. ⚠ Un 401 sur `/auth/social-login`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/resend-verification` déclencherait un refresh inutile (non listés). |
| **403** | Non membre du parcours : `POST /journey/message` (`journey.service.ts:517`), `/video/*` (`video-call.service.ts:57`), `AdminGuard` | `{ statusCode: 403, message }` | Message serveur affiché (`messages.tsx:612-619`, `video-call.tsx:151-156`). |
| **404** | Parcours introuvable (`journey/:id/status`, `/questions`, `POST /journey/message`, `/video/*`) ; utilisateur/profil introuvable (`verify-email`, `resend-verification`, `forgot-password`, `profile/me`, `delete-account`) ; **route inexistante** (`Cannot GET/POST /api/…`) | `{ statusCode: 404, message }` | Générique. |
| **409** | `POST /auth/register` : email ou téléphone déjà utilisé (`auth.service.ts:46-53`) | `{ statusCode: 409, message: "Email already exists" }` | `profile-details.tsx:232-268` propose la connexion ✔ ; `extractErrorMessage` traduit `already exists` (`api.ts:93-95`). |
| **429** | `ThrottlerGuard` : > 120 requêtes / 60 s par IP (`app.module.ts:47-50`), toutes routes, y compris publiques | `{ statusCode: 429, message: "ThrottlerException: Too Many Requests" }` | `readableMessage` dédié (`api.ts:128-129`) ✔. Points chauds : ouverture de l'onglet Messages = 2 + N requêtes (`messages.tsx:1011-1045`), Découverte = 3 requêtes par focus (`discover.tsx:545-568`), `GET /interview/status` à chaque garde de navigation (`index.tsx:56`, `(tabs)/_layout.tsx:23`, `login.tsx:160`). |
| **500** | Toute exception non-HTTP : erreurs Prisma (champ manquant sans DTO, FK, P2002 unicité), `throw new Error()` dans `journey.service.ts`, échec IA/Stripe non capturé | `{ statusCode: 500, message: "Internal server error" }` (`http-exception.filter.ts:11-19`) | `readableMessage` « Le serveur rencontre un problème… » (`api.ts:130-131`). |
| **503** | `ServiceUnavailableException` importée (`video-call.service.ts:6`) mais jamais levée | — | — |
| Réseau / timeout | Render cold start, coupure : `ECONNABORTED` (60 s, `api.ts:44`), `ERR_NETWORK` | pas de corps | `readableMessage` (`api.ts:123-127`) ✔ |

### 4.2 Par endpoint (codes réellement produits par le code backend)

| Endpoint | 200/201 | 400 | 401 | 403 | 404 | 409 | 500 |
|---|---|---|---|---|---|---|---|
| `POST /auth/register` | 201 | DTO ; date invalide ; < 18 ans | — | — | — | email / téléphone existant | Prisma (ex. `city` trop long) |
| `POST /auth/login` | 200 (tokens **ou** `isVerified:false`) | DTO | identifiants incorrects | — | — | — | `JWT_SECRET` manquant |
| `POST /auth/refresh` | 200 | DTO | token invalide / révoqué | — | — | — | — |
| `POST /auth/verify-email` | 200 | code incorrect ; longueur ≠ 4-6 | — | — | email inconnu | — | — |
| `POST /auth/resend-verification` | 200 | DTO | — | — | email inconnu | — | envoi e-mail |
| `POST /auth/forgot-password` | 200 | DTO | — | — | email inconnu | — | envoi e-mail |
| `POST /auth/reset-password` | 200 | code incorrect / expiré / < 8 car. | — | — | — | — | — |
| `DELETE /auth/delete-account` | 200 | — | JWT | — | utilisateur inconnu | — | transaction |
| `GET /interview/status` | 200 | — | JWT | — | — | — | — |
| `GET /interview/questions/:n` | 200 (`[]` possible) | — | JWT | — | — | — | — |
| `POST /interview/save-module` | 201 | DTO (`moduleNumber` 0-10, `answers` objet, champ inconnu) | JWT | — | — | — | échec IA à la complétion |
| `GET /interview/summary` | 200 (défauts si absent) | — | JWT | — | — | — | échec IA (regénération) |
| `GET /profile/me` | 200 | — | JWT | — | profil absent | — | — |
| `PATCH /profile/me` | 200 | `profession` vide/< 2 ; champ inconnu | JWT | — | profil absent | — | P2002 `telephone` dupliqué |
| `GET /matching/my-matches` / `received-likes` / `discover` | 200 | — | JWT | — | — | — | — |
| `POST /matching/connect` | 201 (`success` true/false) | — | JWT | — | — | — | `targetUserId` manquant / inconnu |
| `POST /matching/accept` | 201 (`success` true/false) | — | JWT | — | — | — | `proposalId` manquant |
| `GET /credit/balance` | 200 | — | JWT | — | — | — | — |
| `POST /credit/spend` | 201 | solde insuffisant ; utilisateur inconnu | JWT | — | — | — | `amount` non numérique |
| `GET /journey/:id/status` / `questions` | 200 | — | JWT | — | parcours inconnu | — | échec IA (questions) |
| `POST /journey/respond` | 201 | modération | JWT | — | — | — | `questionId` inconnu (FK) |
| `POST /journey/message` | 201 | étape < chat_libre ; modération | JWT | non membre | parcours inconnu | — | `type` hors enum |
| `GET /journey/:id/messages` | 200 | — | JWT | — | — | — | — |
| `GET /journey/chat-access` | 200 | — | JWT | — | — | — | — |
| `POST /journey/:id/exchange-contact` | 201 | — | JWT | — | — | — | parcours inconnu / non membre (`Error`) |
| `GET /journey/:id/contact-exchange` | 200 | — | JWT | — | — | — | idem |
| `GET /video/session/:id` | 200 | — | JWT | non membre | parcours inconnu | — | — |
| `POST /video/call-token` | 201 | étape non vidéo | JWT | non membre | parcours inconnu | — | `journeyId` manquant |
| `POST /video/end` | 201 | — | JWT | non membre | parcours inconnu | — | `journeyId` manquant |
| `POST /payment/create-payment-intent` | 201 (`isMock` possible) | promo invalide ; montant 0 ; erreur Stripe (prod) | JWT | — | — | — | — |
| `POST /notifications/push-token` | 201 (objet `User`) | DTO (`pushToken` vide) | JWT | — | — | — | — |
| Toutes | — | — | — | — | route inconnue | — | — | 429 si > 120 req/min |

### 4.3 Recommandations de gestion côté app

1. Traiter **400 comme message métier affichable** (déjà le cas) mais distinguer les 400 de validation DTO (préfixe `property … should not exist` / `must be…`) qui révèlent un bug de payload, à logger.
2. Sur **403/404 des routes `journey/*` et `video/*`**, invalider le cache `user_my_matches` et recharger (`AppContext.loadMatches(true)`), le parcours ayant pu être clôturé par la Règle de Justice.
3. Sur **500 de `exchange-contact`/`contact-exchange`**, ne pas faire passer l'état à « revealed » (aujourd'hui l'échec est seulement loggé, `messages.tsx:860-862`).
4. Lire `success` dans le corps de `connect`/`accept` (201) avant de considérer le crédit consommé ; idéalement déplacer le débit dans le backend (transaction).
5. Après `presentPaymentSheet` réussi, appeler `refreshCredits()` avec un délai/retry (le webhook Stripe est asynchrone) au lieu d'incrémenter localement.
