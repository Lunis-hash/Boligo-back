# Prévisualisation de recette sur Render (offre gratuite)

Un **seul service** web Render (runtime Docker) déploie la branche
`claude/recette-ge-v82-ergonomie` et sert, sur la même adresse et derrière un
mot de passe HTTP :

| Chemin | Contenu |
|---|---|
| `/` | Webapp BOLIGO (inscription, Grand Entretien, Découverte, Sondeur…) |
| `/espace-partenaire` | Espace partenaire (lien privé `…/espace-partenaire#<lien>`) |
| `/admin` | Administration (Next, `basePath=/admin`) |
| `/api` | API NestJS (`/api/health` ouvert sans mot de passe pour Render) |

Image : `Dockerfile.preview` (multi-étapes : API + seeds compilés, export web
Expo, export admin, puis image d'exécution `node:22-bookworm-slim`). Démarrage :
`node deploy/preview-start.js`.

## Garde-fous (refus explicite au démarrage)

- `RECETTE_PREVIEW=1` obligatoire (déjà posé dans l'image).
- Base **Supabase refusée** (`supabase.co`, `pooler.supabase`) : la production n'est jamais touchée.
- Clés Stripe **LIVE refusées** (`sk_live_`, `rk_live_`, `pk_live_`), y compris au build de la webapp.
- `RECETTE_BASIC_AUTH` obligatoire (`utilisateur:motdepasse`, 8 caractères au moins) ; tout le site est protégé sauf `/api/health` et `/api/payment/webhook` (signé par Stripe). En-tête `X-Robots-Tag: noindex` partout.
- **E-mails** : aucun envoi vers une vraie adresse. Seuls `@recette.boligo.test` et `@boligo-demo.example` peuvent partir (et seulement si un fournisseur est configuré) ; tout le reste est écrit dans le journal.
- **Code de vérification 1234** accepté uniquement dans ce mode (inscription sans e-mail). Les e-mails retenus sont écrits **en clair** dans le journal Render (code de réinitialisation du mot de passe compris).
- **IA SIMULÉE par défaut** (`RECETTE_FAUX_IA`, absent = activé) : un faux OpenRouter local et déterministe tourne dans le conteneur (modération « aucun danger », lectures du Sondeur). Sans IA, la règle fail-closed cache chaque réponse du Sondeur jusqu'à une décision de l'équipe (page Signalements de l'admin : « rejeter ») et retient la messagerie : le parcours ne peut pas aller jusqu'au chat. Une vraie clé OpenRouter n'est jamais utilisée en prévisualisation. `RECETTE_FAUX_IA=0` pour tester le repli sans IA.
- Seeds fictifs : refusés sur Supabase, même en prévisualisation.

## Démarrage (automatique)

1. `prisma db push` (jamais destructif : échoue plutôt que de supprimer des données) ;
2. `prisma/sql/*.sql` dans l'ordre des noms (idempotents, dont les migrations partenaires 2026-10-14 et 2026-10-15) ;
3. `seed:recette` puis `seed:recette:partenaires` — **une seule fois** : relancés seulement si les comptes fictifs sont absents, ou si `RECETTE_RESEED=1` (remet les comptes fictifs dans leur état initial ; les comptes créés à la main restent) ;
4. API (qui sert aussi `/` et `/admin`).

L'offre gratuite met le service en veille après 15 minutes sans visite : le
premier chargement suivant prend environ une minute. Les données sont
conservées (base Postgres Render) ; la base gratuite expire au bout de 30 jours.

## Création sur Render (Steve)

1. **New → Postgres**, offre **Free**, région Frankfurt (ou la même que le service). Copier l'**Internal Database URL**.
2. **New → Web Service** → dépôt `Lunis-hash/Boligo-back`, branche `claude/recette-ge-v82-ergonomie` :
   - Runtime : **Docker** ; Dockerfile Path : `./Dockerfile.preview` ; Docker Context : `.` ;
   - Instance type : **Free** ; Health Check Path : `/api/health` ;
   - Docker Command : laisser vide (l'image lance `node deploy/preview-start.js`) ;
   - Auto-Deploy : oui (chaque push sur la branche redéploie).
3. Variables d'environnement (voir ci-dessous), puis **Create Web Service**.

### Variables à poser

| Variable | Valeur | Secret ? |
|---|---|---|
| `RECETTE_PREVIEW` | `1` | non |
| `DATABASE_URL` | Internal Database URL de la base Render ci-dessus | **oui** |
| `DIRECT_URL` | la même valeur | **oui** |
| `RECETTE_BASIC_AUTH` | `steve:<mot de passe de votre choix, 8 caractères au moins>` | **oui** |
| `JWT_SECRET` | bouton « Generate » de Render (valeur aléatoire) | **oui** |
| `PUBLIC_WEB_URL` | `https://<nom-du-service>.onrender.com` | non |
| `WEB_APP_URL` | `https://<nom-du-service>.onrender.com` | non |
| `ADMIN_ALLOWED_ORIGINS` | `https://<nom-du-service>.onrender.com` | non |
| `ADMIN_URL` | `https://<nom-du-service>.onrender.com/admin` | non |

Facultatif (paiement en mode **TEST** seulement) :

| Variable | Valeur |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` du compte de test BOLIGO (secret) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_…` (lue au build de la webapp) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` d'un endpoint de **test** pointant vers `https://<service>.onrender.com/api/payment/webhook` (sinon le crédit est confirmé au retour de Stripe Checkout, sans webhook) |

À **ne pas** poser : `RESEND_API_KEY`, `SMTP_*`, `BREVO_API_KEY`,
`SENDGRID_API_KEY`, `OPENROUTER_*`, `GROQ_API_KEY`, `DAILY_API_KEY`,
`GOOGLE_CLIENT_IDS`, `FACEBOOK_*`, `OTP_DEBUG`, `DB_TRANSFER_TARGET_URL`.
Sans eux : e-mails dans le journal, Sondeur par la banque locale (repli
fail-closed), vidéo en mode dégradé, connexion Google désactivée.

Déjà posées par l'image : `NODE_ENV=production`, `INTERVIEW_VERSION=8.2`,
`HARMONY_QUESTIONS_SOURCE=bank`, `PORT=10000`.

## Accès

Le navigateur demande d'abord l'utilisateur et le mot de passe HTTP
(`RECETTE_BASIC_AUTH`). Ensuite, les comptes fictifs sont ceux de
`docs/RECETTE_LOCALE.md` (section 4). Les liens des espaces partenaires y
sont les mêmes, avec `https://<service>.onrender.com` à la place de
`http://localhost:8080` (ils sont aussi imprimés dans le journal de démarrage).

## Construire et essayer l'image en local

```bash
docker build -f Dockerfile.preview -t boligo-preview .
docker run --rm -p 10000:10000 \
  -e DATABASE_URL=postgresql://…@host.docker.internal:5432/boligo_preview \
  -e DIRECT_URL=postgresql://…@host.docker.internal:5432/boligo_preview \
  -e RECETTE_BASIC_AUTH=steve:un-mot-de-passe \
  -e JWT_SECRET=local-$(date +%s) \
  -e PUBLIC_WEB_URL=http://localhost:10000 \
  boligo-preview
# http://localhost:10000 , /admin , /api/health
```
