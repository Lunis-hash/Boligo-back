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
