# Déploiement BOLIGO sur les services Render existants

Ressources **existantes uniquement** : aucun nouveau service Render, projet
Supabase ou abonnement. Aucune fusion ni aucun déploiement sans l'autorisation
expresse de Steve. Stripe reste en **mode test** : aucun paiement réel.

## 0. État relevé (lecture seule, 13/10/2026)

### Services Render

Espace de travail : « My Workspace ».

| Service | Id | Type | Branche | Déploiement auto | En ligne |
|---|---|---|---|---|---|
| `Boligo-back` | `srv-d9ah0tlaeets73dvl13g` | web (Node, plan free, Virginia) | `main` | oui, à chaque commit | `dep-db61jjou01pc73f5lfs0` = `5853aa6` |
| `boligo-web` | `srv-db00m4u0tbcc73fmpib0` | site statique (`mobile-steve/**`) | `main` | oui | `dep-db61jjou01pc73f5lfp0` = `5853aa6` |
| `boligo-admin` | `srv-db23v2jbc2fs73f58nqg` | site statique (`admin/**`) | `main` | oui | `dep-db58gi740ujc73c8kdrg` = `4723609` |

Points à retenir :

- **Fusionner la PR #42 dans `main` déclenche immédiatement le déploiement** de `Boligo-back` et de `boligo-web`. La PR ne touche pas `admin/` : `boligo-admin` ne bouge pas.
- La base de production est sur **Supabase** (aucune base Postgres Render).
- `Boligo-back` n'a **pas de chemin de contrôle de santé** (`healthCheckPath` vide). Render met donc en ligne un build même si l'API ne démarre pas. Recommandation : renseigner `/api/health` (voir §3, réglage à autoriser).
- Le compte Stripe connecté est « environnement de test BOLIGO » (`acct_1UMQWmLz8rnS1CBn`, `livemode: false`).
  - Son webhook de test `we_1UP2h9Lz8rnS1CBnjkMldEOm` pointe vers `https://boligo-back.onrender.com/api/payment/webhook`.
  - Événements écoutés : `payment_intent.succeeded`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.

## 1. Dernière validation : Stripe réel en mode test

Le script `mobile-steve/e2e/recette-stripe-test.sh` pilote `recette-stripe-test.js`. La recette tourne sur :
- le build final (`dist/`) ;
- une base PostgreSQL locale dédiée ;
- des comptes fictifs.

Elle n'est exécutée qu'**une seule fois**, après autorisation.

```
bash mobile-steve/e2e/recette-stripe-test.sh verifier
RECETTE_STRIPE_AUTORISEE=oui WEBHOOK_RENDER=couper bash mobile-steve/e2e/recette-stripe-test.sh executer
```

- La première commande fait les contrôles préalables, sans aucun paiement.
- La seconde lance la recette complète.

### Étapes vérifiées contre Stripe (aucune simulation)

1. **Création du paiement** : session Checkout créée par l'API, relue chez Stripe (`livemode=false`, montant, membre).
2. **Page Checkout réelle** : paiement avec la carte de test 4242, puis retour `success`. Captures dans `docs/recette-stripe-test/`.
3. **Webhook reçu localement** : `payment_intent.succeeded` livré par Stripe via `stripe listen` et accepté (HTTP 200). Le crédit est attribué avant toute confirmation de l'app.
4. **Crédit unique** :
   - la confirmation de l'app arrive ensuite ;
   - puis `stripe events resend <evt>` provoque une nouvelle livraison réelle, comptée dans le journal du listener ;
   - résultat attendu : toujours 1 crédit et 1 transaction.
5. **Facture** : émise dans le registre, payée chez Stripe, PDF disponible.
6. **Remboursement** : rétractation, décision de l'admin, remboursement Stripe `succeeded`, puis webhook réel `charge.refunded`.
7. **Crédits mis à jour** : crédit retiré une seule fois.

À la fin, la configuration des webhooks du compte est comparée à l'instantané de départ (`webhooks-avant.json` / `webhooks-apres.json`).

### Protections du script

Elles ont été vérifiées le 13/10/2026 avec un faux Stripe CLI local : aucun appel à Stripe, aucun résultat de paiement.

