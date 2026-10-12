# BOLIGO — guide de recette pour Steve (préproduction)

Ce guide sert à vérifier l'application à la main, **en préproduction uniquement**.
Vous n'avez besoin d'aucune connaissance technique. Comptez **3 jours** pour le
parcours complet : le Sondeur ouvre une nouvelle journée toutes les 24 heures.
Pour aller plus vite, la personne technique peut avancer le parcours d'un jour
dans la base de préproduction.

> **Avant de commencer, lisez la partie « Où tester » (en bas).** Aujourd'hui,
> le dépôt ne contient **aucun environnement de préproduction**. Les adresses
> `boligo-web.onrender.com` et `boligo-admin.onrender.com` utilisent l'API et la
> base de **production**. **N'y faites pas cette recette.**

---

## 1. Ce qu'il vous faut

| Élément | Détail |
|---|---|
| Deux navigateurs | Par exemple Chrome pour le membre A et Firefox (ou une fenêtre privée) pour le membre B. Les deux comptes doivent rester connectés en même temps. |
| Adresse de l'app de préproduction | Donnée par la personne technique (voir « Où tester »). |
| Adresse du tableau de bord de préproduction | Idem. |
| Code de vérification (OTP) | En préproduction, le serveur fonctionne avec `OTP_DEBUG=true`. Le code **`1234`** est alors toujours accepté. |
| Carte de paiement de test | Voir la section 3. Aucun argent réel n'est prélevé. |

---

## 2. Comptes de test (fictifs)

Ces adresses sont fictives (`example.com` ne reçoit aucun e-mail). Le code `1234` remplace l'e-mail de vérification.

| Rôle | E-mail | Prénom | Je suis | Date de naissance | Ville |
|---|---|---|---|---|---|
| Membre A | `steve.recette.a@example.com` | Steve | Homme | 12/04/1990 | Paris |
| Membre B | `steve.recette.b@example.com` | Nadia | Femme | 15/09/1992 | Paris |
| Admin | `steve.recette.admin@example.com` | Admin | (au choix) | 01/01/1985 | Paris |

- Choisissez vous-même un mot de passe d'au moins 8 caractères avec une majuscule et un chiffre, par exemple. Ne le notez pas dans ce document.
- **Important pour la Découverte** : A et B doivent être de sexes opposés. Au premier module du Grand Entretien, chacun doit choisir une **tranche d'âge qui inclut l'âge de l'autre** (par exemple 28 à 40). Sinon, ils ne se verront pas.
- **Compte admin** : créez-le dans l'app comme un membre (avec le code `1234`). La personne technique place ensuite son adresse dans la variable `ADMIN_BOOTSTRAP_EMAIL` du serveur de préproduction. Le compte devient administrateur à la première connexion au tableau de bord. Cette variable ne fonctionne que tant qu'il n'existe aucun administrateur.

---

## 3. Paiement de test (Stripe en mode test)

Le dépôt indique que Stripe BOLIGO est **en mode test** (`docs/STRIPE_PASSAGE_EN_LIVE.md`).

- **Prix affiché** : « Parcours Harmonie », **15,00 € TTC**, paiement unique, 1 crédit.
- **Où** : écran « Votre parcours » (`/onboarding/payment`). On l'ouvre depuis le badge « N crédits » en haut de la Découverte, ou automatiquement quand vous n'avez plus de crédit.
- **Sur le web**, vous êtes redirigé vers la page de paiement Stripe, puis ramené dans l'app. **Sur téléphone**, une feuille de paiement Stripe s'ouvre.

| Carte | Numéro | Résultat attendu |
|---|---|---|
| Carte simple | `4242 4242 4242 4242` | Paiement accepté |
| Carte avec 3D Secure | `4000 0027 6000 3184` | Une fenêtre de validation s'ouvre. Cliquez « Complete / Autoriser » : paiement accepté. Cliquez « Fail » : paiement refusé. |

Pour toutes les cartes : une date d'expiration **future** (par exemple 12/34), un CVC au choix (par exemple 123), un nom et un code postal au choix.

> Chaque invitation **et** chaque acceptation coûte 1 crédit. A et B doivent donc avoir chacun 1 crédit.
> Autre solution : l'admin crée un **code promo gratuit** dans le tableau de bord (page « Codes promo »), puis A ou B le saisit sur l'écran de paiement (« Appliquer »).

