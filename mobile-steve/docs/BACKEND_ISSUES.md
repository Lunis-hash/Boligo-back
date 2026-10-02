# Anomalies backend constatées (Boligo-back `main` @ `e58a986`)

Périmètre de la mission : application mobile uniquement. Ces anomalies ont été
**reproduites** contre un backend compilé localement (base PostgreSQL de test
vide, script `scripts/backend-flow-smoke.js`) ou constatées par lecture du
code. **Aucune modification n'a été poussée sur `Boligo-back`.**

Les corrections proposées sont à valider séparément par l'équipe backend.

## 0. Bloquant : `main` ne compile plus (déploiements Render en échec)

| Priorité | Fichier | Problème | Preuve | Correction proposée |
|---|---|---|---|---|
| **P0** | `src/admin/admin.service.ts` ~l.919-925 | Le `return { … }` de `getVideoStats()` a été tronqué (commit `9ba5e53` « admin push notifications broadcast + history ») : erreur de syntaxe, `nest build` échoue (46 erreurs). | Render : les 3 derniers déploiements (`5b4226c`, `f1ff137`, `e58a986`) sont en `build_failed` ; la production tourne toujours sur `0046ad8` (2026-09-17). Les commits « auto-upgrade Jitsi → Daily », « enrich profile bio prompt » et « eliminate duplicate M0_Q02 » **ne sont pas en production**. | Restaurer `return { total, completed, inProgress, planned, thisWeek, thisMonth, totalDurationMinutes: agg._sum.durationMinutes ?? 0, avgDurationMinutes: agg._avg.durationMinutes ?? 0 }` (ajouter `_sum: { durationMinutes: true }` à l'agrégat). |
| **P0** | `src/admin/admin.service.ts` `broadcastPushNotification` | `accountStatus: { not: 'BANNED' }` : `BANNED` n'existe pas dans l'enum Prisma `AccountStatus` (`nouveau, en_entretien, actif, en_parcours, suspendu`) → erreur TypeScript. | `nest build` | Utiliser `'suspendu'`. |
| **P0** | `src/admin/admin.service.ts` `getNotificationHistory` | `orderBy: { createdAt }` / `select: { createdAt }` : le modèle `Notification` n'a que `sentAt`. | `nest build` (2 erreurs restantes après correction du `return`) | Remplacer `createdAt` par `sentAt`. |

> Pour la recette locale, ces trois corrections ont été appliquées **uniquement
> dans la copie de travail locale** du conteneur de test, afin de pouvoir démarrer
> le backend. Elles ne sont pas commitées dans `Boligo-back` ; le diff est fourni
> à titre de proposition dans `docs/backend-proposals/admin-service-build-fix.patch`
> (`git apply docs/backend-proposals/admin-service-build-fix.patch` depuis `Boligo-back`).

## 1. Sécurité

| Priorité | Endpoint | Backend | Problème | Preuve | Correction proposée |
|---|---|---|---|---|---|
| **P0** | `GET /journey/:id/questions`, `GET /journey/:id/messages`, `GET /journey/:id/status` | `journey.controller.ts` (`getDailyQuestions`, `getMessages`) | Aucun contrôle d'appartenance : **n'importe quel utilisateur authentifié lit les messages et réponses d'un parcours qui n'est pas le sien** (IDOR). | Script : un 3ᵉ compte obtient `200` et 1 message d'un parcours étranger (attendu 403). | Vérifier `journey.userAId === req.user.id || journey.userBId === req.user.id` (comme `sendMessage`) et lever `ForbiddenException`. |
| **P0** | `GET /journey/:id/contact-exchange` | `journey.service.ts` `getContactExchange` | Renvoie `partner.telephone` et `partner.email` **avant tout consentement** (dès l'étape vidéo, même sans accord mutuel). | Script : `myConsent:false` et `partner.telephone` présent. | Ne renvoyer les coordonnées que si `consentA && consentB` ; sinon `partner: { firstName }` seulement. |
| **P0** | `POST /credit/add` | `credit.controller.ts` | Ouvert à tout utilisateur connecté : chacun peut se créditer gratuitement (contournement total du paiement). | Script : `POST /credit/add {amount:2}` → `201`, solde 2. | Supprimer la route, ou la réserver à `AdminGuard` ; l'ajout de crédits ne doit passer que par le webhook Stripe / `apply-promo`. |
| **P0** | `POST /matching/connect`, `POST /matching/accept` | `matching.service.ts` | Ne vérifient ni ne débitent les crédits : le modèle économique repose sur l'app. La « règle de justice » (remboursement anti-ghosting) cherche une `CreditTransaction` de type `consommation` que l'app doit créer séparément (non atomique). | Script : solde inchangé après `connect`. | Débiter 1 crédit dans une transaction Prisma au `connect`/`accept`, rattacher la transaction au `journeyId`, refuser (`402`/`400`) si solde insuffisant. |
| **P0** | `POST /auth/social-login` | `auth.service.ts` `socialLogin` | Si la vérification réseau du token échoue (ou n'a pas lieu), le backend **crée / connecte un compte à partir du `profile` fourni par le client** : usurpation possible de n'importe quelle adresse e-mail. | Lecture du code (`if (token && !token.startsWith('mock_'))` puis fallback sur `profileDto`). | Exiger une vérification réussie du token (Google `tokeninfo` avec `aud` = client ID BOLIGO, Facebook `debug_token`) ; supprimer le fallback `profile`. |
| **P1** | `POST /auth/register` | `auth.service.ts` | La réponse contient `otpDebugCode` : l'OTP est révélé au client, la vérification e-mail n'apporte rien. | Script : `otpDebugCode présent=true`. | Ne plus renvoyer le code (ou seulement si `NODE_ENV !== 'production'`). |
| **P1** | `POST /auth/verify-email` | `auth.service.ts` | Code passe-partout `1234` accepté en production. | Script : vérification avec `1234` → tokens. | Réserver au mode test (`ALLOW_TEST_OTP=true`). |
| **P1** | `POST /notifications/push-token` | `notification.service.ts` `registerPushToken` | Renvoie l'objet `User` complet (`passwordHash`, `hashedRefreshToken`, `verificationCode`, `resetCode`). | Lecture du code (`return this.prisma.user.update(...)`). | Renvoyer `{ success: true }`. |
| **P1** | `PATCH /journey/:id/advance` | `journey.service.ts` `advanceStep` | Un participant peut sauter à n'importe quelle étape (`termine`, `echange_contacts`) sans respecter le parcours. | Lecture du code. | Restreindre aux transitions autorisées ou réserver à l'admin. |
| **P1** | `chat.gateway.ts` `sendMessage` | WebSocket | Le chemin WebSocket d'envoi contourne la modération locale/IA et le contrôle d'étape appliqués par `POST /journey/message`. | Lecture du code. | Router `sendMessage` vers `JourneyService.sendMessage`. |
| **P2** | `jwt.strategy.ts`, `auth.service.ts` | Secrets | Secret de repli `'fallback-secret-key'` si `JWT_SECRET` absent ; secret de refresh dérivé par concaténation `_REFRESH`. | Lecture du code. | Échouer au démarrage si `JWT_SECRET` manque ; secret de refresh dédié. |
| **P2** | `main.ts` | CORS | `origin: true` + `credentials: true` (reflète toute origine). | Lecture du code. | Liste blanche d'origines (admin Vercel, site). |
| **P2** | Supabase | Base de production | RLS désactivé sur les 20 tables (`User`, `Message`, …). Sans impact tant que seule l'API NestJS accède à la base avec l'URL directe, mais critique si la clé `anon` Supabase est utilisée quelque part. | Advisor Supabase `rls_disabled` (critical). | Activer RLS (sans policies = accès bloqué pour `anon`/`authenticated`, sans effet sur Prisma) : voir SQL fourni par Supabase. |

## 2. Fonctionnel

| Priorité | Endpoint | Backend | Problème | Preuve | Correction proposée |
|---|---|---|---|---|---|
| **P1** | `GET /chat/unread-count`, `POST /chat/journeys/:id/read` | `chat.controller.ts` | Utilise `req.user.userId` alors que la stratégie JWT expose `req.user.id` → `undefined` : compteur toujours 0, marquage « lu » appliqué au mauvais expéditeur. | Script : `unread-count` = 0 avec 1 message non lu. | `req.user.id`. |
| **P1** | `GET /interview/status` | `interview.service.ts` | `currentModule = max(modules enregistrés) + 1` : le module 0 pré-rempli à l'inscription (`meetingScope`) est compté comme terminé → une app qui reprend à `currentModule` saute les autres questions du module 0 (tranche d'âge…). | Script : juste après inscription, `completedModules:[0], currentModule:1`. | Considérer un module complet uniquement si toutes ses questions applicables ont une réponse ; ou renvoyer `pendingModules`. (L'app compense en reprenant au premier module jamais enregistré.) |
| **P1** | `POST /payment/create-payment-intent` | `payment.service.ts` `getPlanDetails` | Tout `optionId` inconnu retombe sur le plan par défaut (15 €, 1 crédit) au lieu d'être refusé : une app affichant une autre offre facture le mauvais montant. | Script : `optionId: harmonie_premium` → `originalAmount: 1500`. | `throw new BadRequestException('Plan inconnu')` pour tout id non listé. |
| **P1** | `POST /video/end` | `video.controller.ts` | Payload sans DTO : un corps inattendu (`{callId}`) provoque un `500` Prisma au lieu d'un `400`. | Script : `500`. | DTO `{ journeyId: string, durationSec?: number }`. |
| **P2** | `PATCH /profile/me` | `update-profile.dto.ts`, `schema.prisma` | `profession: ''` → 400 (`MinLength(2)` sur chaîne vide) ; `telephone: ''` → violation d'unicité (`P2002` → 500) dès que deux membres n'ont pas de numéro. | Script (`badPatch`) et lecture du schéma (`telephone String? @unique`). | Transformer `''` en `undefined`/`null` (`@Transform`), ou ignorer les chaînes vides. |
| **P2** | `POST /matching/connect|accept`, `POST /journey/respond|message`, `POST /report`, `POST /credit/spend` | Contrôleurs typés `body: {…}` | Aucun DTO → aucune validation (`amount` négatif accepté sur `/credit/spend`, `success:false` renvoyé en 201, erreurs Prisma en 500). | Lecture du code + script. | Créer des DTO `class-validator` ; renvoyer 4xx explicites. |
| **P2** | `GET /matching/my-matches` | `matching.service.ts` | N'expose ni `stepStartDate` ni le jour courant : l'app ne peut pas afficher « Jour 2/3 » (toujours J1). | Lecture du code. | Ajouter `stepStartDate`, `currentDay`. |
| **P2** | `journey.service.ts` `exchangeContact`, `getContactExchange`, `advanceStep` | Erreurs | `throw new Error(...)` (non-HTTP) → 500 au lieu de 403/404. | Lecture du code. | `NotFoundException` / `ForbiddenException`. |
| **P3** | `prisma/` | Migrations | Aucun dossier `migrations` : le schéma est appliqué par `db push` (pas d'historique, migrations destructives non détectables). | Arborescence. | `prisma migrate dev` + migrations versionnées. |
| **P3** | `interview.service.ts` `saveModule` | Performance | La génération IA de la carte mentale est synchrone dans la requête du 11ᵉ module (timeout mobile 60 s). | Lecture du code. | Job asynchrone + statut `generating`. |

## 3. Comportements vérifiés OK (à titre d'information)

Inscription (201/409/400), OTP, login (200/401), refresh avec rotation, routes
protégées (401), profil (GET/PATCH), entretien 11 modules + bilan, découverte
(exclusion des profils occupés), like → accept → parcours, 21 questions
Sondeur (banque) et passage automatique en chat libre, modération locale
(400), chat HTTP + diffusion Socket.IO (JWT requis, `joinJourney`,
`newMessage`), vidéo (`call-token` Jitsi en repli, `end` → `echange_contacts`),
échange de contacts à double consentement, plans/promo/crédits, signalement,
enregistrement du push token.