| Protection | Vérification |
|---|---|
| Clé `sk_live_`, `pk_` ou absente | refus |
| Stripe CLI absent | refus |
| `events resend` sans l'option `--webhook-endpoint` (syntaxe inattendue) | refus |
| Clé sans les permissions nécessaires (sondes d'écriture volontairement invalides, rien n'est créé) | refus avant la base |
| Compte autre que `acct_1UMQWmLz8rnS1CBn` | refus |
| `executer` sans `RECETTE_STRIPE_AUTORISEE=oui` | refus |
| Décision sur le webhook Render absente, ou contraire à l'état réel du webhook | refus |
| Base `boligo_recette_stripe` existante **sans** marqueur de base jetable | refus, la base reste intacte |
| Création de la base dédiée | nom imposé, marqueur posé, identité contrôlée (`current_database` et 127.0.0.1), `prisma db push` bloquant (180 s), 6 tables de paiement contrôlées |
| Listener Stripe non prêt | arrêt après 60 s |
| Clé dans les arguments de processus | jamais : `STRIPE_API_KEY` est transmise par l'environnement, 0 occurrence dans 104 appels |

Délais maximaux :
- PostgreSQL : 30 s ;
- backend : 90 s (HTTP 200 et `db ok` attendus) ;
- connexion Stripe annoncée par le backend : 30 s ;
- chaque attente Stripe : 60 à 120 s.

Le secret de signature est lu dans la sortie du **même** listener que celui qui transmet les événements. Les journaux bruts restent dans un dossier temporaire 0700, supprimé à la fin. Seules des copies masquées sont conservées.

Aucun script `prisma/sql` n'est exécuté : sur une base neuve, `prisma db push` crée tout le schéma. Aucune migration n'est appliquée à Supabase.

### Effets sur le webhook Render existant (`we_1UP2h9Lz8rnS1CBnjkMldEOm`)

Les événements de la recette sont aussi envoyés à `https://boligo-back.onrender.com/api/payment/webhook`. Le code de `main` actuellement en ligne (`5853aa6`) a été lu :

- **`payment_intent.succeeded`** : le membre fictif n'existe pas en production. La mise à jour du solde échoue, la transaction est annulée et rien n'est écrit. Render répond 500 et Stripe réessaie quelques fois. `stripe events resend` peut produire une livraison de plus, avec le même effet nul.
- **`charge.refunded`** : le paiement est inconnu en production, donc aucune écriture de crédit ni de paiement. **Mais** si la facturation est activée sur Render (`BILLING_ENABLED`), l'API **enregistre une ligne technique `StripeEvent`** (identifiant de l'événement de test) dans la base Supabase de production.

Pour garantir « aucune donnée de production modifiée », la **désactivation temporaire du webhook est indispensable**. Elle ne se fait qu'avec l'autorisation de Steve.

**Coupure et restauration automatiques** (`WEBHOOK_RENDER=couper`, validé par Steve le 13/10/2026) :

1. **Contrôles avant coupure.** Le script ne touche que `we_1UP2h9Lz8rnS1CBnjkMldEOm`, en mode test. Il refuse de couper si le webhook diffère de l'état attendu : adresse, 4 événements, aucune métadonnée. Il enregistre ensuite l'état d'origine dans `/tmp/boligo-webhook-garde/webhook-origine.json`.
2. **Moment de la coupure.** Elle a lieu juste avant les paiements (`disabled=true`), avec une métadonnée visible dans le tableau de bord : `boligo_recette = « Coupé pour la recette… À RÉACTIVER »`. La coupure est confirmée par une relecture.
3. **Restauration automatique.** Elle se déclenche à tout arrêt gérable : fin normale, erreur, Ctrl-C, signal TERM ou HUP. Le script remet `disabled=false`, retire la métadonnée, puis vérifie de façon indépendante par une nouvelle lecture, champ par champ, contre l'état d'origine. Il fait jusqu'à 5 essais.
4. **Chien de garde détaché** (`recette-stripe-garde.sh`). Si le script disparaît brutalement (`kill -9`), ou au plus tard après 45 minutes, il restaure et vérifie lui-même.
5. **Échec de restauration.** Le script affiche `🚨 ALERTE`, écrit `docs/recette-stripe-test/ALERTE-WEBHOOK.txt` et `/tmp/boligo-webhook-garde/ALERTE`, puis se termine en code 3.
6. **Vérification finale.** Elle a lieu après la recette, par un autre canal (le connecteur Stripe de Claude, en lecture).

