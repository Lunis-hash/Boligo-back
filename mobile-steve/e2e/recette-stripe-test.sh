#!/bin/bash
# Recette Stripe RÉELLE en mode TEST sur le build final local.
#
#   bash mobile-steve/e2e/recette-stripe-test.sh verifier   # contrôles préalables, aucun paiement
#   RECETTE_STRIPE_AUTORISEE=oui WEBHOOK_RENDER=desactive|accepte \
#     bash mobile-steve/e2e/recette-stripe-test.sh executer  # recette complète (une seule)
#
# Variables (environnement de la session, jamais dans le dépôt ni en argument) :
#   STRIPE_TEST_SECRET_KEY  clé sk_test_ (ou rk_test_) du compte « environnement de test BOLIGO »
#   STRIPE_BIN              chemin de Stripe CLI (défaut : stripe)
# Garanties :
#   - compte Stripe imposé (acct_1UMQWmLz8rnS1CBn), toute clé non test refusée ;
#   - la clé ne figure dans aucun argument de processus, journal ni résultat ;
#   - seule la base locale « boligo_recette_stripe » (marquée jetable) peut être supprimée ;
#   - aucun paiement tant que le webhook Render n'est pas traité (WEBHOOK_RENDER) ;
#   - chaque étape a un délai maximal ; toute erreur arrête la recette.
set -euo pipefail
umask 077
MODE=${1:-verifier}
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"

readonly ACCOUNT=acct_1UMQWmLz8rnS1CBn
readonly DB=boligo_recette_stripe                       # seule base supprimable
readonly MARK='boligo-recette-stripe-jetable'           # commentaire posé à la création
readonly U="postgresql://boligo:boligo@127.0.0.1:5432/$DB"
readonly STRIPE_BIN=${STRIPE_BIN:-stripe}
readonly OUT="$ROOT/docs/recette-stripe-test"
WORK=$(mktemp -d /tmp/recette-stripe.XXXXXX)            # 0700 : journaux bruts (secrets) supprimés à la fin
PIDS=()

die() { echo "ARRÊT : $*" >&2; exit 2; }
mask() { sed -E 's/(sk|rk|pk)_(test|live)_[A-Za-z0-9]+/<clé masquée>/g; s/whsec_[A-Za-z0-9]+/<secret masqué>/g; s/eyJ[A-Za-z0-9_.-]{20,}/<jeton masqué>/g'; }
cleanup() {
  for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null || true; done
  rm -rf "$WORK"
}
trap cleanup EXIT
# Attend une condition (commande) au plus N secondes.
wait_until() { local n=$1; shift; for _ in $(seq "$n"); do "$@" && return 0; sleep 1; done; return 1; }

# ── 1. Clé et outil (aucun appel réseau) ────────────────────────────────────
case "${STRIPE_TEST_SECRET_KEY:-}" in
  sk_test_*|rk_test_*) ;;
  *) die "STRIPE_TEST_SECRET_KEY absente ou non test (sk_test_/rk_test_ exigée)." ;;
esac
command -v "$STRIPE_BIN" >/dev/null || die "Stripe CLI introuvable (STRIPE_BIN)."
# Stripe CLI lit la clé dans STRIPE_API_KEY : jamais d'option --api-key (visible dans ps).
export STRIPE_CLI_TELEMETRY_OPTOUT=1
CLI_VERSION=$("$STRIPE_BIN" version 2>/dev/null || true)
echo "Stripe CLI : $(printf '%s\n' "$CLI_VERSION" | grep -i 'stripe version' | head -1)"
"$STRIPE_BIN" events resend --help 2>&1 | grep -q -- '--webhook-endpoint' \
  || die "« stripe events resend » absent ou syntaxe inattendue dans cette version de Stripe CLI."

# ── 2. Compte, permissions, webhooks existants (lecture ; aucune création) ─
export STRIPE_TEST_SECRET_KEY STRIPE_BIN WORK OUT ACCOUNT
if ! node mobile-steve/e2e/recette-stripe-test.js preflight 2>&1 | mask | tee "$WORK/preflight.txt"; then
  die "contrôles préalables Stripe en échec (voir ci-dessus)."
fi
if [ "$MODE" = verifier ]; then echo "Contrôles préalables réussis. Aucun paiement effectué."; exit 0; fi
[ "$MODE" = executer ] || die "mode inconnu : $MODE (verifier | executer)."
[ "${RECETTE_STRIPE_AUTORISEE:-}" = oui ] || die "exécution non autorisée (RECETTE_STRIPE_AUTORISEE=oui requis)."
case "${WEBHOOK_RENDER:-}" in
  desactive|accepte) ;;
  *) die "WEBHOOK_RENDER=desactive|accepte requis (voir docs/DEPLOIEMENT_RENDER.md §1)." ;;
esac
grep -q "^WEBHOOK_RENDER_OK $WEBHOOK_RENDER\$" "$WORK/preflight.txt" \
  || die "l'état du webhook Render ne correspond pas à WEBHOOK_RENDER=$WEBHOOK_RENDER."

# ── 3. PostgreSQL local et base dédiée ──────────────────────────────────────
pg_ok() { pg_isready -q -h 127.0.0.1 -p 5432 -t 2; }
# Démarrage si besoin ; un échec est détecté par l'attente ci-dessous.
if ! pg_ok; then service postgresql start > "$WORK/pg.txt" 2>&1 || echo "service postgresql start : code $?" >&2; fi
wait_until 30 pg_ok || die "PostgreSQL local indisponible après 30 s."
# Administration par le socket local de postgres (jamais un hôte distant).
psql_admin() { su postgres -c "psql -v ON_ERROR_STOP=1 -tA -d postgres -c \"$1\""; }
EXISTS=$(psql_admin "SELECT count(*) FROM pg_database WHERE datname = '$DB'")
if [ "$EXISTS" = 1 ]; then
  COMMENT=$(psql_admin "SELECT coalesce(shobj_description(oid, 'pg_database'), '') FROM pg_database WHERE datname = '$DB'")
  [ "$COMMENT" = "$MARK" ] || die "la base $DB existe sans le marqueur de base jetable : aucune suppression."
  psql_admin "DROP DATABASE \"$DB\" WITH (FORCE)" >/dev/null
