#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# BOLIGO — RECETTE LOCALE en une commande (Mac / Linux). Voir docs/RECETTE_LOCALE.md.
#
#   ./recette.sh                  démarre tout avec Docker (base, API, web, admin)
#   ./recette.sh --faux-ia        idem + faux OpenRouter local (aucun appel réel)
#   ./recette.sh --sans-docker    Postgres local existant + Node (npm) sur cette machine
#   ./recette.sh --arreter        arrête la recette (les données sont gardées)
#   ./recette.sh --reinitialiser  supprime la base de recette puis relance tout
#   ./recette.sh --sans-build     (Docker) réutilise les images déjà construites
#
# Garanties : base LOCALE uniquement, secrets FACTICES (.env.recette), aucun
# e-mail réel, aucune IA réelle, Stripe en mode TEST seulement (clé sk_test_)
# ou paiement indisponible / code promo gratuit ; toute clé « live » est refusée.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT"

ENV_FILE=.env.recette
PROJECT=boligo-recette
STATE_DIR=.recette          # mode sans Docker : journaux et PID
MODE=docker ACTION=demarrer BUILD=--build FAUX_IA=0

for arg in "$@"; do
  case "$arg" in
    --sans-docker) MODE=local ;;
    --faux-ia) FAUX_IA=1 ;;
    --arreter|--stop) ACTION=arreter ;;
    --reinitialiser|--reset) ACTION=reinitialiser ;;
    --sans-build) BUILD= ;;
    -h|--aide|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Option inconnue : $arg (voir ./recette.sh --aide)" >&2; exit 2 ;;
  esac
done

die() { echo "❌ $*" >&2; exit 2; }
info() { echo "▶ $*"; }

