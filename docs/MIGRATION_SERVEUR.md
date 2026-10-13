# Migration de BOLIGO vers un autre serveur

> **Statut : préparation.** Rien n'a été exécuté sur la production (Render,
> Supabase, Stripe, DNS). Ce document décrit la bascule à faire le jour J ;
> chaque commande visant la production est à lancer par la personne
> responsable, après relecture.
>
> Fichiers livrés avec ce guide : `Dockerfile` (API), `docker-compose.yml`,
> `deploy/static-site.Dockerfile` + `deploy/nginx/*.conf` (web et admin),
> `.env.example` (inventaire complet des variables), `GET /api/health`.

## 1. Ce qui tourne aujourd'hui

| Service | Hébergement actuel | Construction / démarrage | Données |
|---|---|---|---|
| **API** `Boligo-back` | Render Web Service (runtime Node, offre gratuite, Virginie) — non déclaré dans `render.yaml` | Build `npm install; npm run build` (→ `prisma generate` + `nest build`) ; Start `node --max-old-space-size=512 dist/main.js` | aucune sur disque : tout est en base |
| **Application web** `boligo-web` | Render Static Site (`render.yaml`) | `npm ci && npx expo export --platform web && cp dist/index.html dist/404.html` dans `mobile-steve/`, publie `dist/`, réécriture `/* → /index.html` | — |
| **Admin** `boligo-admin` | Render Static Site (`render.yaml`) | `npm ci && npm run build` dans `admin/` (export Next.js), publie `out/`, en-têtes de sécurité (CSP `connect-src https://boligo-back.onrender.com`) | — |
| **Base** | Supabase « Lunis-hash's Project », **PostgreSQL 17**, eu-central-1, partagée avec des schémas OWEKE | — | schéma `public` (tables Prisma de BOLIGO) |
| **Tâches planifiées** | **dans le processus de l'API** (pas de cron externe) | `setInterval` : relance des factures en échec (`src/payment/invoice.service.ts`, si `BILLING_ENABLED`) ; moniteur anti-ghosting (`src/journey/ghosting.service.ts`, `GHOSTING_MONITOR`) | — |
| **Applications mobiles** (EAS) | magasins d'applications | `EXPO_PUBLIC_API_URL=https://boligo-back.onrender.com/api` figée dans `mobile-steve/eas.json` et en secours dans `mobile-steve/services/api.ts` | — |

Services tiers inchangés (seules leurs adresses de rappel comptent) : Stripe,
Daily.co, OpenRouter / Groq, fournisseur d'e-mails (Resend / Brevo / SMTP
Zoho), Companies House.

**Conséquences pour le nouveau serveur :**

- **Une seule instance de l'API** : les minuteries, le cache (`CacheModule`)
  et la limite de débit (`ThrottlerModule`) sont en mémoire. Deux instances
  doubleraient les passages du moniteur et fausseraient les quotas.
- **WebSocket** (Socket.IO, `src/chat/chat.gateway.ts`) : le reverse-proxy doit
  transmettre `Upgrade` / `Connection` et garder les connexions longues.
- **Derrière un seul reverse-proxy** : `main.ts` fait `app.set('trust proxy', 1)`.
  S'il y a deux relais (CDN + proxy), adapter cette valeur, sinon toutes les
  requêtes partagent la même IP pour la limite de débit.
- **Racine de l'API** : `GET /` répond `{service, status}` ; la sonde de santé
  est **`GET /api/health`** → `200 {"status":"ok","db":"ok","version":"…"}`,
  ou `503 {"status":"degraded","db":"down",…}` si la base ne répond pas
  (`SELECT 1`, délai 3 s, aucun détail d'erreur, sans authentification,
  `Cache-Control: no-store`).

## 2. Cible proposée

Un serveur (VM) avec Docker, et devant lui un reverse-proxy TLS (Caddy le plus
simple : certificats automatiques).

| Nom DNS proposé | Service compose | Port interne |
|---|---|---|
| `api.boligo.fr` | `api` | 3000 |
| `app.boligo.fr` (ou `boligo.fr`) | `web` | 8080 |
| `admin.boligo.fr` | `admin` (profil `admin`) | 8080 |
| — (jamais exposé) | `db` (Postgres, lié à 127.0.0.1) | 5432 |

Utiliser **des domaines à soi** plutôt que de nouvelles adresses d'hébergeur :
la prochaine migration ne demandera alors qu'un changement DNS.

Exemple de `Caddyfile` (à adapter) :

```
api.boligo.fr {
    reverse_proxy 127.0.0.1:3000   # WebSocket géré automatiquement
}
app.boligo.fr {
    reverse_proxy 127.0.0.1:8080
}
admin.boligo.fr {
    reverse_proxy 127.0.0.1:8081
}
```