---

## 4. Étapes de recette

Pour chaque étape, faites ce qui est indiqué dans « Ce que vous faites ». Puis vérifiez que l'écran correspond à « Ce que vous devez voir ».

### Étape 1 — Inscription et code de vérification (A, puis B)
**Ce que vous faites :**
1. Ouvrez l'app de préproduction et cliquez « Créer un compte ».
2. Remplissez les 4 étapes : prénom, métier, « Je suis », date de naissance, ville, e-mail, mot de passe, acceptation des conditions.
3. Sur l'écran « Validez votre e-mail », tapez `1234`, puis « Valider mon compte ».

**Ce que vous devez voir :**
- « Étape 1 sur 4 » jusqu'à « Étape 4 sur 4 ».
- Après le code, vous arrivez directement au **Grand Entretien, module 0**.
- Un mauvais code (par exemple `0000`) affiche « Code de vérification incorrect. »

### Étape 2 — Grand Entretien V8.2 (A dans le navigateur 1, B dans le navigateur 2)
**Ce que vous faites :**
1. Répondez aux questions, module par module (du module 0 au module 10, environ 110 questions).
2. Au module 0, saisissez d'abord une tranche d'âge **45 à 30** (invalide), puis une tranche correcte, par exemple **28 à 40**.
3. Au milieu d'un module, passez la langue en **English**, puis revenez en **Français**.
4. Au milieu d'un module, fermez l'onglet, rouvrez l'app et reconnectez-vous.
5. Quand l'app demande votre accord pour les questions sensibles : A répond **Oui**, B répond **Non**.

**Ce que vous devez voir :**
- La tranche 45 à 30 est refusée (bouton grisé). La tranche 28 à 40 est acceptée.
- En anglais, toute la question passe en anglais. Les réponses déjà données sont conservées.
- Après la reconnexion, vous reprenez **au module où vous vous étiez arrêté**.
- L'accord est demandé **avant** la première question sensible. Avec « Non », ces questions ne sont pas posées.
- À la fin, l'écran de génération apparaît, puis le **bilan du Grand Entretien**. Aucun texte « undefined » ni zone vide.
- Captures de référence : `mobile-steve/docs/screenshots/v82/01-entretien-module0.png` à `06-bilan.png`.

### Étape 3 — Découverte et score de compatibilité (A)
**Ce que vous faites :** ouvrez l'onglet **Découverte**.

**Ce que vous devez voir :**
- La fiche de **Nadia** (B), avec un cercle de compatibilité qui affiche un **pourcentage** et une appréciation (par exemple « Belle compatibilité »).
- Seuls le prénom, l'âge, la ville et le métier apparaissent. Le nom et les réponses brutes ne sont pas affichés.
- Capture de référence : `07-decouverte.png`.

### Étape 4 — Paiement de test (A, puis B)
**Ce que vous faites :**
1. Cliquez le badge « 0 crédits », puis « Choisir ce parcours ».
2. Cochez la demande de commencement du parcours.
3. Payez avec `4242 4242 4242 4242`.
4. Pour B, utilisez plutôt la carte 3D Secure `4000 0027 6000 3184` et validez la fenêtre.

**Ce que vous devez voir :**
- Le prix **15,00 € TTC** et la mention « TVA comprise · paiement unique · sans abonnement ».
- Sans la case cochée : le message « Cochez la demande de commencement du parcours pour continuer. »
- Après le paiement : « Paiement confirmé », retour à la Découverte et **1 crédit**.
- Un paiement annulé ou refusé n'ajoute **aucun** crédit.

### Étape 5 — Double consentement : invitation, puis acceptation
**Ce que vous faites :**
1. **A** : sur la fiche de Nadia, cliquez « J'aime ce profil ». Cochez « Le pacte anti-ghosting », puis cliquez « Confirmer ».
2. **B** : ouvrez la Découverte. Dans les invitations reçues, cliquez **Accepter**.

**Ce que vous devez voir :**
- A : le message de succès de l'invitation et 0 crédit. Une seconde invitation à un autre profil est refusée (« Vous avez déjà une invitation en attente ou un parcours en cours »).
- B : l'invitation de Steve apparaît, avec les boutons Accepter et Décliner.
- Après l'acceptation : le **Parcours Harmonie** démarre pour les deux comptes (onglet **Matchs**).
- Rien ne démarre tant que B n'a pas accepté : c'est le **double consentement**.
- Capture de référence : `08-invitation.png`.