fi
psql_admin "CREATE DATABASE \"$DB\" OWNER boligo" >/dev/null
psql_admin "COMMENT ON DATABASE \"$DB\" IS '$MARK'" >/dev/null
IDENT=$(psql -v ON_ERROR_STOP=1 -tA "$U" -c "SELECT current_database() || '|' || host(inet_server_addr())")
[ "$IDENT" = "$DB|127.0.0.1" ] || die "identité de la base inattendue : $IDENT"
# Schéma complet depuis prisma/schema.prisma (paiements, factures, rétractations,
# événements Stripe). Aucun script prisma/sql n'est nécessaire sur une base neuve.
DATABASE_URL=$U DIRECT_URL=$U timeout 180 npx prisma db push --skip-generate > "$WORK/prisma.txt" 2>&1 \
  || { mask < "$WORK/prisma.txt" >&2; die "prisma db push en échec."; }
TABLES=$(psql -tA "$U" -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Payment','Invoice','WithdrawalRequest','StripeEvent','CreditTransaction','BillingProfile')")
[ "$TABLES" = 6 ] || die "schéma incomplet ($TABLES/6 tables de paiement)."

# ── 4. Listener Stripe (le secret vient de CE listener) ─────────────────────
( export STRIPE_API_KEY="$STRIPE_TEST_SECRET_KEY"; unset STRIPE_TEST_SECRET_KEY
  exec "$STRIPE_BIN" listen --color off \
    --events payment_intent.succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed \
    --forward-to http://127.0.0.1:3000/api/payment/webhook ) > "$WORK/listen.log" 2>&1 &
LISTEN=$!; PIDS+=("$LISTEN")
ready() { grep -q "Ready!" "$WORK/listen.log"; }
wait_until 60 ready || { mask < "$WORK/listen.log" >&2; die "listener Stripe non prêt après 60 s."; }
kill -0 "$LISTEN" 2>/dev/null || die "listener Stripe arrêté."
WH=$(grep -o 'whsec_[A-Za-z0-9]*' "$WORK/listen.log" | head -1)
[ -n "$WH" ] || die "secret de signature introuvable dans la sortie du listener."

# ── 5. Backend (build final), environnement minimal sans clé en argument ───
[ -f dist/main.js ] || die "build final absent (dist/main.js)."
(
  K=$STRIPE_TEST_SECRET_KEY
  for v in $(compgen -e); do
    case "$v" in PATH|HOME|LANG|TZ|HTTPS_PROXY|https_proxy|NO_PROXY|no_proxy|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE) ;; *) unset "$v" 2>/dev/null || export -n "$v" ;; esac
  done
  export DATABASE_URL=$U DIRECT_URL=$U PORT=3000 NODE_ENV=development JWT_SECRET=recette-stripe-locale \
    JWT_EXPIRES_IN=7d OTP_DEBUG=true INTERVIEW_VERSION=8.2 WEB_APP_URL=http://127.0.0.1:8081 \
    BILLING_ENABLED=true NODE_USE_ENV_PROXY=1 STRIPE_WEBHOOK_SECRET="$WH" STRIPE_SECRET_KEY="$K"
  exec node dist/main.js
) > "$WORK/backend.log" 2>&1 &
BACK=$!; PIDS+=("$BACK")
health() { [ "$(curl -s -o "$WORK/health.json" -w '%{http_code}' http://127.0.0.1:3000/api/health)" = 200 ] && grep -q '"db":"ok"' "$WORK/health.json"; }
wait_until 90 health || { tail -20 "$WORK/backend.log" | mask >&2; die "backend non sain après 90 s (HTTP 200 + db ok attendus)."; }
stripe_ok() { grep -q "Stripe connecté : .*($ACCOUNT), mode test" "$WORK/backend.log"; }
wait_until 30 stripe_ok || { grep -i stripe "$WORK/backend.log" | mask >&2; die "le backend n'est pas connecté au compte Stripe de test BOLIGO."; }

# Page de retour de Checkout (success_url), locale.
node -e "require('http').createServer((q,r)=>r.end('BOLIGO retour paiement')).listen(8081,'127.0.0.1')" &
PIDS+=("$!")

# ── 6. Recette (une seule exécution) ────────────────────────────────────────
mkdir -p "$OUT"
set +e
API_URL=http://127.0.0.1:3000/api DB_URL=$U LISTEN_LOG="$WORK/listen.log" BACKEND_LOG="$WORK/backend.log" \
  LISTEN_PID=$LISTEN node mobile-steve/e2e/recette-stripe-test.js run 2>&1 | mask | tee "$OUT/recette.txt"
STATUS=${PIPESTATUS[0]}
set -e
node mobile-steve/e2e/recette-stripe-test.js webhooks-after 2>&1 | mask | tee -a "$OUT/recette.txt"
# Seule l'absence de ligne (code 1) est tolérée.
{ grep -E -- "-->|<--" "$WORK/listen.log" || [ $? -eq 1 ]; } | mask > "$OUT/listener-livraisons.txt"
{ grep -E "Stripe connecté|Événement Stripe reçu|Paiement réussi|[Rr]embours|Facture" "$WORK/backend.log" || [ $? -eq 1 ]; } | mask > "$OUT/journal-backend.txt"
exit "$STATUS"