### Construire et lancer

```bash
cp .env.example .env          # renseigner les secrets (jamais dans git)
docker compose build          # api + web ; ajouter --profile admin pour l'admin
docker compose --profile admin up -d
curl -fsS http://127.0.0.1:3000/api/health
```

- `PUBLIC_API_URL` (dans `.env`) est l'adresse de l'API **vue par le
  navigateur** (`https://api.boligo.fr/api`) : elle est figée dans les sites
  web et admin au moment du build. La changer = reconstruire `web` et `admin`.
- Dans `deploy/nginx/admin.conf`, remplacer `connect-src … https: http://localhost:3100`
  par l'adresse exacte de la nouvelle API (comme dans `render.yaml`).
- Le `package-lock.json` de l'API pointe en partie vers `registry.npmmirror.com` ;
  le Dockerfile réécrit ces adresses vers `registry.npmjs.org`
  (`--replace-registry-host`), les sommes de contrôle restent vérifiées.
- Image de l'API : `node:22-bookworm-slim`, utilisateur `node` (non-root),
  `node dist/main.js`, port `PORT`, sonde `HEALTHCHECK` sur `/api/health`,
  `init: true` dans compose pour la propagation de SIGTERM.

### Fichier de qualification du Sondeur

`src/ai/sondeur-router.ts` lit `SONDEUR_MODELS_FILE`, ou à défaut
`join(__dirname, '..', '..', 'config', 'sondeur-models.json')`. Compilé dans
`dist/ai/`, cela donne **`<racine>/config/sondeur-models.json`** :

- sur Render (runtime Node, build à la racine du dépôt) :
  `/opt/render/project/src/config/sondeur-models.json` — le fichier est
  versionné, il est donc présent dès que la branche qui l'ajoute est déployée
  (il n'est pas encore sur `origin/main`) ;
- dans l'image Docker : `/app/config/sondeur-models.json` (copié explicitement ;
  vérifié : `qualification()` renvoie bien la configuration) ;
- l'ancien `Dockerfile` ne copiait pas `config/` : le fichier y aurait manqué et
  le routeur serait resté en mode provisoire, sans message d'erreur.

## 3. Variables d'environnement

L'inventaire complet, commenté (obligatoire / optionnel, valeur d'exemple), est
dans **`.env.example`** : 73 variables lues par l'API (`process.env`,
`ConfigService`, `prisma/schema.prisma`), plus celles de Compose et des fronts.

Indispensables pour démarrer : `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`
(**reprendre la valeur actuelle** : sinon tous les membres sont déconnectés),
`NODE_ENV=production`.

À reprendre de Render **à l'identique** (copier depuis le tableau de bord, sans
les afficher ailleurs) : `JWT_SECRET`, `STRIPE_SECRET_KEY`,
`EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `DAILY_API_KEY`, `OPENROUTER_API_KEY`,
`GROQ_API_KEY`, clés d'e-mail (`RESEND_API_KEY` / `BREVO_API_KEY` / `SMTP_*`),
`EMAIL_FROM`, `GOOGLE_CLIENT_IDS`, `FACEBOOK_*`, `COMPANIES_HOUSE_API_KEY`,
budgets IA, `BILLING_*`, `SAFETY_ALERT_EMAILS`, `GHOSTING_MONITOR`,
`ADMIN_BOOTSTRAP_EMAIL`, `INTERVIEW_*`.

À **changer** pour le nouveau serveur :

| Variable | Nouvelle valeur |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | la nouvelle base (Compose les calcule pour le conteneur `db`) |
| `WEB_APP_URL`, `PUBLIC_WEB_URL`, `APP_URL` | `https://app.boligo.fr` (les défauts du code pointent vers `boligo-web.onrender.com`) |
| `ADMIN_ALLOWED_ORIGINS` | `https://admin.boligo.fr` (seuls `boligo-admin.onrender.com` et `localhost:3001` sont intégrés au code) |
| `STRIPE_WEBHOOK_SECRET` | le `whsec_…` du **nouveau** point de terminaison (§6) |
| `PUBLIC_API_URL` (Compose) | `https://api.boligo.fr/api` |
| `NEXT_PUBLIC_WEB_URL` (admin, au build) | `https://app.boligo.fr` |