### Étape 6 — Parcours Harmonie : le Sondeur (A et B, sur 3 jours)
**Ce que vous faites :**
1. **A** : dans l'onglet **Matchs**, cliquez « Question du jour ». Écrivez une réponse, puis « Valider la réponse ».
2. Cherchez un bouton pour passer la question.
3. **B** : ouvrez la même question. Vérifiez que la réponse de A n'est pas visible, puis répondez.
4. **A** : regardez l'écran après la réponse de B, puis cliquez « Question suivante ».
5. Au milieu de la journée : **A** revient à l'accueil avec la flèche ←, ferme l'onglet, puis rouvre « Question du jour ».
6. Terminez les questions du jour 1 sur les deux comptes, puis ouvrez de nouveau l'onglet Matchs.
7. Le lendemain (ou après que la personne technique a avancé le parcours d'un jour), faites les jours 2 et 3.

**Ce que vous devez voir :**
- **Une seule question à la fois.**
- **Aucun moyen de sauter** une question. Le serveur refuse aussi une réponse du type « je préfère en parler en personne » quand elle sert à éviter la question.
- Après avoir répondu, A voit un **écran d'attente** tant que B n'a pas répondu. A ne peut pas passer à la question suivante (`10b-sondeur-attente.png`).
- B **ne voit pas** la réponse de A avant d'avoir répondu lui-même.
- Quand les deux ont répondu, **les deux réponses s'affichent côte à côte**, avant la question suivante (`10c-sondeur-revelation.png`).
- Après avoir quitté puis être revenu, vous reprenez **exactement à la question non répondue**.
- Jour terminé : un message indique que la journée suivante ouvre **demain** (`11-sondeur-jour-ferme.png`).
- **B lit les questions en anglais** si son interface est en anglais. Ce sont les mêmes questions que A (`13-b-anglais.png`).
- **Relance / question d'approfondissement** : uniquement si l'IA est branchée en préproduction (clé OpenRouter). Après un jour terminé, un **résumé du jour** apparaît. Une question du jour suivant peut être remplacée par une question qui revient sur un écart entre vos réponses. Sans IA, aucune relance : c'est normal.
- Fin du jour 3 : le Sondeur est terminé (`12-sondeur-termine.png`).

### Étape 7 — Ouverture du chat
**Ce que vous faites :** quand les deux comptes ont répondu à **toutes** les questions des 3 jours, ouvrez l'onglet **Messages**.

**Ce que vous devez voir :**
- Avant la fin du Sondeur : « Terminez votre premier parcours Harmonie pour accéder aux messages ».
- Après la fin : la conversation avec l'autre membre s'ouvre, et une notification « chat ouvert » arrive.
- Si l'IA est branchée, le chat attend que l'IA ait écrit les résumés. Si l'IA est en panne, il s'ouvre après 3 essais, soit **environ 20 minutes**. C'est le comportement prévu : rouvrez l'onglet plus tard.
- Le chat libre dure 3 jours. Vient ensuite l'étape appel vidéo, puis l'échange de contacts (étapes facultatives pour cette recette).

### Étape 8 — Bilan Harmonie
**Ce que vous faites :** sur l'onglet **Matchs**, après la fin des 3 jours.

**Ce que vous devez voir :**
- Les cartes « Résumé du jour 1/2/3 » et la carte **« Bilan Harmonie »**, avec les accords, les points à explorer et des idées pour en parler.
- Ces cartes apparaissent seulement si l'IA est branchée. Sinon, notez leur absence sans la compter comme une anomalie.

### Étape 9 — Sécurité : modération, signalement, fin de parcours
**Ce que vous faites (dans le chat, compte A) :**
1. Envoyez un message contenant un lien, par exemple `www.exemple.com`, ou un gros mot.
2. Cliquez le bouton d'options de la conversation (en haut), puis « Signaler Nadia », puis un motif (par exemple « Faux profil »).
3. *(À faire en dernier, car cela clôt le parcours)* Ouvrez de nouveau les options, puis « Mettre fin poliment au parcours ». Choisissez un message, puis « Mettre fin ».

**Ce que vous devez voir :**
- Le message avec le lien ou le gros mot est **refusé** et n'arrive pas chez B.
- « Signalement envoyé — Merci. L'équipe de modération BOLIGO va examiner la situation. »
- Après la fin du parcours : le parcours est terminé pour les deux. B reçoit le message de courtoisie, son crédit lui est rendu et le chat est fermé.
- Il n'existe **pas de bouton « Bloquer »** distinct. La protection passe par le signalement, la fin de parcours et la modération (suspension par l'admin).

