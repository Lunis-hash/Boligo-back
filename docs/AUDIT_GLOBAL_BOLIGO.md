# Audit global BOLIGO — 3 octobre 2026

> **Périmètre** : API NestJS 11 + Prisma (`src/`), application Expo / React Native (`mobile-steve/`), base Supabase Postgres, déploiement Render (API `boligo-back.onrender.com`, site statique `boligo-web`).
> **Sources** : quatre audits en lecture seule (API ; écrans d'entrée et de profilage ; parcours relationnel ; architecture transverse), les correctifs de la branche `claude/magical-keller-kw9t2c` et des vérifications en production en lecture seule.
> **Statuts** : chaque statut a été vérifié dans le code de la branche au commit `b549404`. « Corrigé » = vérifié dans le code. « Partiellement corrigé » = une partie seulement. « À faire » = rien de fait.
> Les numéros de ligne sont ceux relevés pendant l'audit. Ils ont pu bouger depuis.

---

## En bref

- **Ce qui a été audité.** Tous les parcours de BOLIGO : slides, inscription en 4 étapes, code par e-mail, Grand Entretien (11 modules, environ 76 questions), bilan, Découverte, Parcours Harmonie (15 €, 1 crédit), Sondeur (3 jours × 7 questions), chat libre, appel vidéo de 2 minutes, échange de coordonnées. L'audit couvre aussi l'API, la base, le design et le bundle web.
- **102 constats distincts** après fusion des doublons (123 constats bruts dans les quatre rapports) : **15 bloquants, 63 majeurs, 24 mineurs**.
- **Avancement** : **22 corrigés, 32 partiellement corrigés, 48 à faire**. Les failles les plus graves sont fermées :
  - prise de contrôle de compte par le code e-mail ;
  - invitations gratuites et crédits débités par l'application ;
  - coordonnées révélées sans accord ;
  - étapes du parcours forçables ;
  - accès aux conversations d'autrui ;
  - CGU non enregistrées.
- **Ce qui reste critique** :
  - **la clé Stripe de test** dans la build de production ;
  - **les mentions légales** encore à compléter ;
  - **l'appel vidéo**, toujours impossible sur le web ;
  - **la fin de parcours** : un écran « Parcours clos » (raison, remboursement) reste à créer ;
  - **la délivrabilité des e-mails** : l'envoi SMTP est actif en production ; reste à confirmer la réception (domaine BOLIGO, SPF, DKIM).
- **Cloisonnement de la base** : la base Supabase de BOLIGO héberge des schémas et des fonctions d'un autre projet, exécutables avec la clé publique. C'est une décision à prendre (voir décision n° 1).
- **À décider par vous** :
  - le cloisonnement de la base ;
  - les codes promo illimités ;
  - le fournisseur d'e-mails ;
  - les clés Stripe live et le secret de webhook ;
  - les mentions légales ;
  - la validation des visuels provisoires.
- **Tests** : tous au vert. API 107/107, intégration 20/20, application 83/83, recette navigateur 56/56, recette API 80/80.
- **Mise en ligne** :
  - la migration de base (index et consentement CGU) est **appliquée en production** ;
  - le code corrigé est **fusionné dans `main`** (demande de fusion n° 5) et **en ligne depuis le 3 octobre, 16 h 25 UTC** : l'API `boligo-back` et le site `boligo-web` ont été redéployés sans erreur (Stripe connecté au compte de test BOLIGO, e-mails en SMTP).

### Lexique

| Terme | Signification |
|---|---|
| Jeton (JWT) / refresh token | « Badge » signé qui prouve qu'un membre est connecté. Le refresh token sert à en obtenir un nouveau sans retaper le mot de passe. |
| OTP | Code à usage unique envoyé par e-mail (vérification de l'adresse, mot de passe oublié). |
| IDOR | Faille où l'on accède aux données d'un autre membre simplement en changeant un identifiant dans l'adresse. |
| WebSocket / socket | Connexion permanente utilisée par le chat en temps réel. |
| Transaction, verrou | Mécanismes de la base qui empêchent deux actions simultanées de se contredire (par exemple deux débits du même crédit). |
| Index | Table de recherche de la base. Sans elle, PostgreSQL relit toute la table à chaque requête. |
| RLS | « Row Level Security » : règles d'accès ligne par ligne de Supabase. |
| SECURITY DEFINER | Fonction SQL qui s'exécute avec les droits de son créateur, pas avec ceux de l'appelant. |
| Clé « anon » | Clé publique Supabase. Quiconque la possède peut appeler l'API REST de la base dans les limites des droits accordés. |
| Webhook | Appel envoyé par Stripe au serveur pour confirmer un paiement. Il est signé avec un secret. |
| Cron / tâche planifiée | Traitement lancé à heure fixe, au lieu d'attendre qu'un membre ouvre l'application. |
| E2E | Test « de bout en bout » qui pilote un vrai navigateur. |

---

## Ce qui a été corrigé et mis en ligne

Ces correctifs ont été vérifiés dans le code (commits `3a1735f` à `9ab1bc7`) et fusionnés dans `main`.

### Sécurité des comptes

- `POST /auth/verify-email` ouvrait une session pour tout compte déjà vérifié, administrateur compris → **plus aucune session par cette route**. Le code de développement « 1234 » et le code renvoyé dans la réponse ne fonctionnent qu'avec `OTP_DEBUG=true`, jamais en production.
- La connexion Google/Facebook acceptait un faux jeton, un jeton émis pour une autre application et l'e-mail envoyé par l'application → **seule l'identité confirmée par le fournisseur compte, et le jeton doit avoir été émis pour BOLIGO**. Google doit avoir vérifié l'e-mail, un compte suspendu est refusé, aucun compte n'est créé par cette voie, et l'attente est limitée à 8 s.
- Les refresh tokens étaient hachés avec bcrypt, qui ne lit que 72 octets : un ancien jeton restait valable → **empreinte SHA-256 comparée à temps constant**, et refus des comptes suspendus.
- Mot de passe oublié : le code venait d'un générateur non cryptographique et la réponse « aucun compte » permettait de deviner les inscrits → **code cryptographique à 6 chiffres, réponse identique dans tous les cas, sessions révoquées** après la réinitialisation.
- Aucune limite d'essais sur la connexion et les codes → **8 essais par e-mail et par route sur 10 minutes**. Avec `trust proxy`, la limite globale compte désormais par visiteur et non par relais Render.
- Des secrets JWT de secours étaient écrits en dur → **supprimés**, avec une alerte au démarrage si `JWT_SECRET` manque.
- Le script de création de l'administrateur contenait un mot de passe par défaut → **supprimé**. `ADMIN_PASSWORD` (12 caractères minimum) est désormais obligatoire.
- La recherche d'e-mail était sensible à la casse (échec du « mot de passe oublié ») → **e-mails normalisés en minuscules, recherche insensible à la casse**.
- La fiche membre de l'administration renvoyait l'empreinte du mot de passe, les jetons et les codes → **retirés**.
- L'enregistrement du jeton de notification renvoyait tout le compte → il renvoie seulement `{ success: true }`.

### Crédits et paiements

- Les invitations étaient créées sans débit côté serveur, et c'était l'application qui débitait (débit contournable, ou crédit perdu en cas d'échec) → **le serveur débite 1 crédit à l'invitation et 1 à l'acceptation**, dans la même transaction. `/credit/spend` ne débite plus rien.
- La « règle d'or » n'était pas appliquée par le serveur → **verrous par membre** : une seule invitation en attente ou un seul parcours en cours à la fois.
- Des codes promo de secours, gratuits et illimités, étaient codés en dur → **supprimés**. Seuls les codes en base sont acceptés : réservation atomique, plafond respecté, un usage par membre. Les codes de remise sont enregistrés au paiement.
- Une invitation restée sans réponse faisait perdre le crédit → **refus, retrait ou expiration (7 jours) rendent le crédit**, une seule fois.
- Quand un membre arrête un parcours, **son partenaire récupère son crédit**, une seule fois.

### Parcours et consentements

- Le téléphone et l'e-mail pouvaient être révélés contre le choix d'un membre (OU logique, partage par défaut) → **un canal n'est partagé que si les deux membres l'acceptent**. Rien n'est partagé sans choix explicite, uniquement à l'étape « échange de coordonnées ». Les consentements simultanés sont traités l'un après l'autre.
- L'application pouvait forcer les étapes (`/advance`, fin d'appel sans appel) → **l'avancement manuel est limité au passage vidéo → coordonnées**, une fois que les deux membres ont rejoint l'appel. La fin d'appel ne fait avancer le parcours qu'à l'étape vidéo, avec deux membres connectés et une durée mesurée par le serveur.
- La réponse du partenaire au Sondeur était lisible avant de répondre soi-même → **masquée tant que vous n'avez pas répondu**.
- Le chat de 3 jours était raccourci, faute de remettre `stepStartDate` à zéro → **le minuteur repart à la fin du Sondeur**.
- La Règle de Justice s'appliquait au Sondeur dès 48 h, alors que le jour 3 s'ouvre à 48 h → **3 jours + 24 h de grâce**.
- Un parcours terminé bloquait la Découverte à vie → **un parcours clos libère les deux membres**.
- Invitations : l'application propose maintenant **« Décliner »** (invitation reçue) et **« Retirer mon invitation »** (crédit rendu).
- Sondeur : **reprise à la première question sans réponse**, et rechargement au retour sur l'onglet et au retour de l'app au premier plan.
- Grand Entretien : **chaque réponse est contrôlée** (question du bon module, option existante), et un entretien terminé n'est plus rouvert par un envoi tardif.
- Découverte : **comptes suspendus exclus**, 50 profils au plus. **Le faux badge « vérifié » est retiré**, car seul l'e-mail est vérifié.

### Messagerie et sécurité

- Les routes `/chat/journeys/:id/*` ne vérifiaient pas l'appartenance au parcours → **vérifiée**. L'historique renvoie les 100 messages les plus récents, au lieu des 50 plus anciens.
- Le chat WebSocket contournait la modération, l'étape et la limite de longueur → **mêmes contrôles que l'envoi classique**, contenu masqué à la diffusion :
  - « écrit… », appel et refus d'appel réservés aux membres du parcours ;
  - nom de l'appelant fourni par le serveur ;
  - comptes suspendus déconnectés ;
  - authentification attendue avant de rejoindre une conversation.
- Il n'existait aucun moyen de signaler un membre ou de quitter un parcours → **menu ⋮ dans le chat : « Signaler » (5 motifs) et « Arrêter le parcours »**.
- La modération de l'application bloquait « rencontre », « conseil », « contrat »… → **comparaison sur des mots entiers, sans accents**.
- Les journaux contenaient les jetons de notification et des extraits de messages privés → **retirés**. En mode simulation, les codes sont masqués dans les journaux de production.

### Inscription et mentions légales

- Les CGU pouvaient être contournées (« Passer ») et leur acceptation n'était jamais enregistrée → **case non cochée par défaut à l'étape 4**. Le serveur exige `acceptTerms` et enregistre la date et la version (`User.termsAcceptedAt`, `User.termsVersion`).
- Un mineur ou une date future pouvaient être saisis, et la date était décalée d'un jour → **âge de 18 à 99 ans contrôlé dans l'app et sur le serveur**, date envoyée au format AAAA-MM-JJ.
- Promesses inexactes : 7 minutes de vidéo, 40 questions, compatibles à 80 %, profils vérifiés, messagerie chiffrée → **textes corrigés** : 2 minutes, environ 70 questions, profils classés par compatibilité, e-mail vérifié, messagerie modérée.
- La fiche CGU des slides était une copie divergente, avec une autre raison sociale → **générée depuis `constants/legal.json`**, la source unique.
- Un téléphone déjà utilisé était annoncé comme un e-mail déjà utilisé → **deux messages distincts**.
- Onglets « Discover / Matches » → **« Découverte / Matchs »**. Le bilan et le paiement mènent désormais à la Découverte.

### Qualité et performances

- Des index de clés étrangères manquaient (parcours, entretiens, Sondeur, messages, crédits, signalements) → **ajoutés et appliqués en production** par la migration additive « boligo_terms_consent_and_fk_indexes ».
- Les appels IA, vidéo et e-mail n'avaient aucun délai maximal → OpenRouter 20 s, Groq 20 s avec un nouvel essai, Daily et e-mails 10 s.
- Le certificat du serveur SMTP n'était pas vérifié → **vérifié**. Expéditeur et référent aux adresses BOLIGO.
- Le mode d'envoi des e-mails était invisible → **journalisé au démarrage**, sans afficher de clé.
- Une coupure réseau pendant le rafraîchissement de session déconnectait le membre → **déconnexion seulement si le serveur refuse la session** (401/403).
- L'icône, l'icône adaptative Android et le splash étaient des PNG de 1×1 pixel → **visuels BOLIGO provisoires en 1024 px**.
- Vidéo sur le web : un écran d'erreur technique s'affichait et l'étape était validée → message « disponible dans l'application mobile », sans aucun appel au serveur.
- Paquet de l'application renommé « boligo ». Ajout de tests : intégration `npm run test:int`, modération, rafraîchissement de session, recette E2E mise à jour.

---

## Constats par criticité

Statuts : **C** = Corrigé · **P** = Partiellement corrigé · **À faire**.
Chemins de l'application relatifs à `mobile-steve/`. Chemins de l'API préfixés `src/`.

### Bloquants (15) : 10 C · 4 P · 1 à faire

| # | Constat | Où | Impact | Statut | Ce qui reste / correctif |
|---|---|---|---|---|---|
| B1 | Session ouverte sans code par `verify-email` (compte déjà vérifié, code passe-partout, code renvoyé à l'inscription) | `src/auth/auth.service.ts` (verifyEmail, register) | Prise de contrôle de tout compte, admin compris | C | Code à 4 chiffres stocké en clair, sans expiration : voir m3 |
| B2 | Connexion sociale : jeton factice et e-mail fourni par l'app acceptés | `src/auth/auth.service.ts` (socialLogin) | Prise de contrôle de compte | C | Jeton Google vérifié auprès de Google et réservé aux identifiants BOLIGO (`GOOGLE_CLIENT_IDS`) ; jeton Facebook vérifié par `debug_token` avec l'application BOLIGO (`FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`). Sans configuration, la connexion sociale est indisponible. Plus de création de compte avec une date de naissance et un genre inventés : l'inscription passe par le formulaire |
| B3 | Invitation sans règle serveur ; crédit débité par l'app après coup | `src/matching/matching.service.ts` ; `app/(tabs)/discover.tsx` | Invitations gratuites, crédits perdus, Découverte vidable par un seul compte | C | — |
| B4 | Téléphone et e-mail révélés contre le choix du membre | `src/journey/journey.service.ts` (exchangeContact) ; `journey.controller.ts` | Donnée personnelle divulguée (RGPD), risque de harcèlement | C | Côté app, voir M43 |
| B5 | Invitations sans issue : ni expiration, ni retrait, ni refus | `src/matching/matching.service.ts` ; `app/(tabs)/discover.tsx` | Membre bloqué à vie, crédit perdu | P | Décliner, retirer et expirer (7 j) avec crédit rendu : faits. L'expiration ne se fait que quand quelqu'un ouvre l'app → tâche planifiée |
| B6 | Fin de parcours : Découverte bloquée ; échec présenté comme une réussite | `src/matching/matching.service.ts` (getMyMatches) ; `app/(tabs)/messages.tsx:268` | Produit inutilisable après un parcours ; message mensonger | P | Découverte libérée ; les parcours échoués ou arrêtés ne sont plus listés et « Coordonnées échangées » ne s'affiche que pour un parcours réussi. Reste : un état « Parcours clos » (raison, remboursement, retour à la Découverte) |
| B7 | Sondeur : impossible de reprendre une journée interrompue | `app/(tabs)/index.tsx` | Journée impossible à finir, pénalité injuste | C | — |
| B8 | Sondeur figé tant que l'app reste en mémoire | `app/(tabs)/index.tsx` | Jour 2 jamais affiché, réponses du partenaire invisibles | C | Amélioration : afficher l'heure d'ouverture exacte |
| B9 | Modération de l'app par sous-chaîne (« con » dans « rencontre ») | `services/chatModeration.ts` | Messages ordinaires refusés | C | — |
| B10 | Appel vidéo impossible sur le web, mais étape validée | `app/video-call.tsx` ; `src/video/video-call.service.ts` | Étape franchie sans appel ; membres web bloqués | P | Étape protégée par le serveur, message clair sur le web. Reste : `video-call.web.tsx` (iframe Daily) et clôture de l'appel au retour arrière (`usePreventRemove`) |
| B11 | Impossible de signaler ou de quitter un parcours | `app/(tabs)/messages.tsx` | Aucun recours en cas de harcèlement ; refus App Store (règle 1.2) | C | Signaler un message précis (appui long) ; retirer le micro inerte |
| B12 | CGU contournables et acceptation jamais enregistrée | `value-slides.tsx` ; `profile-details.tsx` ; `src/auth/dto/register.dto.ts` | Consentement impossible à prouver | C | Voir décision n° 5 (données sensibles) |
| B13 | Textes légaux : deux versions, champs vides, raison sociale différente de BOLIGO | `constants/legal.json` ; `value-slides.tsx` | Mentions légales non conformes (LCEN) | P | Source unique : faite. Reste 8 champs (20 occurrences) « [À COMPLÉTER] » : décision n° 5 |
| B14 | Icône, icône adaptative et splash en 1×1 pixel | `assets/` ; `app.json` | Refus des stores, icône invisible | C | Visuels provisoires à valider ; supprimer `favicon.png` et `logo.png` (1×1, inutilisés) |
| B15 | Build de production avec une clé Stripe de test codée en dur | `app/_layout.tsx:31-33` ; `eas.json` (profil production) | Aucun encaissement réel, ou paiements en échec | À faire | Supprimer la clé de secours ; faire échouer la build si la clé manque ; déclarer la clé publique live (`eas env:create --environment production`) |

### Majeurs (63) : 12 C · 22 P · 29 à faire

#### API et base de données

| # | Constat | Où | Impact | Statut | Ce qui reste / correctif |
|---|---|---|---|---|---|
| M1 | Chat WebSocket : modération, étape et longueur contournées ; ni limite de débit ni validation | `src/chat/chat.gateway.ts` ; `chat.service.ts` | Harcèlement non modéré, envoi massif de messages | P | Contrôles, appartenance et appelant : faits. Reste : limite par membre (ex. 10 messages / 10 s), validation des messages entrants, déconnexion forcée à la suspension |
| M2 | Conversations d'autrui lisibles (IDOR) ; historique figé à 50 messages | `src/chat/chat.controller.ts` ; `chat.service.ts` | Lecture des messages d'autrui | C | — |
| M3 | Étapes du parcours pilotées par l'app (`/advance`, `/video/end` sans appel) | `src/journey/journey.service.ts` ; `src/video/video-call.service.ts` | Sondeur, chat et vidéo payés sautés ; parcours de l'autre forcé | C | — |
| M4 | Rotation des refresh tokens inopérante (bcrypt tronqué à 72 octets) | `src/auth/auth.service.ts` | Jeton volé valable 30 jours | C | Secret de refresh distinct : voir M6 |
| M5 | Mot de passe oublié : force brute, énumération des comptes, avalanche d'e-mails | `src/auth/auth.service.ts` | Comptes devinés ou repris | C | Code stocké en clair : voir m3 |
| M6 | Secrets JWT par défaut ; mot de passe admin par défaut dans le dépôt | `jwt.strategy.ts` ; `chat.module.ts` ; `auth.module.ts` ; `prisma/seed-admin.ts` | Jetons falsifiables si la variable manque | P | Secrets de secours et mot de passe par défaut retirés. Reste : refuser de démarrer sans `JWT_SECRET` (≥ 32 caractères) ; secret `JWT_REFRESH_SECRET` distinct ; un seul `JwtModule`. L'ancien mot de passe admin reste dans l'historique Git : il est compromis |
| M7 | Limitation de débit derrière le relais Render ; routes sensibles non couvertes | `src/main.ts` ; `src/app.module.ts` ; `src/auth/auth-rate-limit.guard.ts` | Erreurs 429 pour tous, ou aucun frein | P | `trust proxy` et limite par e-mail : faits. Reste : compteur en mémoire (perdu au redémarrage, non partagé entre instances) → Redis ; `/admin/auth/login` non couvert |
| M8 | Validation des entrées contournée (corps typés « en ligne ») | contrôleurs matching, credit, journey, video, report, payment, admin | Erreurs 500, textes sans limite de longueur | P | Réponses de l'entretien contrôlées. Reste : une classe de validation par route (`@IsUUID`, `@MaxLength`, `@IsEnum`) et `ParseUUIDPipe` sur les `:id` |
| M9 | Acceptation non atomique : plusieurs parcours pour un même membre | `src/matching/matching.service.ts` | Règle d'or contournée | C | — |
| M10 | Règle de Justice : déclenchement prématuré, double remboursement possible | `src/journey/journey.service.ts` (autoAdvance) | Parcours de bonne foi clos ; crédits en double | P | 96 h pour le Sondeur : fait. Reste : clôture conditionnelle (`result = 'en_cours'`) avant tout remboursement, index unique « un remboursement par parcours et par membre », exécution par tâche planifiée et non à la lecture ; règle du chat (48 h après le dernier message) à revoir |
| M11 | `stepStartDate` non remis à zéro : chat raccourci ou sauté | `src/journey/journey.service.ts` | Offre payée non tenue | C | — |
| M12 | Codes promo de secours gratuits et illimités | `src/payment/payment.service.ts` | Crédits gratuits sans limite | C | Codes illimités en base : décision n° 2 |
| M13 | Entretien : un envoi tardif créait un entretien vide qui servait au matching | `src/interview/interview.service.ts` | Scores effondrés | P | Envoi tardif refusé. Reste : fin d'entretien idempotente (deux fins simultanées = double appel IA puis erreur 500 sur `mentalMap.create`) → mise à jour conditionnelle + `upsert` |
| M14 | Données sensibles dans les réponses et les journaux de l'API | `notification.service.ts` ; `email.service.ts` ; `admin.service.ts` | Fuite de données personnelles | P | Reste : e-mails des membres encore journalisés ; masquage global des champs secrets dans Prisma (`omit`) ; journal structuré avec masquage |
| M15 | Découverte : toute la base chargée et tous les scores recalculés à chaque requête | `src/matching/matching.service.ts` (getDiscoverProfiles) | Lenteur croissante avec le nombre de membres | P | Suspendus exclus, 500 candidats et 50 résultats au plus. Reste : filtres en SQL, pagination, scores précalculés |
| M16 | Index manquants sur les filtres fréquents | `prisma/schema.prisma` | Lectures complètes de tables | P | Index de clés étrangères appliqués en production. Reste : unicité `ModuleResponse(interviewId, moduleNumber)`, `HarmonyResponse(questionId, userId)`, `CreditTransaction.paymentRef` ; index `MatchProposal(status, expiresAt)`, `User(gender, accountStatus)` |
| M17 | État gardé en mémoire : chat et verrous valables pour une seule instance | `chat.gateway.ts` ; `journey.service.ts` ; `ai.service.ts` | Dès 2 instances : messages perdus, questions du Sondeur supprimées, fuite mémoire | À faire | Adaptateur Redis pour Socket.IO ; verrou PostgreSQL et insertion groupée du Sondeur ; cache borné |
| M18 | Appels IA dans le chemin des requêtes ; modération ouverte si l'IA tombe | `openrouter.service.ts` ; `ai.service.ts:500-503` ; `interview.service.ts` ; `journey.service.ts` | Requêtes lentes ; contenu non modéré pendant une panne | P | Délais maximaux : faits. Reste : file de tâches (carte mentale, Sondeur, e-mails, push) ; en cas d'échec de l'IA sur un contenu à risque, le mettre en vérification au lieu de l'autoriser |
| M19 | Vidéo : repli sur une salle publique non protégée ; salle Daily expirée réutilisée | `src/video/video-call.service.ts:103-164` ; `daily.service.ts` | Quiconque connaît l'adresse peut entrer ; vidéo cassée après 4 h | À faire | Aucun repli public en production ; recréer la salle expirée ; jeton de 120 s par membre |

#### Application : entrée, inscription, Grand Entretien

| # | Constat | Où | Impact | Statut | Ce qui reste / correctif |
|---|---|---|---|---|---|
| M20 | Promesses marketing démenties par le produit | `app/index.tsx` ; `value-slides.tsx` | Pratique commerciale trompeuse | C | — |
| M21 | Date de naissance : mineur ou date future possibles, décalage d'un jour | `app/onboarding/profile-details.tsx` | Inscription de mineurs | C | — |
| M22 | Changer l'indicatif change le pays et efface la ville | `profile-details.tsx` (modale Pays) | Localisation fausse | À faire | Modale dédiée à l'indicatif |
| M23 | Téléphone non normalisé (« +33 06 … ») | `profile-details.tsx` ; `src/auth/auth.service.ts` | Doublons non détectés, numéro mal formé à l'échange | À faire | Format international E.164 (chiffres seuls, 0 initial retiré), côté app et serveur |
| M24 | Toute erreur 409 traitée comme un e-mail existant : impasse | `profile-details.tsx` ; `app/(auth)/verify.tsx` | Inscription impossible après une faute de frappe | P | Messages distincts : faits. Reste : modifier l'e-mail d'un compte non vérifié depuis l'écran du code ; afficher l'erreur si la connexion échoue |
| M25 | Casse de l'e-mail : « mot de passe oublié » en échec | `profile-details.tsx` ; `login.tsx` ; `auth.service.ts` | Membre bloqué | C | — |
| M26 | Le retour arrière efface toute la saisie de l'inscription | `profile-details.tsx` | Abandons | À faire | `usePreventRemove(step > 1)` ; étape dans l'URL sur le web |
| M27 | Après le code e-mail, le formulaire reste dans l'historique | `app/(auth)/verify.tsx:101` | Retour = formulaire pré-rempli, puis erreur 409 | À faire | `router.dismissAll()` puis `replace` |
| M28 | Bouton grisé sans dire pourquoi | `profile-details.tsx` ; `app/(auth)/login.tsx` | Abandons | P | Âge et CGU expliqués. Reste : erreurs sous chaque champ, saisie automatique, touche Entrée au login |
| M29 | Grand Entretien : impasse en cas d'erreur de chargement ou de sauvegarde | `app/interview/[moduleNumber].tsx` | Module perdu | À faire | État d'erreur dans la page + « Réessayer » |
| M30 | Entretien : réponses perdues en cours de module ; « Pause » déconnecte | `[moduleNumber].tsx` | Progression perdue, promesse fausse | À faire | Sauvegarde à chaque réponse ; « Reprendre plus tard » ramène à l'accueil |
| M31 | Impossible de corriger une réponse de l'entretien | `[moduleNumber].tsx` | Matching faussé par un tap accidentel | À faire | « Modifier ma réponse » avant l'enregistrement du module |
| M32 | « Découvrir mes matchs » ouvrait l'onglet vide | `app/interview/summary.tsx` | Nouveau membre face à une liste vide | C | — |
| M33 | Bilan : une erreur présentée comme un état normal | `summary.tsx` | « Calcul en cours… » sans fin | À faire | État d'erreur + « Réessayer » ; masquer « Matching activé » sous 11 modules |

#### Application : parcours relationnel

| # | Constat | Où | Impact | Statut | Ce qui reste / correctif |
|---|---|---|---|---|---|
| M34 | Fin du Sondeur annoncée dès que vous avez fini, messagerie encore verrouillée | `app/(tabs)/index.tsx` (`allDone`) ; `messages.tsx` | Membre envoyé vers un écran verrouillé | À faire | Fin du Sondeur calculée d'après la phase serveur ; afficher la progression du partenaire |
| M35 | Réponses du partenaire exposées ; bouton « Révéler » sans effet | `src/journey/journey.service.ts` ; `index.tsx` | Réponses alignées sur l'autre | P | Serveur corrigé (champ `partnerAnswered`). Reste : afficher « X n'a pas encore répondu » et un vrai geste de révélation |
| M36 | Cache des matchs non invalidé : écrans désynchronisés | `context/AppContext.tsx` ; `discover.tsx` ; `messages.tsx` | « Aucun match actif » juste après une acceptation | P | Onglet Matchs rechargé. Reste : une source unique invalidée après chaque action (voir architecture) |
| M37 | Feuille de confirmation : mauvais prénom, promesses fausses | `discover.tsx` | Confusion au moment de payer | À faire | Lier la feuille à l'invitation touchée ; texte exact (Sondeur 3 j × 7 questions, 1 crédit) |
| M38 | Badge « vérifié » affiché sur tous les profils | `discover.tsx` | Signal de confiance mensonger | C | — |
| M39 | Flèches de navigation fixes qui masquent le contenu | `discover.tsx` | Pourcentages et textes cachés | À faire | Navigation dans la carte (« Profil 2/5 ») ou balayage |
| M40 | Messages : jour, score et activité inventés | `messages.tsx:121-140` | Informations fausses (« J1/3 » partout, score pseudo-aléatoire) | À faire | Renvoyer `stepStartDate`/`stepEndsAt` et le vrai score ; supprimer les valeurs de repli |
| M41 | Messages non lus invisibles hors de la conversation | `AppContext.tsx` ; `app/(tabs)/_layout.tsx` | Messages manqués, puis Règle de Justice | À faire | Écoute globale du chat, `/chat/unread-count`, badge sur l'onglet |
| M42 | Chat : message en échec perdu, date figée, liste non virtualisée | `messages.tsx` | Messages perdus, lenteur | À faire | Renvoyer au toucher, séparateurs par jour, `FlatList` inversée |
| M43 | Échange de coordonnées : l'app envoie toujours téléphone ET e-mail, sans option de refus | `messages.tsx` (~l. 820) | Consentement non granulaire | P | Le membre coche téléphone et/ou e-mail ; un moyen n'est révélé que si les deux l'acceptent ; « Arrêter le parcours » est dans le menu du chat. Reste : mise à jour en direct quand le partenaire consent |
| M44 | Vidéo : minuteur local, partenaire absent, messages techniques affichés | `app/video-call.tsx` | Appel seul, textes incompréhensibles (« Ajoutez DAILY_API_KEY… ») | P | Le serveur exige les deux membres et mesure la durée. Reste : salle d'attente, minuteur commun, bandeau d'appel entrant, textes pour le membre, origine limitée à `https://*.daily.co` |
| M45 | Paiement : impasse sur le web, PaymentIntents orphelins | `app/onboarding/payment.tsx` | Membres web sans moyen de payer | P | Retour à la Découverte : fait. Reste : tester la plateforme avant de créer le paiement ; Stripe Checkout sur le web ; état « Attribution du crédit… » ; Apple Pay et Google Pay |
| M46 | Profil : champ impossible à effacer, prénom modifiable en plein parcours | `app/profile/edit.tsx` | Téléphone impossible à retirer avant l'échange | À faire | Envoyer `null` pour effacer ; verrouiller le prénom pendant un parcours |
| M47 | Typographie inopérante : tout s'affiche en graisse normale, sans serif | `constants/theme.ts` | Image bas de gamme | À faire | Polices chargées au démarrage + composant `<Text variant>` (voir propositions) |
| M48 | Deux chartes graphiques concurrentes, kit UI inutilisé | `app/index.tsx` ; `payment.tsx` ; `theme.ts` ; `components/ui/` | Image incohérente, maintenance coûteuse | À faire | Design system unique (voir propositions) |
| M49 | Tutoiement et vouvoiement mélangés ; vocabulaire flottant | `app/index.tsx:104,150` ; `profile-details.tsx:97,104` ; `app/(tabs)/index.tsx:447` | Ton incohérent | P | Onglets, accueil et slides en partie corrigés. Reste : vouvoiement partout, pas d'emoji dans les messages système, « 0 crédit » |
| M50 | Accessibilité : contrastes sous 4,5:1, boutons sans libellé, petites cibles | toute l'app (289 touchables, 8 attributs d'accessibilité) | Inutilisable au lecteur d'écran ; textes peu lisibles | À faire | Libellés et rôles, zone tactile de 44 px, contrastes ≥ 4,5:1 |
| M51 | Journaux de l'app : erreurs avec e-mail, code ou jeton | `app/(auth)/verify.tsx:104` ; `messages.tsx` ; `index.tsx` ; `video-call.tsx` | Données visibles dans la console | P | Inscription corrigée. Reste : autres écrans ; journal réservé au développement, règle `no-console`, suivi des plantages masqué |
| M52 | Restes de noms tiers dans le code et la documentation | `types/index.ts` ; 6 documents (README, docs de déploiement et de recette) | Confusion de marque | P | Paquet renommé et fiche CGU corrigée. Reste : nettoyer ces fichiers ; retirer les noms de fournisseurs des textes affichés |

#### Application : architecture, web et outillage

| # | Constat | Où | Impact | Statut | Ce qui reste / correctif |
|---|---|---|---|---|---|
| M53 | Une panne réseau pendant le rafraîchissement déconnectait le membre | `services/api.ts` | Déconnexions intempestives | P | Corrigé pour le réseau. Reste : en-tête `Authorization` par défaut jamais nettoyé (l. 181), jeton relu dans le trousseau à chaque requête |
| M54 | Navigation dupliquée après connexion ; retour Android = chargement sans fin | `app/index.tsx` ; `login.tsx` ; `verify.tsx` ; `profile-details.tsx` | Écran bloqué, doubles appels | À faire | Accueil réduit à une redirection ; `dismissAll()` puis `replace` |
| M55 | Seuls les onglets sont protégés | `app/(tabs)/_layout.tsx` | Écrans privés ouverts par lien | À faire | `Stack.Protected` + hook `useSession` |
| M56 | Déconnexion incomplète (session et notifications non révoquées) | `context/auth.tsx` ; API | Notifications de l'ancien compte sur un téléphone partagé | À faire | `POST /auth/logout` et `DELETE /notifications/push-token` |
| M57 | Liste des messages : tout l'historique chargé, conversation par conversation | `messages.tsx:876-891` | Onglet de plus en plus lent | À faire | Route renvoyant le dernier message et les non-lus par parcours |
| M58 | Démarrage à froid de Render et hors-ligne mal gérés | `services/api.ts` ; `app/_layout.tsx` | Attentes jusqu'à 60 s, aucun message hors-ligne | À faire | Réveil au retour au premier plan, nouvelles tentatives, détection réseau, cache persisté |
| M59 | Site web sans référencement ni métadonnées (`lang="en"`, aucune description) | `app.json` ; `index.html` exporté | Site invisible et mal présenté | À faire | `lang="fr"`, description, Open Graph, page 404 BOLIGO |
| M60 | Bundle web lourd : 4,25 Mo (lucide 1,31 Mo, soit 31 %) | bundle exporté | Chargement lent sur mobile | À faire | Imports d'icônes ciblés ; code natif isolé ; retirer Ionicons |
| M61 | Configuration EAS/Expo incomplète (`projectId`, mises à jour, textes de permission) | `eas.json` ; `app.json` | Notifications push inopérantes, mises à jour impossibles | À faire | `eas init`, `runtimeVersion` par empreinte, textes de permission en français |
| M62 | `expo-av` déprécié ; sons retéléchargés à chaque lecture | `services/soundService.ts` | Mise à jour du SDK bloquée | À faire | `expo-audio` et fichiers locaux préchargés |
| M63 | Couverture de tests faible sur les chemins critiques | `mobile-steve/` | Régressions non détectées | P | 83 tests (modération, session). Reste : intercepteur complet, gardes, écrans, seuil de couverture en CI |

### Mineurs (24) : 0 C · 6 P · 18 à faire

| # | Constat | Où | Statut | Ce qui reste / correctif |
|---|---|---|---|---|
| m1 | Codes d'erreur incohérents (500 au lieu de 4xx ; `{success:false}` en 200) | `matching.service.ts` ; `common/filters/http-exception.filter.ts` | P | Parcours corrigés (400/403/404). Reste : traduire les erreurs Prisma (P2002 → 409, P2025 → 404) |
| m2 | Doublons possibles en cas de requêtes simultanées | `journey.service.ts` (réponses Sondeur) ; `interview.service.ts` ; `profile.service.ts` | P | Échange de coordonnées sérialisé. Reste : contraintes d'unicité (M16) + `upsert` |
| m3 | Hygiène de l'authentification : code d'inscription à 4 chiffres, en clair, sans expiration (l'e-mail annonce 15 min) | `auth.service.ts` ; `email.service.ts:179` | P | E-mail normalisé. Reste : code haché avec expiration et compteur d'essais |
| m4 | Injection HTML dans les e-mails, CSV exploitable dans Excel, profil sans limites | `email.service.ts:430-466` ; `admin.service.ts:256` ; `update-profile.dto.ts` | À faire | Échapper le HTML ; préfixer `'` les cellules commençant par `= + - @` ; limites de longueur |
| m5 | Configuration HTTP permissive : toutes origines, Swagger public, CSP désactivée | `src/main.ts` ; `chat.gateway.ts` | À faire | Liste blanche d'origines ; Swagger hors production ; CSP active |
| m6 | Dette technique API : code mort, doublons, scripts à la racine, `db push` sans migrations | `src/` ; racine du dépôt | À faire | Nettoyage ; `prisma migrate` |
| m7 | Micro-copie peu haut de gamme (« Dating sérieux », « Vibe », emojis) | `login.tsx` ; `[moduleNumber].tsx` ; `summary.tsx` | À faire | Charte éditoriale |
| m8 | Typographie française (« ... », « 1-3 », espaces) | `profile-details.tsx` ; `value-slides.tsx:98` | P | « 100% » et « 1er Juin » retirés ; reste « … » et tirets |
| m9 | Géolocalisation inopérante sur le web | `profile-details.tsx:301-331` | À faire | Masquer le bouton sur le web ; garde sur la ville |
| m10 | Erreurs brutes en anglais (« Network Error ») | `profile-details.tsx` ; `verify.tsx:105` | P | Inscription corrigée ; reste l'écran du code |
| m11 | Saisie du code e-mail fragile (« 12 » dans une case, pas de remplissage auto) | `verify.tsx:52-77` | À faire | Un chiffre par case, `autoComplete="one-time-code"` |
| m12 | Double tap = double envoi | `[moduleNumber].tsx` ; `discover.tsx` ; `index.tsx` | À faire | Verrou par `useRef` |
| m13 | Animations et minuteurs jamais arrêtés | `value-slides.tsx` ; `discover.tsx` ; `generation.tsx` | À faire | Arrêt au démontage ; respect de « réduire les animations » |
| m14 | Environ 7,3 s d'attente simulée avant le bilan | `generation.tsx` ; `summary.tsx` | À faire | Une seule transition, calée sur l'appel réel |
| m15 | Incohérences des slides et de l'accueil (« Passer » partiel, « © » comme crédit, CTA sous la ligne de flottaison) | `value-slides.tsx` ; `app/index.tsx` | À faire | — |
| m16 | Défauts visuels du Sondeur (« 2 questions », bouton cassé, « Réessayer » invisible) | `app/(tabs)/index.tsx` | À faire | — |
| m17 | Découverte : une erreur réseau s'affiche « Tout est à jour ! » | `discover.tsx:542-545` | À faire | État d'erreur distinct |
| m18 | Divers profil et paiement (âge à l'année, statut brut, nom de facturation factice) | `profile.tsx` ; `payment.tsx` | À faire | — |
| m19 | TypeScript non strict ; lint en échec (92 problèmes, 4 erreurs) | `tsconfig.json` ; `eslint` | À faire | `"strict": true` (0 erreur aujourd'hui) ; environnement Node pour `scripts/` et `e2e/` |
| m20 | `AppContext` fourre-tout avec de l'état mort | `context/AppContext.tsx` | À faire | Ne garder que les crédits |
| m21 | Code mort et dépendances inutiles | `services/profil.ts` ; `package.json` | À faire | Supprimer ou adopter (`Button`, `Input`) |
| m22 | Notifications : tap app fermée non géré, permission demandée hors contexte | `app/_layout.tsx` ; `services/notifications.ts` | À faire | Ouvrir la conversation ; demander après le premier match |
| m23 | Web dégradé : `window.confirm`, refresh token dans `localStorage` | `services/webAlert.ts` ; `services/storage.ts` | À faire | Modale BOLIGO commune ; refresh court sur le web |
| m24 | Socket recréé inutilement ; bandeau « Mode test » visible ; déconnexion au montage | `chatSocket.ts` ; `messages.tsx:562` ; `profile-details.tsx:212` | P | Durées de vidéo harmonisées. Reste le reste |

---

## Décisions à prendre par le propriétaire

1. **Cloisonnement de la base Supabase.** Les conseillers de sécurité Supabase du projet BOLIGO signalent :
   - des schémas d'un projet tiers, `oweke` et `oweke_test` ;
   - deux fonctions `SECURITY DEFINER`, `public.app_doc_merge` et `public.app_lock_acquire`, exécutables par les rôles `anon` et `authenticated` via `/rest/v1/rpc`.

   **Risque :** la séparation entre projets est rompue, et quiconque possède la clé publique peut appeler ces fonctions avec les droits de leur créateur.
   **Options :**
   - déplacer ces schémas et fonctions hors du projet BOLIGO (recommandé) ;
   - ou, a minima, `REVOKE EXECUTE … FROM anon, authenticated` sur ces fonctions.

   Rien n'a été exécuté, car cela touche un autre projet.
   **Point lié, sans action requise :** les tables BOLIGO ont la RLS activée **sans règle d'accès**. Personne ne peut donc les lire par l'API REST publique, tandis que l'API BOLIGO (Prisma, rôle propriétaire) n'est pas concernée. N'ajoutez aucune règle permissive, et gardez la clé publique Supabase hors de l'application.
2. **Codes promo en production.**

   | Code | Effet | Limite |
   |---|---|---|
   | `BOLIGO100` | gratuit | utilisations illimitées, une par membre |
   | `BOLIGO50` | −50 % | illimité |
   | `BIENVENUE5` | −5 € | illimité |
   | `HARMONIE`, `WELCOME`, `BETA2026` | gratuits | plafonnés, expirent le 31/12/2026 |

   **Recommandation :** désactiver ou plafonner `BOLIGO100`, `BOLIGO50` et `BIENVENUE5` avant le lancement public. Désactivez-les plutôt que de les supprimer, pour garder l'historique. Aucune donnée n'a été modifiée. La liste codée en dur a été retirée du code.
3. **Fournisseur d'e-mails.** Au déploiement du 3 octobre (16 h 25 UTC), l'API a écrit `[EMAIL] Mode d'envoi : smtp` : un serveur SMTP est bien configuré et les codes sont envoyés réellement.
   - Vérifiez que ce compte SMTP appartient à BOLIGO et que l'expéditeur (`EMAIL_FROM`) utilise le domaine BOLIGO, authentifié (SPF, DKIM), pour que les codes n'arrivent pas en spam.
   - Faites une inscription test de bout en bout pour confirmer la réception du code.
   - Vérifiez aussi que `OTP_DEBUG` est absent ou à `false` en production.
4. **Paiements Stripe.** Stripe tourne aujourd'hui dans le bac à sable de test BOLIGO. Les crédits sont attribués après confirmation côté serveur (`POST /payment/confirm`). Avant d'ouvrir les paiements réels :
   - définir `STRIPE_WEBHOOK_SECRET` sur Render (les webhooks non signés sont refusés en production) ;
   - passer la clé secrète live côté serveur ;
   - déclarer la clé publique live dans le profil EAS `production`, qui n'en a aucune aujourd'hui (B15).
5. **Mentions légales et consentement.** `constants/legal.json` contient encore **8 champs « [À COMPLÉTER] »** (20 occurrences) :
   - raison sociale, forme juridique et capital, RCS/SIREN, adresse du siège ;
   - directeur de la publication, e-mail de contact, e-mail du délégué à la protection des données ;
   - médiateur de la consommation.

   Ils sont obligatoires avant la publication. Faites aussi valider par un juriste la case unique d'acceptation, qui couvre les CGU, la confidentialité et le traitement des réponses de l'entretien. Ces réponses touchent des données sensibles (religion, vie intime), pour lesquelles un consentement séparé est recommandé.
6. **Visuels de l'application.** L'icône, l'icône adaptative et le splash ne sont plus des images de 1×1 pixel. Les visuels actuels sont **provisoires** (« B » blanc et cœur sur le dégradé de marque) : à remplacer par les visuels définitifs de la marque BOLIGO. `favicon.png` et `logo.png` (1×1, inutilisés) peuvent être supprimés.
7. **Ancien mot de passe administrateur.** Il a été retiré du script, mais il reste dans l'historique Git.
   - Considérez-le comme **compromis** et ne l'utilisez jamais.
   - Aucun compte administrateur n'existe en production. Créez-le, le moment venu, avec un `ADMIN_PASSWORD` fort (12 caractères minimum, gestionnaire de mots de passe).
   - La réécriture de l'historique Git est facultative.
8. **Connexion Google / Facebook.** Elle est désactivée tant que les identifiants BOLIGO ne sont pas configurés sur Render (`GOOGLE_CLIENT_IDS` ; `FACEBOOK_APP_ID` et `FACEBOOK_APP_SECRET`). L'application ne la propose pas aujourd'hui.

---

## Propositions haut de gamme

### 1. Visuel et expérience

**Constat chiffré** (mesuré dans `app/` et `components/`) :
- 312 couleurs hexadécimales écrites en dur (64 teintes), plus 218 `rgba()` ;
- 434 tailles de police en dur, avec 32 valeurs différentes ;
- environ 29 combinaisons de dégradés pour 88 `LinearGradient` ;
- 289 éléments touchables, pour seulement 8 attributs d'accessibilité ;
- un bundle web de 4,25 Mo (852 Ko compressé), dont 1,31 Mo pour la bibliothèque d'icônes lucide.

**Palette chaude, une seule.**

| Jeton | Valeur | Usage |
|---|---|---|
| `ink` | #1A1614 | Texte principal, icônes |
| `ink-2` / `ink-3` | #3A332E / #6B625B | Texte secondaire, légendes (contraste ≥ 4,5:1 sur `canvas`) |
| `canvas` | #FBF8F4 | Fond des écrans |
| `surface` | #FFFFFF | Cartes, feuilles |
| `brand` | #E8403A | Rouge BOLIGO, réservé aux actions principales |
| `gold` | #C89A2E | Accent premium (Parcours Harmonie, « Recommandé ») ; en bordure ou pictogramme, jamais sous du texte blanc |
| `cta` (dégradé) | #E8403A → #E8834A | **Le seul dégradé autorisé**, au lieu d'environ 29 combinaisons |

*Point d'attention :* du texte blanc sur #E8403A donne 4,0:1, et 2,7:1 sur #E8834A. Sur le CTA, mettez donc le libellé en 18 px semi-gras minimum, centré sur la partie rouge. Pour les petits boutons, prévoyez une variante accessible #C42E29 → #C4502A (≥ 4,6:1).

**Typographie : Fraunces (titres) + Inter (texte), échelle de 9 paliers** (au lieu de 32 tailles).

| Rôle | Taille / interligne | Police |
|---|---|---|
| display | 44 / 48 | Fraunces 600 |
| h1 | 34 / 40 | Fraunces 600 |
| h2 | 28 / 34 | Fraunces 500 |
| title | 22 / 28 | Inter 600 |
| titleSm | 18 / 24 | Inter 600 |
| body | 16 / 24 | Inter 400 |
| bodySm | 14 / 20 | Inter 400 |
| footnote | 12 / 16 | Inter 400 |
| overline | 11 / 14 | Inter 600, majuscules, espacement +1,5 |

Chargez les polices avant de masquer le splash. Un composant `<Text variant tone>` devient le seul accès aux polices : la graisse et la famille ne peuvent plus diverger.

**Rythme.**
- Grille de 4 points : 4, 8, 12, 16, 24, 32, 48, 64. Marge latérale unique de 24.
- Rayons : 8 (puces), 12 (champs), 16 (boutons), 24 (cartes et feuilles), pill. Cinq valeurs au lieu de plus de 30.
- Deux niveaux d'ombre. Durées d'animation de 150, 250 et 400 ms, avec le réglage « réduire les animations » respecté.

**Composants à extraire** :
- **Button** : primaire en dégradé, secondaire, discret, destructif ; états chargement, désactivé, pressé. Il remplace les 88 dégradés.
- **Card** : simple, bordée, premium.
- **ScoreRing** : libellé qualitatif d'abord (« Très forte compatibilité »), puis le chiffre en Fraunces, puis la preuve (« fondé sur 64 réponses comparées »). Plus de faux badge ni de particules.
- **Chip** : phases, modules, filtres.
- **Sheet** : feuille commune au natif et au web. Elle remplace `Alert` et `window.confirm`.
- **EmptyState** : avec un état d'erreur et « Réessayer ».
- **Field** : libellé, aide, erreur sous le champ, saisie automatique.

**Expérience.**
- Vouvoiement partout, sans emoji dans les messages système. Vocabulaire figé : Parcours Harmonie = Sondeur → Conversation → Rencontre vidéo → Coordonnées.
- Un **fil de parcours** visible en Découverte, Matchs et Messages, avec les heures d'ouverture exactes, la progression du partenaire et l'échéance de l'invitation.
- Grand Entretien : une question plein écran à la fois, avec un repère « Module 3 sur 11 · environ 4 min ».
- Ajoutez une règle de lint qui interdit les couleurs hexadécimales et les `fontSize` en dur dans `app/`.

### 2. Trois chantiers d'architecture prioritaires

1. **Session et navigation sur un seul modèle.**
   - `Stack.Protected` d'expo-router et un hook `useSession()`, qui lit et met en cache l'état de l'entretien une seule fois. Les écrans ne font plus leurs propres redirections, et l'accueil devient une simple redirection.
   - `dismissAll()` puis `replace` après chaque authentification.
   - Déconnexion côté serveur : révocation de la session et suppression du jeton de notification.
   - Corrige M54, M55, M56 et le reste de M53.
2. **Une couche de données unique avec TanStack Query.**
   - Cache par clé (`['matches', userId]`), nouvelles tentatives à délai croissant, rechargement au retour au premier plan, invalidation après chaque invitation, acceptation, réponse ou message.
   - Cache persisté pour le démarrage à froid de Render et le hors-ligne.
   - Remplace `cacheService`, les appels dispersés dans les `useEffect` et les 5 appels à `my-matches`. Corrige M36, M57, M58 et une partie de M40.
3. **Design system et variantes web.**
   - Dossiers `theme/` (jetons typés, clair et sombre) et `components/ui/` (composants ci-dessus).
   - Fichiers `*.web.tsx` pour ce qui diffère sur le web : vidéo en iframe Daily, paiement par Stripe Checkout, feuilles de dialogue. Code natif isolé en `*.native.ts`, imports d'icônes ciblés.
   - Corrige B10, M45, M47, M48, M60.

### 3. Scalabilité

| Sujet | Proposition | Bénéfice |
|---|---|---|
| Temps réel | Adaptateur Redis pour Socket.IO, présence dans Redis avec expiration, salons `user:{id}` et `journey:{id}` | Plusieurs instances de l'API sans perte de messages (M17) |
| Travail long | Files BullMQ pour la génération IA (carte mentale, Sondeur), les e-mails et les notifications (envoi Expo par lots de 100) | Requêtes rapides, reprises automatiques (M18) |
| Tâches planifiées | Cron idempotent (Render Cron Job ou `@nestjs/schedule` sous verrou PostgreSQL) pour l'expiration des invitations et la Règle de Justice | Règles appliquées à l'heure, même si personne n'ouvre l'app (B5, M10) |
| Matching | Table `CompatibilityScore(userA, userB, score, computedAt)` calculée à la fin de l'entretien ; Découverte en SQL indexé, paginée | Découverte rapide quel que soit le nombre de membres (M15) |
| Base | Migrations Prisma versionnées (`prisma migrate deploy` en CI) au lieu de `db push` ; pooler Supabase pour l'application | Historique, retour arrière, déploiements sûrs (m6) |
| Observabilité | Journaux structurés avec masquage, Sentry (API et app), route `/health`, `enableShutdownHooks()` | Incidents visibles sans exposer de données (M14, M51) |
| Limites de débit | Compteurs partagés dans Redis (HTTP et WebSocket) | Protection cohérente entre instances (M1, M7) |

---

## Tests et vérifications

| Suite | Résultat | Commande | Remarques |
|---|---|---|---|
| Tests unitaires de l'API (jest) | **107/107** (vérifié le 3 octobre) | `npm test` (racine du dépôt) | — |
| Intégration des règles corrigées | **20/20** | `npm run test:int` | Base PostgreSQL **locale** uniquement : le script refuse toute autre adresse. Données créées puis supprimées |
| Tests unitaires de l'application (jest) | **83/83** (vérifié le 3 octobre) | `cd mobile-steve && npm test` | 80 lors de la recette, plus 3 tests ajoutés avec le correctif de session (`eea337b`) |
| Recette navigateur (Playwright, export web) | **56/56** | voir ci-dessous | Résultats et captures : `mobile-steve/docs/E2E_RESULTATS.md`, `mobile-steve/docs/screenshots/` |
| Recette API de bout en bout | **80/80** | `cd mobile-steve && API_URL=http://localhost:3000/api npm run test:api` | Crée deux comptes jetables |
| Lint de l'application | en échec au moment de l'audit (92 problèmes, 4 erreurs) | `cd mobile-steve && npm run lint` | Voir m19 |

**Relancer la recette navigateur** (jamais contre la production) :

1. Lancer l'API en local, sur une base PostgreSQL locale, avec `OTP_DEBUG=true` pour accepter le code de test : `npm run start:dev`.
2. Exporter l'application web : `cd mobile-steve && npm run build:web`. Servir ensuite le dossier `dist/` sur `http://localhost:8081`.
3. Lancer la recette : `cd mobile-steve && APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api node e2e/journey.e2e.js`.

**Vérifications faites en production, en lecture seule** :
- conseillers de sécurité et de performance Supabase (décision n° 1, RLS, index) ;
- codes promo (décision n° 2) ;
- journaux d'envoi d'e-mails (décision n° 3) ;
- absence de compte administrateur (décision n° 7) ;
- configuration Stripe (décision n° 4).

La seule écriture en production est la migration additive des index et du consentement CGU.
