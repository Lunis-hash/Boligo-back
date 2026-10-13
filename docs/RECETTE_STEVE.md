# BOLIGO — guide de recette pour Steve (site en ligne, nouvelle version)

Ce guide sert à vérifier l'application à la main, **sur le site en ligne**
(`https://boligo-web.onrender.com` pour l'app, `https://boligo-admin.onrender.com`
pour le tableau de bord), **une fois la nouvelle version déployée** par l'équipe
technique. Vous n'avez besoin d'aucune connaissance technique. Comptez **3 jours**
pour le parcours complet : le Sondeur ouvre une nouvelle journée toutes les 24 h.

> **Règles de la recette sur le site en ligne**
> - Utilisez **uniquement vos comptes de test** (deux adresses e-mail que vous
>   contrôlez, par exemple deux alias `+recette-a` / `+recette-b` de votre boîte).
>   Ne touchez à aucun autre profil. Vos anciens profils de test « zaz » et
>   « steve » sont supprimés par vous-même.
> - Le code de vérification arrive **par e-mail** (sur le site en ligne, le code
>   `1234` n'est pas accepté).
> - Paiement : utilisez la carte de test **seulement si** l'équipe confirme que
>   Stripe est en **mode test** sur le site en ligne ; sinon, demandez un **code
>   promo** de recette (créé dans le tableau de bord) au lieu de payer.

## 0. Ce que vous pouvez tester, et quand

| Élément | Avant le déploiement (site actuel) | Après le déploiement de la nouvelle version |
|---|---|---|
| Inscription, connexion, découverte, invitation, chat, signalement, tableau de bord | Oui | Oui |
| Grand Entretien **V8.2** (tranche d'âge, accord pour les questions sensibles, bascule FR/EN) | Non (branche seulement) | Oui |
| Sondeur **réciproque** (une question à la fois, révélation des deux réponses, impossible de sauter, reprise exacte) | Non (branche seulement) | Oui |
| Sondeur **adaptatif** (9 à 17 questions selon les écarts réels) et questions IA **uniquement sur les écarts** | Non (branche seulement) | Oui |
| **Relance** ciblée le lendemain, seulement si un écart reste à éclaircir | Non (branche seulement) | Oui |
| Sondeur **bilingue** (le membre anglophone voit les questions en anglais) | Non (branche seulement) | Oui |

**Pour voir dès maintenant ce qui n'est que sur la branche** : captures du parcours
dans `mobile-steve/docs/screenshots/v82/` (01 à 13) et vidéo
`mobile-steve/docs/screenshots/v82/demo-parcours-sondeur.mp4` ; exemples de
questions du Sondeur dans `docs/sondeur-benchmark/2026-10-12-final/README.md`.

---

## 1. Ce qu'il vous faut

| Élément | Détail |
|---|---|
| Deux navigateurs | Par exemple Chrome pour le membre A et Firefox (ou une fenêtre privée) pour le membre B. Les deux comptes doivent rester connectés en même temps. |
| Deux adresses e-mail | Que vous lisez (le code de vérification y arrive). |
| Adresse de l'app | `https://boligo-web.onrender.com` |
| Adresse du tableau de bord | `https://boligo-admin.onrender.com` (compte administrateur existant de l'équipe). |
| Paiement | Carte de test (section 3) **si Stripe est en mode test**, sinon code promo de recette. |

---

## 2. Comptes de test

Utilisez deux adresses e-mail **à vous** (le code de vérification y arrive), par
exemple `votre.adresse+recette-a@…` et `votre.adresse+recette-b@…`.

| Rôle | E-mail | Prénom | Je suis | Date de naissance | Ville |
|---|---|---|---|---|---|
| Membre A | votre adresse `+recette-a` | Steve | Homme | 12/04/1990 | Paris |
| Membre B | votre adresse `+recette-b` | Nadia | Femme | 15/09/1992 | Paris |
| Admin | compte administrateur existant de l'équipe | — | — | — | — |

- Choisissez un mot de passe d'au moins 8 caractères avec une majuscule et un chiffre. Ne le notez pas dans ce document.
- **Important pour la Découverte** : A et B doivent être de sexes opposés. Au premier module du Grand Entretien, chacun doit choisir une **tranche d'âge qui inclut l'âge de l'autre** (par exemple 28 à 40). Sinon, ils ne se verront pas.
- **Ne touchez à aucun autre profil** du site en ligne.
- Dans les étapes ci-dessous, « le code `1234` » se lit « le code reçu par e-mail ».

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
1. Ouvrez l'app (`https://boligo-web.onrender.com`) et cliquez « Créer un compte ».
2. Remplissez les 4 étapes : prénom, métier, « Je suis », date de naissance, ville, e-mail, mot de passe, acceptation des conditions.
3. Sur l'écran « Validez votre e-mail », tapez le code reçu par e-mail, puis « Valider mon compte ».

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
7. Le lendemain, faites le jour 2, puis le surlendemain le jour 3.

**Ce que vous devez voir :**
- **Une seule question à la fois.**
- **Aucun moyen de sauter** une question. Le serveur refuse aussi une réponse du type « je préfère en parler en personne » quand elle sert à éviter la question.
- Après avoir répondu, A voit un **écran d'attente** tant que B n'a pas répondu. A ne peut pas passer à la question suivante (`10b-sondeur-attente.png`).
- B **ne voit pas** la réponse de A avant d'avoir répondu lui-même.
- Quand les deux ont répondu, **les deux réponses s'affichent côte à côte**, avant la question suivante (`10c-sondeur-revelation.png`).
- Après avoir quitté puis être revenu, vous reprenez **exactement à la question non répondue**.
- Jour terminé : un message indique que la journée suivante ouvre **demain** (`11-sondeur-jour-ferme.png`).
- **B lit les questions en anglais** si son interface est en anglais. Ce sont les mêmes questions que A (`13-b-anglais.png`).
- **Relance / question d'approfondissement** : uniquement si un écart reste à éclaircir après la lecture du jour (l'IA est branchée sur le site en ligne). Après un jour terminé, un **résumé du jour** apparaît. Une question du jour suivant peut être remplacée par une question qui revient sur un écart entre vos réponses. Sans IA, aucune relance : c'est normal.
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
1. Ouvrez `https://boligo-admin.onrender.com`, puis la page `/login`.
2. Connectez-vous avec le compte administrateur existant de l'équipe.
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

- [ ] Inscription A et B, code reçu par e-mail accepté, mauvais code refusé
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

- **Sur le site en ligne**, après le déploiement de la nouvelle version par l'équipe
  technique : `https://boligo-web.onrender.com` (app) et
  `https://boligo-admin.onrender.com` (tableau de bord).
- Il n'existe **pas d'environnement de préproduction** BOLIGO, et il n'en sera pas
  créé (décision du 12/10/2026). La migration future vers un autre serveur est
  préparée dans `docs/MIGRATION_SERVEUR.md` (Docker, variables, sauvegarde,
  bascule, retour arrière).
- Avant déploiement, les nouveautés se voient dans les captures et la vidéo
  (section 0).
- **Avancer le Sondeur d'un jour** n'est pas possible sur le site en ligne :
  comptez 3 jours réels pour le parcours complet.