rand() { # 48 caractères hexadécimaux aléatoires
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24
  else head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

# ─── .env.recette (secrets factices) ────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  info "Création de $ENV_FILE (secrets factices, jamais versionné)"
  umask 077
  cat > "$ENV_FILE" <<EOF
# BOLIGO — environnement de RECETTE LOCALE, généré par recette.sh le $(date '+%Y-%m-%d %H:%M').
# Secrets FACTICES. Ne jamais y mettre de clé de production (sk_live_… refusée).
# Supprimer ce fichier pour en générer un nouveau.

# ── Docker Compose ──
POSTGRES_USER=boligo
POSTGRES_PASSWORD=$(rand)
POSTGRES_DB=boligo_recette
POSTGRES_IMAGE=postgres:16
DB_PORT=55432
API_PORT=3000
WEB_PORT=8080
ADMIN_PORT=8081
PUBLIC_API_URL=http://localhost:3000/api
PUBLIC_WEB_URL=http://localhost:8080
APP_VERSION=recette

# ── Mode --sans-docker : base Postgres LOCALE existante (localhost uniquement) ──
SANS_DOCKER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boligo_recette?schema=public

# ── API ──
PORT=3000
JWT_SECRET=recette-factice-$(rand)
JWT_EXPIRES_IN=7d
# Code de vérification 1234 accepté et renvoyé (inscriptions de test sans e-mail).
OTP_DEBUG=true
WEB_APP_URL=http://localhost:8080
PUBLIC_WEB_URL=http://localhost:8080
APP_URL=http://localhost:8080
ADMIN_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3001
INTERVIEW_VERSION=8.2
HARMONY_QUESTIONS_SOURCE=bank
GHOSTING_MONITOR=observe
VIDEO_TEST_UNLOCK=false
BILLING_ENABLED=false
EMAIL_FROM="BOLIGO Recette <no-reply@recette.boligo.test>"

# ── Stripe : vide = paiement par carte indisponible (utiliser le code RECETTE100).
# Mode TEST seulement : sk_test_… / pk_test_… du compte de TEST BOLIGO.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EOF
fi

# Lecture d'une variable de .env.recette (sans exécuter le fichier).
envval() {
  local line
  line=$(grep -E "^$1=" "$ENV_FILE" | tail -1 || true)
  line=${line#*=}; line=${line%\"}; line=${line#\"}
  printf '%s' "$line"
}

# ─── Garde-fous Stripe et base ──────────────────────────────────────────────
if grep -Ev '^[[:space:]]*#' "$ENV_FILE" | grep -Eq '(sk|rk|pk)_live_'; then
  die "$ENV_FILE contient une clé Stripe LIVE (sk_live_/rk_live_/pk_live_) : refusé. La recette n'accepte que le mode TEST."
fi
SK=$(envval STRIPE_SECRET_KEY)
PK=$(envval EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
if [ -n "$SK" ] && [[ "$SK" != sk_test_* ]]; then die "STRIPE_SECRET_KEY doit commencer par sk_test_ (ou rester vide)."; fi
if [ -n "$PK" ] && [[ "$PK" != pk_test_* ]]; then die "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY doit commencer par pk_test_ (ou rester vide)."; fi
if [ -n "$SK" ]; then PAIEMENT="Stripe mode TEST (carte 4242 4242 4242 4242)"; else PAIEMENT="carte indisponible (aucune clé) : code promo RECETTE100 = parcours offert"; fi

R_API=$(envval API_PORT); R_WEB=$(envval WEB_PORT); R_ADMIN=$(envval ADMIN_PORT)
R_API=${R_API:-3000}; R_WEB=${R_WEB:-8080}; R_ADMIN=${R_ADMIN:-8081}

afficher_acces() {
  local admin_url=$1
  cat <<EOF

════════════════════════════════════════════════════════════════════
 ✅ RECETTE BOLIGO prête (données FICTIVES, base locale)
────────────────────────────────────────────────────────────────────
 Application web     http://localhost:${R_WEB}
 Espace partenaire   http://localhost:${R_WEB}/espace-partenaire  (EN : /partner-space)
 API                 http://localhost:${R_API}/api   (santé : /api/health, doc : /docs)
 Admin               ${admin_url}
────────────────────────────────────────────────────────────────────
 Mot de passe de tous les membres : Recette2026!
   adam.termine@recette.boligo.test    Grand Entretien V8.2 terminé, a invité Bella
   bella.termine@recette.boligo.test   Grand Entretien V8.2 terminé, invitation à accepter
   cyril.sondeur@recette.boligo.test   Parcours en cours : Sondeur (attend Diane)
   diane.sondeur@recette.boligo.test   Parcours en cours : Sondeur (à elle de répondre)
   emma.entretien@recette.boligo.test  Grand Entretien V8.2 en cours (modules 0-3, 4 à moitié)
   felix.nouveau@recette.boligo.test   Nouveau membre, rien de commencé, 0 crédit
 Admin : admin@recette.boligo.test / RecetteAdmin2026!
 Codes promo : RECETTE100 (offert), RECETTE50 (-50 %)
 Paiement : ${PAIEMENT}
 Inscription d'un nouveau compte : code de vérification 1234 (aucun e-mail envoyé)
────────────────────────────────────────────────────────────────────
 Arrêter : ./recette.sh --arreter    Repartir de zéro : ./recette.sh --reinitialiser
════════════════════════════════════════════════════════════════════
EOF
}

attendre_api() {
  info "Attente de l'API (http://localhost:${R_API}/api/health)…"
  for _ in $(seq 1 120); do
    if curl -fsS "http://localhost:${R_API}/api/health" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

# ═════════════════════════════════════════════════════════════════════════════
# Mode Docker
# ═════════════════════════════════════════════════════════════════════════════
if [ "$MODE" = docker ]; then
  command -v docker >/dev/null 2>&1 || die "Docker est introuvable : installez Docker Desktop (docs/RECETTE_LOCALE.md), ou utilisez --sans-docker."
  docker compose version >/dev/null 2>&1 || die "« docker compose » est introuvable : mettez Docker Desktop à jour."
  docker info >/dev/null 2>&1 || die "Docker ne répond pas : démarrez Docker Desktop puis relancez."
  CV=$(docker compose version --short 2>/dev/null | sed 's/^v//')
  CV_MAJ=${CV%%.*}; CV_MIN=${CV#*.}; CV_MIN=${CV_MIN%%.*}
  if [ "${CV_MAJ:-0}" -lt 2 ] || { [ "$CV_MAJ" -eq 2 ] && [ "${CV_MIN:-0}" -lt 24 ]; }; then
    die "Docker Compose $CV trop ancien (2.24 minimum) : mettez Docker Desktop à jour."
  fi

  # Les variables du shell priment sur --env-file : on les retire pour que
  # seule .env.recette décide (jamais une base ou un fichier de production).
  unset API_DATABASE_URL API_DIRECT_URL API_ENV_FILE DATABASE_URL DIRECT_URL \
        POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_IMAGE DB_PORT \
        API_PORT WEB_PORT ADMIN_PORT PUBLIC_API_URL PUBLIC_WEB_URL APP_VERSION \
        EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY \
        RECETTE_OPENROUTER_API_KEY RECETTE_OPENROUTER_BASE_URL RECETTE_HARMONY_QUESTIONS_SOURCE

  PROFILES=(--profile admin)
  if [ "$FAUX_IA" = 1 ]; then
    PROFILES+=(--profile faux-ia)
    export RECETTE_OPENROUTER_API_KEY=stub-local
    export RECETTE_OPENROUTER_BASE_URL=http://faux-openrouter:8799/api/v1
    export RECETTE_HARMONY_QUESTIONS_SOURCE=ai
  fi
  dc() { docker compose -p "$PROJECT" --env-file "$ENV_FILE" -f docker-compose.yml -f docker-compose.recette.yml "${PROFILES[@]}" "$@"; }

  case "$ACTION" in
    arreter)
      info "Arrêt de la recette (données gardées)"
      dc --profile faux-ia down
      exit 0 ;;
    reinitialiser)
      info "Suppression des conteneurs et de la base de recette (volume ${PROJECT}_recette_pgdata)"
      dc --profile faux-ia down -v --remove-orphans ;;
  esac

  info "Démarrage : base, création du schéma + membres fictifs, API, web, admin"
  [ -n "$BUILD" ] && info "Construction des images (premier lancement : 5 à 15 minutes)…"
  if ! dc up -d $BUILD --remove-orphans; then
    echo; echo "Journal de l'initialisation :"; dc logs --no-color --tail 60 recette-init || true
    die "Démarrage impossible (voir ci-dessus)."
  fi
  dc logs --no-color recette-init | sed -n '/Données de recette prêtes/,$p' | sed 's/^[^|]*| //' || true
  attendre_api || { dc logs --no-color --tail 60 api; die "L'API ne répond pas."; }
  afficher_acces "http://localhost:${R_ADMIN}"
  exit 0
fi

# ═════════════════════════════════════════════════════════════════════════════
# Mode sans Docker : Postgres local existant + Node.js 22
# ═════════════════════════════════════════════════════════════════════════════
mkdir -p "$STATE_DIR"
arreter_local() {
  for f in "$STATE_DIR"/*.pid; do
    [ -f "$f" ] || continue
    pid=$(cat "$f")
    if kill -0 "$pid" 2>/dev/null; then
      # Le processus et ses enfants (npx → next / node).
      pkill -TERM -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$f"
  done
}
if [ "$ACTION" = arreter ]; then info "Arrêt de la recette sans Docker"; arreter_local; exit 0; fi
arreter_local

command -v node >/dev/null 2>&1 || die "Node.js 22 est requis (https://nodejs.org)."
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 22 est requis (trouvé : $(node -v))."

DB_URL=$(envval SANS_DOCKER_DATABASE_URL)
DB_HOST=$(node -e 'try{console.log(new URL(process.argv[1]).hostname)}catch{console.log("")}' "$DB_URL")
case "$DB_HOST" in localhost|127.0.0.1) ;; *) die "SANS_DOCKER_DATABASE_URL doit viser localhost ou 127.0.0.1 (reçu « $DB_HOST »)." ;; esac

if [ "$ACTION" = reinitialiser ]; then
  command -v psql >/dev/null 2>&1 || die "--reinitialiser sans Docker demande psql."
  DB_NAME=$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1))' "$DB_URL")
  case "$DB_NAME" in *recette*) ;; *) die "Par sécurité, seule une base dont le nom contient « recette » peut être réinitialisée (reçu « $DB_NAME »)." ;; esac
  ADMIN_URL=$(node -e 'const u=new URL(process.argv[1]);u.pathname="/postgres";u.search="";console.log(u.toString())' "$DB_URL")
  info "Suppression puis recréation de la base « $DB_NAME »"
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "drop database if exists \"$DB_NAME\"" -c "create database \"$DB_NAME\""
elif command -v psql >/dev/null 2>&1; then
  DB_NAME=$(node -e 'console.log(new URL(process.argv[1]).pathname.slice(1))' "$DB_URL")
  ADMIN_URL=$(node -e 'const u=new URL(process.argv[1]);u.pathname="/postgres";u.search="";console.log(u.toString())' "$DB_URL")
  psql "$ADMIN_URL" -Atc "select 1 from pg_database where datname='$DB_NAME'" 2>/dev/null | grep -q 1 \
    || { info "Création de la base « $DB_NAME »"; psql "$ADMIN_URL" -c "create database \"$DB_NAME\"" >/dev/null || true; }
fi

NPM_CI=(npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/ --replace-registry-host=registry.npmmirror.com)
for d in . mobile-steve admin; do
  if [ ! -d "$d/node_modules" ]; then info "Installation des dépendances ($d)"; (cd "$d" && "${NPM_CI[@]}"); fi
done

# Environnement de l'API : .env.recette, puis valeurs forcées (base, sécurité).
set -a
# shellcheck disable=SC1090
. "./$ENV_FILE"
set +a
export DATABASE_URL="$DB_URL" DIRECT_URL="$DB_URL" NODE_ENV=production PORT="$R_API" INTERVIEW_VERSION=8.2
export DB_TRANSFER_TARGET_URL= RESEND_API_KEY= SENDGRID_API_KEY= BREVO_API_KEY= SENDINBLUE_API_KEY= SMTP_HOST= \
       SAFETY_ALERT_EMAILS= BILLING_ALERT_EMAILS= GROQ_API_KEY= OPENROUTER_AUTH= NODE_USE_ENV_PROXY= \
       DAILY_API_KEY= COMPANIES_HOUSE_API_KEY= GOOGLE_CLIENT_IDS= FACEBOOK_APP_ID= FACEBOOK_APP_SECRET=
export OPENROUTER_API_KEY= OPENROUTER_BASE_URL= HARMONY_QUESTIONS_SOURCE=bank
if [ "$FAUX_IA" = 1 ]; then
  info "Faux OpenRouter local sur le port 8799"
  nohup node mobile-steve/e2e/fake-openrouter.js 8799 > "$STATE_DIR/faux-openrouter.log" 2>&1 < /dev/null &
  echo $! > "$STATE_DIR/faux-openrouter.pid"
  export OPENROUTER_API_KEY=stub-local OPENROUTER_BASE_URL=http://localhost:8799/api/v1 HARMONY_QUESTIONS_SOURCE=ai
fi

info "Client Prisma et compilation de l'API"
./node_modules/.bin/prisma generate >/dev/null
./node_modules/.bin/nest build

info "Schéma (base vide uniquement) et membres fictifs"
node deploy/recette-init.js

info "Démarrage de l'API (journal : $STATE_DIR/api.log)"
nohup node dist/main.js > "$STATE_DIR/api.log" 2>&1 < /dev/null &
echo $! > "$STATE_DIR/api.pid"

info "Export de l'application web (1 à 3 minutes)…"
(cd mobile-steve && EXPO_PUBLIC_API_URL="http://localhost:${R_API}/api" EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY="$PK" \
  CI=1 EXPO_NO_TELEMETRY=1 npx expo export --platform web --output-dir "../$STATE_DIR/web" > "../$STATE_DIR/web-export.log" 2>&1) \
  || die "Export web impossible (voir $STATE_DIR/web-export.log)."
nohup node mobile-steve/e2e/static-server.js "$STATE_DIR/web" "$R_WEB" > "$STATE_DIR/web.log" 2>&1 < /dev/null &
echo $! > "$STATE_DIR/web.pid"

info "Démarrage de l'admin (Next.js, port 3001 ; journal : $STATE_DIR/admin.log)"
NEXT_PUBLIC_API_URL="http://localhost:${R_API}/api" NEXT_PUBLIC_WEB_URL="http://localhost:${R_WEB}" NEXT_TELEMETRY_DISABLED=1 \
  nohup node admin/node_modules/next/dist/bin/next dev admin -p 3001 > "$STATE_DIR/admin.log" 2>&1 < /dev/null &
echo $! > "$STATE_DIR/admin.pid"

attendre_api || die "L'API ne répond pas (voir $STATE_DIR/api.log)."
afficher_acces "http://localhost:3001"