### Étape 10 — Tableau de bord admin
**Ce que vous faites :**
1. Ouvrez l'adresse du tableau de bord de préproduction, puis la page `/login`.
2. Connectez-vous avec `steve.recette.admin@example.com` et votre mot de passe.
3. Visitez : Vue d'ensemble, Membres, Rencontres, Parcours, **Signalements**, **Modération** (messages bloqués), Finances, Codes promo, Équipe.

**Ce que vous devez voir :**
- Un compte membre normal (A ou B) est **refusé** (« Identifiants invalides »). Seuls les rôles Administrateur, Modération et Marketing peuvent entrer.
- Membres : Steve et Nadia apparaissent. Le compte admin, lui, n'apparaît jamais dans la Découverte.
- Signalements : le signalement de l'étape 9, au statut « en attente ».
- Modération : le message refusé de l'étape 9.
- Finances : les deux paiements de test de 15 €.
- Parcours : le parcours Steve–Nadia et son étape.
- Équipe : vous pouvez donner un rôle « Modération » à un autre compte vérifié.

---

## 5. Check-list finale

- [ ] Inscription A et B, code `1234` accepté, mauvais code refusé
- [ ] Grand Entretien terminé (A en français avec accord, B avec refus des questions sensibles)
- [ ] Tranche d'âge invalide refusée, reprise au bon module après reconnexion
- [ ] Bascule français / anglais sans perte de réponses
- [ ] Bilan du Grand Entretien lisible
- [ ] Découverte : B visible par A, avec un pourcentage de compatibilité
- [ ] Paiement 4242 : 1 crédit ajouté
- [ ] Paiement 3D Secure : 1 crédit ajouté. Si la validation échoue : aucun crédit
- [ ] Invitation de A, puis acceptation de B : parcours démarré
- [ ] Sondeur : une question à la fois, pas de saut possible
- [ ] Sondeur : réponse de l'autre cachée avant la sienne, puis les deux réponses révélées
- [ ] Sondeur : quitter puis revenir reprend à la même question
- [ ] Sondeur : jour suivant fermé jusqu'au lendemain, 3 jours terminés
- [ ] Question d'approfondissement ou résumés du jour (si l'IA est branchée)
- [ ] Chat ouvert seulement après le Sondeur complet
- [ ] Bilan Harmonie affiché (si l'IA est branchée)
- [ ] Message avec lien ou gros mot refusé
- [ ] Signalement envoyé et visible dans le tableau de bord
- [ ] Fin de parcours : crédit rendu à l'autre membre
- [ ] Tableau de bord : accès refusé à un membre, accès accordé à l'admin, pages consultées

## 6. Si quelque chose bloque

1. **Faites une capture d'écran** de tout l'écran, avec la barre d'adresse si vous êtes sur le web.
2. Notez : **l'étape** (par exemple « Étape 6, jour 1, question 3 »), **le compte** (A, B ou admin), **l'heure exacte**, **ce que vous avez fait** et **ce que vous attendiez**.
3. Si un message d'erreur s'affiche, recopiez-le mot pour mot.
4. Envoyez le tout à la personne technique. **N'envoyez jamais de mot de passe.**
5. Le premier chargement peut prendre **jusqu'à une minute** (« Le serveur se réveille… »). C'est normal sur une offre gratuite. Attendez avant de signaler un problème.

---

## 7. Où tester

### Ce qui existe vraiment dans le dépôt

| Nom | Adresse | Vers quelle API / base | Source dans le code |
|---|---|---|---|
| API `Boligo-back` (**production**) | `https://boligo-back.onrender.com/api` | Base Supabase de production (projet partagé avec des schémas OWEKE) | `mobile-steve/services/api.ts`, `mobile-steve/docs/DEPLOIEMENT.md` §3.1, `docs/BOLIGO_MOTEUR_COMPATIBILITE.md` |
| App web `boligo-web` | `https://boligo-web.onrender.com` | API de **production** | `render.yaml` (branche `main`, `EXPO_PUBLIC_API_URL` = API de production) |
| Tableau de bord `boligo-admin` | `https://boligo-admin.onrender.com` | API de **production** | `render.yaml`, `admin/README.md`, `src/common/cors.ts` |
| Builds mobiles EAS (`development`, `preview`, `production`) | — | Les trois profils pointent vers l'API de **production** | `mobile-steve/eas.json` |
| Projet Supabase `oweke-staging` | — | Ce n'est **pas** BOLIGO (projet OWEKE) | `docs/BOLIGO_MOTEUR_COMPATIBILITE.md` |

**Conclusion : il n'existe aucun environnement de préproduction BOLIGO.** Aucun fichier `render.yaml`, aucune configuration `.github/workflows` (le dossier n'existe pas), aucun profil EAS ni aucun fichier `.env` ne déclare d'adresse de préproduction ou de staging.