Ces comportements ont été testés le 13/10/2026 avec un faux Stripe CLI, sans aucun appel réel :
- coupure puis restauration identique ;
- refus de réactivation par Stripe, qui déclenche l'alerte et le code 1 ;
- `kill -9` du script, puis restauration par le chien de garde en moins de 12 s ;
- erreur pendant une coupure, puis restauration ;
- signaux TERM et INT à 0,3 s, 1,5 s et 5 s, puis restauration à chaque fois ;
- secours sans instantané ;
- refus de couper un webhook inattendu.

**Si la session s'interrompt brutalement** (conteneur arrêté : ni le script ni le chien de garde ne tournent plus) :

- **Alerte** : avant le lancement, un rappel automatique est programmé dans cette session environ 40 minutes plus tard. Il est délivré même après un redémarrage du conteneur. À son déclenchement, Claude lit l'état du webhook par le connecteur Stripe. S'il est encore coupé (statut `disabled` ou métadonnée `boligo_recette`), Claude le réactive, vérifie, et signale l'incident à Steve.
- **Récupération immédiate**, au choix :
  - dans une nouvelle session : `bash mobile-steve/e2e/recette-stripe-test.sh restaurer` (sans instantané, il rétablit l'état d'origine connu et le vérifie) ;
  - à la main : tableau de bord Stripe, **environnement de test BOLIGO** → Développeurs → Webhooks → `BOLIGO API (Render Boligo-back)` → *Activer*, puis supprimer la métadonnée `boligo_recette`.

  L'adresse, les 4 événements, la version d'API `2024-06-20`, la description et le **secret de signature ne changent pas**. Il n'y a rien à modifier sur Render.
- **Impact pendant la coupure.** Les paiements de test de l'app en ligne restent crédités par la confirmation de l'app (`/payment/confirm`). Seul le filet de sécurité par webhook est suspendu.