À **ne pas** définir en production : `OTP_DEBUG`, `VIDEO_TEST_UNLOCK=true`,
`OPENROUTER_AUTH`, `NODE_USE_ENV_PROXY`, `OPENROUTER_BASE_URL`,
`INSIGHTS_RETRY_AFTER_MS`, `DB_TRANSFER_TARGET_URL`, toutes les `BENCH_*`,
`BLIND_*`, `TRIAL_MAX_EUR`, `SONDEUR_MODELS_FILE_TEST`.

### Nouvelles variables par rapport à `origin/main`

| Variable | Rôle | Sur Render / serveur ? |
|---|---|---|
| `INTERVIEW_VERSION` | `8.2` : nouveaux entretiens en V8.2 (défaut 7.1) | oui, quand la V8.2 est validée |
| `INTERVIEW_V82_PERCENT` | activation progressive 0–100 | facultatif |
| `SONDEUR_MAX_TOKENS` | plafond de jetons du Sondeur (défaut 4500) | facultatif |
| `SONDEUR_MODELS_FILE` | autre chemin du fichier de qualification | facultatif (inutile si `config/` est déployé) |
| `APP_VERSION` | version affichée par `/api/health` | facultatif |
| `OPENROUTER_AUTH` | `proxy` : authentification ajoutée par un proxy sortant | **non** (essais / banc) |
| `NODE_USE_ENV_PROXY` | variable Node : `fetch` passe par `HTTPS_PROXY` | **non** (essais / banc) |
| `INSIGHTS_RETRY_AFTER_MS` | raccourcit l'écart entre essais (recette) | **non** |
| `BENCH_*`, `BLIND_*`, `TRIAL_MAX_EUR`, `SONDEUR_MODELS_FILE_TEST` | banc d'essai des modèles (`scripts/`) | **non** |

## 4. Schéma de base : `db push`, pas de migrations

- Le dépôt **n'a pas de dossier `prisma/migrations`** : le schéma est appliqué
  par `prisma db push`. Il n'y a ni historique ni table `_prisma_migrations`.