La seule recette « préprod » qui a eu lieu (`docs/RECETTE_V82_PREPROD.md`) a été faite sur un **serveur et une base locaux**, dans le conteneur de développement. Le script `mobile-steve/e2e/v82.e2e.js` refuse d'ailleurs toute adresse autre que `localhost`.

> **Ne faites pas cette recette sur `boligo-web.onrender.com`.** La production utilise la version d'entretien 7.1 par défaut, n'a pas `OTP_DEBUG`, et vos comptes de test pollueraient les vrais membres.

### Ce qu'il faut créer pour une préproduction (à faire par la personne technique — rien n'a été créé)

Il faut **trois services Render séparés** et **une base séparée**, qui ne partagent rien avec la production.

**1. Base de données séparée**
- Option recommandée : un **nouveau projet Supabase** `boligo-staging`, distinct du projet de production. Récupérez l'URL du pooler (`DATABASE_URL`) et l'URL directe (`DIRECT_URL`).
- Autre option : une base **Render Postgres payante**. Les bases gratuites de Render expirent au bout de 30 jours (`mobile-steve/docs/DEPLOIEMENT.md`).
- Création du schéma (le dépôt utilise `prisma db push`, pas de migrations versionnées) :

```bash
# Sur un poste de développeur, avec l'URL de la base de PRÉPROD uniquement :
DATABASE_URL="<url-preprod>" DIRECT_URL="<url-directe-preprod>" npx prisma db push
# Puis, si l'équipe technique le juge utile, les scripts additifs de prisma/sql/
# (dont 2026-10-12_version_entretien.sql et 2026-10-12_sondeur_bilingue.sql) :
psql "<url-directe-preprod>" -f prisma/sql/2026-10-12_version_entretien.sql
psql "<url-directe-preprod>" -f prisma/sql/2026-10-12_sondeur_bilingue.sql
```

**2. Variables de l'API de préproduction** (service `boligo-back-staging`)