Autres choix : `WEBHOOK_RENDER=desactive` (déjà coupé à la main) ou `accepte` (laissé actif, effets ci-dessus acceptés, y compris l'éventuelle ligne `StripeEvent` en production). `accepte` n'est pas recommandé.

### Configuration exacte à faire dans Claude Code

Menu de l'environnement dans la barre de titre de la session → *Edit*.

1. ***Network access* → *Allowed domains*** : ajouter
   - `*.stripe.com`, `*.stripe.network`, `*.stripecdn.com` (API, page Checkout et ses ressources, connexion du listener) ;
   - `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com` (téléchargement de Stripe CLI).

   Laisser cochée la case des gestionnaires de paquets.
2. **Variable d'environnement `STRIPE_TEST_SECRET_KEY`** : clé **`sk_test_…`** du compte « environnement de test BOLIGO » (Développeurs → Clés API, en mode test).
   - Une clé restreinte `rk_test_…` peut ne pas être acceptée par `stripe listen`. Si elle est utilisée, elle doit avoir :
     - en écriture : Checkout Sessions, Customers, Invoices, Invoice Items, Refunds ;
     - en lecture : PaymentIntents, Charges, Events, Webhook Endpoints, Account.
   - Le script le vérifie avant tout paiement.
   - Ne jamais coller la clé dans le chat ni dans le dépôt.
3. Ouvrir une **nouvelle session** pour que ces réglages soient pris en compte. Ensuite :
   - installer Stripe CLI (archive `stripe_<version>_linux_x86_64.tar.gz` de github.com/stripe/stripe-cli/releases, vérifiée avec `checksums.txt`) ;
   - lancer `verifier` ;
   - attendre l'autorisation d'exécution ;
   - lancer `executer` une seule fois.

## 2. Avant la fusion : sauvegarde et préparation

À faire par Steve (accès Supabase et Render) ; rien n'est fait automatiquement.

1. **Sauvegarde de la base Supabase de production**, au choix :
   - Supabase → *Database* → *Backups* : vérifier qu'une sauvegarde récente existe, ou en déclencher une si le plan le permet ;
   - ou, depuis un poste de confiance : `pg_dump "<URL directe Supabase>" -Fc -f boligo-AAAAMMJJ.dump`. Conserver le fichier hors du dépôt et vérifier sa taille, ou lancer `pg_restore -l` dessus.
2. **Noter les points de retour** : `Boligo-back` → `5853aa6` (`dep-db61jjou01pc73f5lfs0`), `boligo-web` → `5853aa6` (`dep-db61jjou01pc73f5lfp0`).
3. **Migrations : déjà présentes dans Supabase** (confirmé par Steve le 13/10/2026) : `HarmonyQuestion.questionTextEn` et `optionsEn`, `InterviewIA.questionnaireVersion`, la contrainte `InterviewIA_questionnaireVersion_check` (7.1 et 8.2) et le déclencheur `InterviewIA_questionnaireVersion_immutable`. **Ne rien réappliquer.** Aucune modification de la base Supabase n'est autorisée.
4. **Variables Render de `Boligo-back`.** Vérifier ou ajouter les valeurs suivantes, sans toucher aux clés Stripe, qui restent `sk_test_` et `pk_test_` :

   | Variable | Valeur |
   |---|---|
   | `NODE_ENV` | `production` |
   | `OTP_DEBUG` | `false` (ou absente) |
   | `VIDEO_TEST_UNLOCK` | `false` |
   | `INSIGHTS_RETRY_AFTER_MS` | **absente** (réservée à la recette) |
   | `SONDEUR_MODELS_FILE` | **absente** : le fichier livré `config/sondeur-models.json` a `generation.enabled: false`, donc le Sondeur reste déterministe (fail-closed) |
   | `INTERVIEW_VERSION` | à décider : absente = V7.1 pour les nouveaux membres ; `8.2` = nouvel entretien pour tous les nouveaux. Un entretien commencé garde sa version. Progressif possible avec `INTERVIEW_V82_PERCENT` |
   | `STRIPE_WEBHOOK_SECRET` | le `whsec_…` du point `we_1UP2h9…` (mode test) |

5. **Au moment du déploiement, après l'accord de Steve** : `Boligo-back` → *Settings* → *Health Check Path* = `/api/health`. Render ne bascule alors que si l'API répond.

## 3. Fusion et déploiement (sur autorisation expresse)

1. Passer la PR #42 de brouillon à prête, puis la fusionner dans `main`.
2. Render construit `Boligo-back` (`npm install; npm run build`, puis `node … dist/main.js`) et `boligo-web` (`expo export`). Suivre les deux déploiements jusqu'à l'état *live*.

## 4. Vérifications après déploiement

| Contrôle | Attendu |
|---|---|
| `GET https://boligo-back.onrender.com/api/health` | `{"status":"ok","db":"ok"}` |
| Journaux `Boligo-back` au démarrage | « Stripe connecté … mode test » ; aucune alerte d'incohérence de clés ; aucune erreur Prisma de colonne manquante |
| `https://boligo-web.onrender.com` | accueil, connexion, `/legal/cgu` |
| `https://boligo-admin.onrender.com` | connexion admin, Statistiques, Membres |
| Membre existant (connexion par Steve) | profil, entretien et parcours en cours visibles comme avant |
| Paiement | toujours en test (aucune carte réelle). Avec un compte fictif : carte 4242 → 1 crédit. Supprimer ensuite le compte fictif depuis l'admin |
| Sondeur | questions servies sans IA de rédaction (repli déterministe) ; aucun appel « sondeur_writer » dans les journaux |

## 5. Retour arrière

Déclencheurs : santé KO, erreurs 5xx répétées, paiement ou parcours cassé.

1. **Immédiat (sans code)** : Render → `Boligo-back` → *Deploys* → `dep-db61jjou01pc73f5lfs0` (`5853aa6`) → *Rollback*. Même chose pour `boligo-web` avec `dep-db61jjou01pc73f5lfp0`.
   - Attention : avec le déploiement automatique, le prochain commit sur `main` redéploie. Pour l'éviter, désactiver temporairement *Auto-Deploy*, ou faire l'étape 2.
2. **Code** : `git revert -m 1 <commit de fusion de la PR #42>` sur `main`, puis push. Render redéploie l'état précédent.
3. **Base de données** : ne rien supprimer. Les colonnes ajoutées sont nullables et ignorées par l'ancien code. Le déclencheur ne s'active que lors d'une modification d'une version déjà fixée. Restaurer la sauvegarde du §2.1 **uniquement** en cas de corruption de données, ce qui n'est pas attendu : ces migrations ne modifient aucune donnée.
4. **Sondeur IA seul** : il est déjà coupé par défaut. S'il a été activé, remettre `generation.enabled: false`, ou faire pointer `SONDEUR_MODELS_FILE` vers un chemin inexistant puis redémarrer.
5. Vérifier de nouveau le §4.

## 6. État constaté en production et conditions avant l'ouverture aux paiements

Ces constats viennent de lectures seules, faites le 13/10/2026 : journaux de démarrage du déploiement en ligne `5853aa6` (Render) et liste des projets Supabase. Aucune modification n'a été faite.

| Point | Constat | Action |
|---|---|---|
| Stripe | Connecté au compte « environnement de test BOLIGO », **mode test** ; secret du webhook présent (aucun avertissement) | Rester en test jusqu'à la décision de passage en réel (`docs/STRIPE_PASSAGE_EN_LIVE.md`) |
| **Mentions de facturation** | Avertissement au démarrage : **« Factures incomplètes, à renseigner : `BILLING_SELLER_NAME`, `BILLING_SELLER_LEGAL_FORM`, `BILLING_SELLER_ADDRESS`, `BILLING_SELLER_SIREN`, `BILLING_MEDIATOR`, `BILLING_SELLER_VAT_NUMBER` »** | **Bloquant avant tout utilisateur payant** : raison sociale, forme juridique, adresse, SIREN, médiateur de la consommation, n° de TVA (ou `BILLING_VAT_FRANCHISE=true` si franchise en base, à confirmer avec l'expert-comptable). Pour le réel, ajouter aussi `BILLING_ENABLED=true` et `BILLING_EARLY_START_CONSENT_REQUIRED=true`. L'avertissement disparaît du journal une fois tout renseigné |
| Notifications e-mail | « Mode d'envoi : resend » : envoi réel configuré | Vérifier que le domaine d'envoi (`EMAIL_FROM`) est vérifié dans Resend, puis faire un envoi test vers une adresse de l'équipe |
| Variables non visibles dans les journaux | `OTP_DEBUG`, `VIDEO_TEST_UNLOCK`, `INSIGHTS_RETRY_AFTER_MS`, `SONDEUR_MODELS_FILE`, `INTERVIEW_VERSION` | À vérifier par Steve dans Render → `Boligo-back` → *Environment* (§2.4) |
| Sauvegarde Supabase | Projet BOLIGO : « Lunis-hash's Project » (`hhnnsevawhhtzdffnomv`), partagé avec OWEKE (schémas `oweke`, `oweke_test` et table `public.documents`). Ne pas confondre avec `oweke-staging` | Voir §7 et §8 : `scripts/sauvegarde-boligo.ps1` (Windows) |
| Contrôle de santé Render | `healthCheckPath` vide | À régler sur `/api/health` au moment du déploiement, avec accord (§2.5) |
| Stripe Checkout | Devise convertie automatiquement selon la localisation (17,46 $US vu pendant la recette, encaissement en EUR) | Désactiver *Adaptive Pricing* dans Stripe avant le réel, si l'on veut afficher toujours 15 € |

**Ordre conseillé :**
1. sauvegarde Supabase vérifiée ;
2. variables Render vérifiées ;
3. déploiement contrôlé (§3 à §5), encore en Stripe **test**, sans utilisateurs payants ;
4. mentions de facturation renseignées et contrôlées (facture test) ;
5. e-mails transactionnels testés ;
6. seulement ensuite, ouverture aux paiements, puis passage en réel.

## 7. Prérequis au GO déploiement (13/10/2026)

Toutes les vérifications ont été faites en lecture seule. Aucune configuration de production n'a été modifiée.

### A. Bloquant pour le déploiement

| Prérequis | État | Preuve / action |
|---|---|---|
| Sauvegarde Supabase BOLIGO | ⏳ **À lancer par Steve** | Offre **gratuite** : pas de sauvegarde automatique récupérable. Script Windows prêt et testé : `scripts/sauvegarde-boligo.ps1` (voir §8) |
| Variables du backend Render | ⏳ **À vérifier par Steve** (le connecteur Render ne lit pas les variables) | `OTP_DEBUG` absente ou `false` ; `VIDEO_TEST_UNLOCK=false` ; `INSIGHTS_RETRY_AFTER_MS` absente ; `SONDEUR_MODELS_FILE` absente ; `NODE_ENV=production` ; `DATABASE_URL` / `DIRECT_URL` du projet BOLIGO ; `JWT_SECRET` défini |
| Stripe TEST | ✅ | Journal de démarrage en production : « Stripe connecté : compte « environnement de test BOLIGO », mode test », sans avertissement de clés ni de webhook ; webhook TEST actif et identique (relu chez Stripe) |
| Migrations Supabase | ✅ | Déjà présentes (confirmé par Steve) ; rien à réappliquer |
| Entretien V8.2 | ✅ prêt, non appliqué | Ajouter `INTERVIEW_VERSION=8.2` sur Render (*Save only*, sans redéploiement), juste avant la fusion. La version en ligne `5853aa6` ignore cette variable ; c'est la nouvelle qui la lira. Les entretiens déjà commencés gardent leur version : un entretien sans version est lu en 7.1, et un déclencheur en base rend la version immuable. Retour en arrière : retirer la variable |

### B. Non bloquant, au moment du déploiement

| Point | État | Action |
|---|---|---|
| `/api/health` | ✅ dans la PR #42 (réponse 200 et `db ok` vérifiée pendant la recette sur le build final). ⚠️ **Absent de la version en ligne** `5853aa6` | Activer *Health Check Path* = `/api/health` **après** la mise en ligne de la nouvelle version, après avoir vérifié qu'elle répond 200. L'activer avant ferait échouer le contrôle sur l'ancienne version. Réglage dans le tableau de bord Render (le connecteur ne le permet pas) |

### C. Bloquant pour l'ouverture des paiements réels (pas pour le déploiement)

| Point | État | Action |
|---|---|---|
| Mentions légales de facturation | ❌ | 6 variables manquantes : `BILLING_SELLER_NAME`, `_LEGAL_FORM`, `_ADDRESS`, `_SIREN`, `BILLING_MEDIATOR`, `BILLING_SELLER_VAT_NUMBER` (ou `BILLING_VAT_FRANCHISE=true`, à valider avec l'expert-comptable). Ensuite `BILLING_ENABLED=true` et `BILLING_EARLY_START_CONSENT_REQUIRED=true`, puis une facture test |
| E-mails transactionnels | ⚠️ partiel | Envoi via Resend actif en production ; domaine `boligo.fr` **vérifié**, envoi activé. Reste un envoi test réel (inscription ou facture) vers une adresse de l'équipe |
| Passage en réel Stripe | ⏳ | Clés et webhook live, désactiver *Adaptive Pricing* (`docs/STRIPE_PASSAGE_EN_LIVE.md`) |

## 8. Prérequis finaux (webapp uniquement)

BOLIGO est livré en **webapp** (export web Expo sur `boligo-web`). Les tests et travaux propres à Android, iOS et aux notifications push natives (Expo Push, builds EAS) ne font pas partie de cette livraison.

### 8.1 Sauvegarde des données BOLIGO (Supabase, depuis Windows)

**Périmètre**, relevé en lecture seule sur le catalogue du projet `hhnnsevawhhtzdffnomv` :

| Élément du projet | Appartient à | Dans la sauvegarde |
|---|---|---|
| `public` : 32 tables Prisma (`User` … `GeoRegion`), 25 types énumérés, fonction et déclencheur `boligo_interview_version_immutable` | **BOLIGO** | ✅ |
| `public.documents` (255 lignes), fonctions `app_doc_merge`, `app_lock_acquire`, `documents_set_collection` | OWEKE (absent du code BOLIGO) | ❌ table exclue. Les 3 fonctions n'ont pas de données et restent dans l'archive comme simple code |
| Schémas `oweke`, `oweke_test` | OWEKE | ❌ |
| Schémas Supabase `auth`, `storage`, `realtime`, `vault`… | Supabase (BOLIGO n'utilise ni Supabase Auth ni Storage) | ❌ |

Ce n'est **pas** une sauvegarde complète du projet Supabase : elle couvre uniquement les données BOLIGO.

**Prérequis Windows** :
- PostgreSQL 17 « Command Line Tools » (installateur EDB, composant *Command Line Tools* seul) ;
- Gpg4win.

**Lancement** (PowerShell, depuis le dossier du dépôt) :

```
powershell -ExecutionPolicy Bypass -File scripts\sauvegarde-boligo.ps1 -Hote <hôte du Session pooler>
```

L'hôte du Session pooler se trouve dans Supabase → *Connect* → *Session pooler*.

Ce que fait le script :
1. Il demande le mot de passe de la base (saisie masquée, jamais en argument), puis une phrase de passe gpg. Conserver la phrase de passe hors de l'ordinateur.
2. Il se connecte en lecture seule, imposée côté serveur (`default_transaction_read_only`).
3. Il vérifie que les 32 tables BOLIGO sont présentes et exclut toute autre table du schéma `public`.
4. Il exporte avec `pg_dump`, avec un chiffrement AES-256 **à la volée** par gpg : aucun fichier en clair n'est écrit.
5. Il vérifie l'archive en trois étapes :
   - empreinte SHA-256 ;
   - contenu : les 32 tables BOLIGO et aucune autre ;
   - relecture complète des données en mémoire, puis comparaison du nombre de lignes de chaque table avec la base.
6. Il refuse d'écrire dans un dépôt git ou dans un dossier OneDrive, Dropbox, Google Drive ou iCloud. Une archive non vérifiée est supprimée.
7. Il affiche un résumé : nom des tables et nombre de lignes, sans aucune donnée personnelle. C'est ce résumé qu'il faut transmettre pour confirmer le prérequis.

**Restauration** (en cas de besoin, dans une base **vide**) :

```
cmd /c "gpg -d <archive> | pg_restore --no-owner --dbname=<URL de la base cible>"
```

**Essais réalisés le 13/10/2026** (PowerShell 7.5 et PostgreSQL locaux, base simulant le projet partagé, données fictives) :
- export et vérification réussis ;
- restauration depuis l'archive chiffrée identique (32 tables, mêmes nombres de lignes, sans `documents` ni `oweke`) ;
- échec de gpg simulé : archive supprimée ;
- hôte étranger et dossier dans un dépôt git : refusés ;
- aucun fichier `.dump` en clair sur le disque.

Le script n'a pas pu être lancé sous Windows lui-même. L'enchaînement des commandes (`pg_dump | gpg`) passe par `cmd.exe`, qui transmet les données binaires sans les altérer.

### 8.2 Fiche de vérification des variables Render (`Boligo-back` → *Environment*)

Ne copier aucune valeur secrète. Pour les secrets, vérifier seulement leur **présence** et le **début** de la valeur.

| Variable | Attendu | Secret |
|---|---|---|
| `NODE_ENV` | `production` | non |
| `OTP_DEBUG` | absente, ou `false` | non |
| `VIDEO_TEST_UNLOCK` | `false`, ou absente | non |
| `INSIGHTS_RETRY_AFTER_MS` | **absente** | non |
| `SONDEUR_MODELS_FILE` | **absente** (fichier livré, rédaction IA désactivée) | non |
| `INTERVIEW_VERSION` | absente aujourd'hui ; `8.2` **au GO** (*Save only*, sans redéploiement, juste avant la fusion) | non |
| `INTERVIEW_V82_PERCENT` | absente | non |
| `STRIPE_SECRET_KEY` | présente, commence par `sk_test_` | **oui** |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | présente, commence par `pk_test_` | non (publique) |
| `STRIPE_WEBHOOK_SECRET` | présente, commence par `whsec_` | **oui** |
| `DATABASE_URL`, `DIRECT_URL` | présentes ; hôte contenant `hhnnsevawhhtzdffnomv` (jamais `qlfwuqmhghfaytnridvd`, OWEKE) | **oui** |
| `JWT_SECRET` | présente, longue et aléatoire | **oui** |
| `RESEND_API_KEY` | présente (journal : « Mode d'envoi : resend ») | **oui** |
| `EMAIL_FROM` | adresse en `@boligo.fr` (domaine vérifié chez Resend) | non |
| `WEB_APP_URL` | `https://boligo-web.onrender.com`, ou absente (valeur par défaut) | non |
| `OPENROUTER_API_KEY` / `GROQ_API_KEY` | présentes (lectures du jour, bilan, modération) | **oui** |

V8.2 : les entretiens déjà commencés gardent leur version (7.1 pour tous les entretiens existants, sans version enregistrée), grâce au code et au déclencheur d'immutabilité en base. Seuls les **nouveaux** entretiens passent en V8.2.

**Contrôle après la mise en ligne** (journal de démarrage, sans secret) :
- « Stripe connecté : … environnement de test BOLIGO … mode test » ;
- « Mode d'envoi : resend » ;
- aucune erreur Prisma ;
- `GET /api/health` → 200 et `db ok`.