- Les évolutions qui sortent du modèle Prisma sont des scripts SQL **additifs et
  rejouables** dans `prisma/sql/` (à appliquer dans l'ordre des dates) :
  `2026-10-07_facturation.sql`, `2026-10-10_partenaires_visibilite.sql`,
  `2026-10-11_regions_villes.sql`, `2026-10-12_sondeur_bilingue.sql`,
  `2026-10-12_version_entretien.sql`. Ils ajoutent des index, la sécurité au
  niveau des lignes (RLS) et un **déclencheur** (`boligo_interview_version_immutable`)
  que `db push` ne crée pas.
- `prisma/*.sql` (`create-admin.sql`, `reset-matches.sql`, `seed-test-data.sql`) :
  outils ponctuels, **à ne pas** jouer sur la production.

Conséquences :

1. **Migration de la production : restaurer un `pg_dump`**, ne pas recréer le
   schéma par `db push` (la sauvegarde contient déjà tables, index, RLS,
   déclencheur et données).
2. **Base neuve (préprod, essais)** : `docker compose --profile init run --rm db-init`
   (= `prisma db push`), puis jouer les scripts `prisma/sql/*.sql` dans l'ordre.
3. **Ne jamais lancer `prisma db push` sur une base restaurée** sans relire le
   plan : il peut proposer des suppressions (`--accept-data-loss`) — à refuser.
4. RLS activée **sans politique** sur plusieurs tables : l'utilisateur de
   l'application doit **être propriétaire** des tables (cas de `pg_restore
   --no-owner` exécuté avec ce même utilisateur) ou avoir `BYPASSRLS`, sinon
   ces tables paraissent vides.

## 5. Sauvegarde et restauration

### 5.1 Côté source (Supabase) — lecture seule

- Utiliser la **connexion directe** ou le pooler en **mode session** (port 5432),
  pas le pooler en mode transaction (6543) : `pg_dump` en a besoin.
- Prendre un `pg_dump` de **même version majeure que le serveur ou plus
  récente** : la base est en PostgreSQL 17 → `pg_dump` 17.
- La base est partagée avec OWEKE : ne sauvegarder que `public`.

```bash
# Session forcée en lecture seule : aucune écriture possible par erreur.
export PGOPTIONS='-c default_transaction_read_only=on'
SRC='postgresql://…'       # saisi à la main, jamais dans un fichier versionné

pg_dump "$SRC" --schema=public --no-owner --no-privileges \
        --format=custom --file=boligo-$(date +%F-%H%M).dump

# Inventaire pour les contrôles (lecture seule également)
psql "$SRC" -At -c "SELECT relname, n_live_tup FROM pg_stat_user_tables
                    WHERE schemaname='public' ORDER BY 1" > source-tables.txt
```

`pg_dump` ne prend que des verrous de lecture ; la production continue de
servir pendant la sauvegarde. Les objets OWEKE éventuellement présents dans
`public` (ex. fonctions `app_doc_merge`, `app_lock_acquire`) peuvent être
écartés à la restauration (§5.2).

Conserver le fichier de sauvegarde chiffré, hors du serveur, avec une durée de
rétention définie (données personnelles et sensibles : voir `docs/AIPD_SONDEUR.md`).

### 5.2 Côté cible

Recommandé : Postgres **17** (`POSTGRES_IMAGE=postgres:17`), même version
majeure que la source. Avec `postgres:16`, la restauration d'un dump 17 signale
au moins `transaction_timeout` inconnu (sans effet) ; relire toutes les erreurs.

```bash
docker compose up -d db
# Filtrer ce qui n'est pas à BOLIGO (fonctions OWEKE, objets Supabase) :
pg_restore --list boligo-AAAA.dump > liste.txt
#   → commenter (préfixe « ; ») les lignes à écarter dans liste.txt
pg_restore --dbname="postgresql://boligo:…@127.0.0.1:5432/boligo" \
           --no-owner --no-privileges --use-list=liste.txt \
           --single-transaction --exit-on-error boligo-AAAA.dump
```

### 5.3 Vérifications après restauration

1. Nombre de lignes par table identique à `source-tables.txt`
   (`SELECT count(*)` table par table pour les tables Prisma ; `n_live_tup`
   n'est qu'une estimation).
2. `npx prisma db pull --print` (ou `prisma migrate diff`) contre la cible : pas
   d'écart avec `prisma/schema.prisma`.
3. Présence du déclencheur `InterviewIA_questionnaireVersion_immutable` et des
   colonnes ajoutées par `prisma/sql/*.sql`.
4. Aucune séquence à recaler : le schéma n'utilise pas `autoincrement()`
   (identifiants générés par l'application).
5. `curl https://api…/api/health` → `"db":"ok"`, puis connexion d'un compte de
   test, lecture d'un parcours, d'un fil de discussion, d'une facture.

## 6. Stripe

- Point de terminaison actuel : `POST https://boligo-back.onrender.com/api/payment/webhook`.
- Événements traités : `payment_intent.succeeded` (indispensable),
  `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
  (registre de facturation). Les doublons sont ignorés (table `StripeEvent`).
- Bascule : **ajouter** dans Stripe un second point de terminaison
  `https://api.boligo.fr/api/payment/webhook` avec les mêmes événements, mettre
  son `whsec_…` dans `STRIPE_WEBHOOK_SECRET` du nouveau serveur, puis
  **désactiver** l'ancien après la bascule (ne pas le supprimer avant la fin de
  la période de retour arrière). Faire la même chose en mode test et en mode réel.
- La signature est obligatoire en production : un mauvais secret = webhooks
  refusés (les paiements restent crédités par `POST /payment/confirm` depuis l'app).
- Retour de paiement : `WEB_APP_URL` doit désigner le nouveau site web.

## 7. DNS, CORS et adresses figées

- **Applications mobiles** : l'adresse `https://boligo-back.onrender.com/api`
  est figée dans les versions publiées (`eas.json`, `services/api.ts`). Tant que
  des membres utilisent ces versions, **garder l'API Render joignable** :
  - soit transformer l'ancien service Render en simple relais vers
    `https://api.boligo.fr` (aucune base, aucune minuterie) ;
  - soit le laisser tourner sur la **nouvelle** base pendant la transition, avec
    `GHOSTING_MONITOR=off` chez lui pour que le moniteur ne passe qu'une fois
    (la relance des factures, active si `BILLING_ENABLED=true`, tournerait
    aussi en double : le relais est donc préférable) ;
  - soit publier d'abord une version de l'app pointant vers `api.boligo.fr`
    (EAS + mise à jour) et attendre son adoption.
- **CORS** : l'application et le site sont ouverts à toutes les origines ; les
  routes `/api/admin` n'acceptent que `DEFAULT_ADMIN_ORIGINS`
  (`boligo-admin.onrender.com`, `localhost:3001`) + `ADMIN_ALLOWED_ORIGINS`.
  → `ADMIN_ALLOWED_ORIGINS=https://admin.boligo.fr`.
- **CSP de l'admin** : `connect-src` doit contenir l'adresse de la nouvelle API
  (`deploy/nginx/admin.conf`, et `render.yaml` si l'admin reste sur Render).
- **Sites statiques** : reconstruire `web` et `admin` avec la nouvelle
  `PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` / `NEXT_PUBLIC_API_URL`.
- **DNS** : baisser le TTL des enregistrements concernés à 300 s **au moins
  48 h avant** la bascule ; e-mail (SPF/DKIM/DMARC du fournisseur d'envoi)
  inchangé tant que le fournisseur ne change pas.
- **Daily.co, OpenRouter, Groq** : pas d'adresse de rappel ; rien à changer.
- Liens partenaires déjà diffusés (`https://boligo-web.onrender.com/?p=…`) :
  garder une redirection de l'ancien site vers le nouveau.

## 8. Ordre de bascule

**J-7 à J-2 — préparation (sans impact)**

1. Serveur prêt, Docker, reverse-proxy TLS, pare-feu (80/443 seulement).
2. `.env` complet sur le serveur ; images construites ; `GET /api/health` vert
   sur une base **de préproduction** restaurée depuis un dump d'essai.
3. Répétition complète (§5) sur une copie, avec mesure de la durée.
4. TTL DNS abaissés ; second point de terminaison Stripe créé (désactivé ou
   ignoré tant que le DNS ne pointe pas) ; nouvelle version de l'app prête si
   l'option « publier d'abord » est retenue.

**Jour J — fenêtre de maintenance annoncée**

5. Geler les écritures sur l'ancienne production : passer l'API Render en
   maintenance (ou la suspendre) — sinon les données écrites après le dump
   seront perdues.
6. `pg_dump` (§5.1) → `pg_restore` (§5.2) → contrôles (§5.3).
7. `docker compose --profile admin up -d` ; `GET /api/health` → `200`.
8. DNS `api.` / `app.` / `admin.` vers le nouveau serveur.
9. Stripe : activer le nouveau point de terminaison, désactiver l'ancien.
10. Si l'ancienne adresse Render doit rester servie : redéployer `Boligo-back`
    avec `DATABASE_URL`/`DIRECT_URL` vers la **nouvelle** base (une seule
    instance active des minuteries), ou en relais vers la nouvelle API.
11. Contrôles (§10), puis lever la maintenance.

## 9. Retour arrière

Prévu tant que l'ancienne base Supabase n'a pas été modifiée **après** le gel :

1. Remettre les enregistrements DNS précédents (TTL bas → effet en minutes).
2. Stripe : réactiver l'ancien point de terminaison, désactiver le nouveau.
3. Relancer l'API Render sur la base Supabase d'origine.
4. Si des écritures ont eu lieu sur la nouvelle base entre-temps (inscriptions,
   paiements) : les exporter de la nouvelle base et les rejouer à la main dans
   l'ancienne ; les paiements se rapprochent depuis le tableau de bord Stripe
   (`payment_intent`) — c'est pourquoi la décision de retour arrière doit être
   prise vite (dans l'heure).
5. Garder la sauvegarde du Jour J et l'ancienne base intactes au moins 30 jours.

## 10. Check-list après bascule

- [ ] `GET https://api…/api/health` → `200`, `"db":"ok"`, version attendue.
- [ ] `GET https://api…/` → `{"service":"BOLIGO API","status":"ok"}`.
- [ ] Journaux de démarrage : pas de `JWT_SECRET absent`, mode e-mail attendu
      (`[EMAIL] Mode d'envoi : …`), pas de `STRIPE_WEBHOOK_SECRET absent`,
      `Moniteur anti-ghosting : <mode attendu>`.
- [ ] Connexion d'un membre existant **sans** reconnexion forcée (même `JWT_SECRET`).
- [ ] Inscription + réception du code par e-mail.
- [ ] Chat en temps réel (WebSocket) entre deux comptes de test.
- [ ] Paiement de test (carte `4242…`) : crédit ajouté une fois ; webhook reçu
      en `200` dans Stripe.
- [ ] Appel vidéo Daily de test.
- [ ] Sondeur : une question générée (IA) ; le fichier `config/sondeur-models.json`
      est lu (routeur qualifié).
- [ ] Tableau de bord admin : connexion, listes, pas d'erreur CORS / CSP.
- [ ] Site web : routes profondes (`/…`) servies (réécriture vers `index.html`).
- [ ] Ancienne adresse `boligo-back.onrender.com` : comportement prévu
      (relais, maintenance ou même base) ; anciennes apps mobiles fonctionnelles.
- [ ] Sauvegardes automatiques de la nouvelle base planifiées (`pg_dump`
      quotidien chiffré hors serveur) et **une restauration testée**.
- [ ] Supervision : sonde externe sur `/api/health` toutes les minutes.
- [ ] Mises à jour : documentation interne (`docs/RECETTE_STEVE.md`,
      `mobile-steve/docs/DEPLOIEMENT.md`, `render.yaml`, `eas.json`) alignée.
