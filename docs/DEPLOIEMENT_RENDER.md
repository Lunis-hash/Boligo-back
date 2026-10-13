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

### Script prêt

`mobile-steve/e2e/recette-stripe-test.sh` lance `recette-stripe-test.js`. Il tourne sur le build final, sur une base PostgreSQL locale, avec des comptes fictifs. Il vérifie contre Stripe :

1. la session Checkout créée par l'API ;
2. le paiement sur la vraie page Checkout (carte 4242) ;
3. la livraison réelle du webhook `payment_intent.succeeded` par `stripe listen`, qui donne 1 crédit ;
4. le crédit unique, malgré la confirmation de l'app et un renvoi de l'événement par Stripe ;
5. la facture Stripe ;
6. la rétractation, puis le remboursement Stripe et le webhook réel `charge.refunded` (crédit retiré).

Le script refuse toute clé autre que `sk_test_` ou `rk_test_` et n'affiche aucune clé.

### Ce que Steve doit autoriser

Ces autorisations n'existent pas dans l'environnement actuel ; c'est ce qui bloque la vérification.

1. **Accès réseau** de l'environnement cloud.
   - Où : menu de l'environnement dans la barre de titre de la session → *Edit* → *Network access* → *Allowed domains*.
   - Domaines à ajouter :
     - `api.stripe.com`, `files.stripe.com`, `checkout.stripe.com`, `js.stripe.com`, `m.stripe.network`, `*.stripe.com`, `*.stripe.network` ;
     - pour télécharger Stripe CLI : `github.com` et `objects.githubusercontent.com`.
   - Aujourd'hui, `api.stripe.com` est refusé (403 du proxy).
2. **Clé de test**, en variable d'environnement de l'environnement cloud (même menu → *Edit*). Jamais dans le chat ni dans le dépôt.
   - Nom : `STRIPE_TEST_SECRET_KEY`.
   - Valeur : de préférence une clé restreinte `rk_test_…` du compte « environnement de test BOLIGO ».
   - Droits en écriture : Checkout Sessions, PaymentIntents, Customers, Invoices, Invoice Items, Refunds.
   - Droits en lecture : Charges, Events, Webhook Endpoints, Account.
   - Une clé `sk_test_…` convient aussi.
   - Une nouvelle session prend en compte la variable.
3. **Webhook de test vers Render pendant la recette** (décision de Steve).
   - Les événements de la recette seront aussi envoyés à `boligo-back.onrender.com`. Les comptes fictifs n'y existent pas : l'API ne crédite personne et Stripe réessaie.
   - Pour une isolation totale, désactiver temporairement le point `we_1UP2h9Lz8rnS1CBnjkMldEOm`. Il se trouve dans le tableau de bord Stripe test → Développeurs → Webhooks. Le réactiver après la recette.

### Lancement, une fois les autorisations en place

```
STRIPE_BIN=<chemin de stripe CLI> bash mobile-steve/e2e/recette-stripe-test.sh
```

Les résultats sont écrits dans `docs/recette-stripe-test/` : captures, `resultats.json` et journal masqué.

## 2. Avant la fusion : sauvegarde et préparation

À faire par Steve (accès Supabase et Render) ; rien n'est fait automatiquement.

1. **Sauvegarde de la base Supabase de production**, au choix :
   - Supabase → *Database* → *Backups* : vérifier qu'une sauvegarde récente existe, ou en déclencher une si le plan le permet ;
   - ou, depuis un poste de confiance : `pg_dump "<URL directe Supabase>" -Fc -f boligo-AAAAMMJJ.dump`. Conserver le fichier hors du dépôt et vérifier sa taille, ou lancer `pg_restore -l` dessus.
2. **Noter les points de retour** : `Boligo-back` → `5853aa6` (`dep-db61jjou01pc73f5lfs0`), `boligo-web` → `5853aa6` (`dep-db61jjou01pc73f5lfp0`).
3. **Appliquer les migrations additives** (SQL Editor de Supabase, base BOLIGO). Elles sont rejouables sans effet. **À faire avant la fusion**, car le nouveau code lit ces colonnes.
   - `prisma/sql/2026-10-12_sondeur_bilingue.sql` : `HarmonyQuestion.questionTextEn`, `optionsEn`.
   - `prisma/sql/2026-10-12_version_entretien.sql` : `InterviewIA.questionnaireVersion`, sa contrainte et son déclencheur d'immutabilité.

   Contrôle :

   ```sql
   SELECT table_name, column_name
   FROM information_schema.columns
   WHERE column_name IN ('questionTextEn','optionsEn','questionnaireVersion');
   ```

   Résultat attendu : 3 lignes.
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

5. **Recommandé** : `Boligo-back` → *Settings* → *Health Check Path* = `/api/health`. Render ne bascule alors que si l'API répond.

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