| Variable | Valeur de préproduction |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Base de **préproduction** uniquement |
| `JWT_SECRET` | Nouvelle valeur aléatoire, **différente** de la production |
| `NODE_ENV` | `production` |
| `OTP_DEBUG` | `true` (code `1234` accepté — **jamais en production**) |
| `INTERVIEW_VERSION` | `8.2` |
| `STRIPE_SECRET_KEY` | `sk_test_…` (compte Stripe BOLIGO, **mode test**) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` du même compte |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` d'un **nouveau** webhook de test vers `https://boligo-back-staging.onrender.com/api/payment/webhook` (événement `payment_intent.succeeded`) |
| `WEB_APP_URL` | `https://boligo-web-staging.onrender.com` (retour de la page de paiement Stripe, sinon le membre revient en production) |
| `PUBLIC_WEB_URL` | idem |
| `ADMIN_ALLOWED_ORIGINS` | `https://boligo-admin-staging.onrender.com` |
| `ADMIN_BOOTSTRAP_EMAIL` | `steve.recette.admin@example.com` |
| `GHOSTING_MONITOR` | `observe` (par défaut) |
| `VIDEO_TEST_UNLOCK` | `true` (facultatif, pour tester l'appel vidéo plus tôt) |
| `OPENROUTER_API_KEY` / `GROQ_API_KEY` | Facultatif : nécessaire pour les résumés, la question d'approfondissement et le bilan Harmonie |
| `AI_JOURNEY_BUDGET_EUR`, `AI_JOURNEY_MONTHLY_CAP_EUR`, `AI_MONTHLY_BUDGET_EUR` | Petits plafonds, par exemple 1 / 10 / 5 |
| E-mails (`RESEND_API_KEY`, SMTP…) | **Laisser vides** : mode simulation, aucun e-mail réel envoyé |
| `SAFETY_ALERT_EMAILS`, `BILLING_ALERT_EMAILS` | Vides, ou une adresse de l'équipe |

**3. Exemple de `render.yaml` de préproduction** (à mettre dans un fichier séparé, par exemple `render.staging.yaml`, ou à saisir à la main dans le tableau de bord Render ; **non créé**) :

```yaml
# PRÉPROD BOLIGO — aucun lien avec la production.
services:
  # API NestJS de préproduction, construite depuis la branche de recette.
  - type: web
    name: boligo-back-staging
    runtime: node
    branch: claude/magical-keller-kw9t2c   # branche à recetter
    buildCommand: npm ci && npx prisma generate && npm run build
    startCommand: node --max-old-space-size=512 dist/main.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: OTP_DEBUG            # code 1234 accepté : JAMAIS en production
        value: "true"
      - key: INTERVIEW_VERSION
        value: "8.2"
      - key: WEB_APP_URL
        value: https://boligo-web-staging.onrender.com
      - key: PUBLIC_WEB_URL
        value: https://boligo-web-staging.onrender.com
      - key: ADMIN_ALLOWED_ORIGINS
        value: https://boligo-admin-staging.onrender.com
      - key: ADMIN_BOOTSTRAP_EMAIL
        value: steve.recette.admin@example.com
      - key: JWT_SECRET
        generateValue: true       # valeur aléatoire propre à la préprod
      # Secrets saisis à la main dans le tableau de bord (jamais dans le dépôt) :
      - key: DATABASE_URL         # base de PRÉPROD
        sync: false
      - key: DIRECT_URL
        sync: false
      - key: STRIPE_SECRET_KEY    # sk_test_… uniquement
        sync: false
      - key: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY   # pk_test_…
        sync: false
      - key: STRIPE_WEBHOOK_SECRET
        sync: false
      - key: OPENROUTER_API_KEY   # facultatif
        sync: false

  # App web (export Expo) pointant vers l'API de préproduction.
  - type: web
    name: boligo-web-staging
    runtime: static
    branch: claude/magical-keller-kw9t2c
    rootDir: mobile-steve
    buildCommand: npm ci && npx expo export --platform web && cp dist/index.html dist/404.html
    staticPublishPath: dist
    envVars:
      - key: EXPO_PUBLIC_API_URL
        value: https://boligo-back-staging.onrender.com/api
      - key: NODE_VERSION
        value: "22"
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

  # Tableau de bord de préproduction.
  - type: web
    name: boligo-admin-staging
    runtime: static
    branch: claude/magical-keller-kw9t2c
    rootDir: admin
    buildCommand: npm ci && npm run build
    staticPublishPath: out
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://boligo-back-staging.onrender.com/api
      - key: NODE_VERSION
        value: "22"
    headers:
      - path: /*
        name: X-Robots-Tag
        value: noindex, nofollow
      # La politique de contenu du render.yaml de production n'autorise que
      # boligo-back.onrender.com : ici, il faut autoriser l'API de préproduction.
      - path: /*
        name: Content-Security-Policy
        value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://boligo-back-staging.onrender.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
```

**4. Après la création :**
- Créez le compte admin dans l'app de préproduction (code `1234`), puis connectez-vous au tableau de bord de préproduction.
- Pour la recette sur téléphone : faites un build EAS avec `EXPO_PUBLIC_API_URL=https://boligo-back-staging.onrender.com/api`. Par exemple, ajoutez un profil `staging` dans `eas.json`, ou lancez `npx expo start` avec un `.env` qui pointe vers la préproduction.
- Pour avancer le Sondeur d'un jour, **uniquement sur la base de préproduction** (c'est ce que fait la recette automatisée) :
  `UPDATE "Journey" SET "stepStartDate" = "stepStartDate" - interval '1 day' WHERE id = '<id du parcours>';`
- Gardez en tête : l'offre gratuite de Render est partagée avec les services `oweke-server*` (750 heures par mois). Une préproduction gratuite qui reste allumée en consomme une partie.
