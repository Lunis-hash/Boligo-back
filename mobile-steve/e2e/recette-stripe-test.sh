#!/bin/bash
# Recette Stripe RÉELLE en mode TEST sur le build final local.
#
# Prérequis (voir docs/DEPLOIEMENT_RENDER.md §1) :
#   - STRIPE_TEST_SECRET_KEY : clé sk_test_/rk_test_ du compte « environnement
#     de test BOLIGO » (variable d'environnement, jamais dans le dépôt) ;
#   - accès réseau à *.stripe.com et *.stripe.network ;
#   - Stripe CLI (STRIPE_BIN, sinon `stripe` dans le PATH) ;
#   - build final (dist/), base PostgreSQL locale.
# Aucune clé n'est affichée. Toute clé réelle (sk_live_/rk_live_) est refusée.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${STRIPE_TEST_SECRET_KEY:-}" in
  sk_test_*|rk_test_*) ;;
  *) echo "Clé Stripe de TEST absente ou non test : arrêt." >&2; exit 2 ;;
esac
STRIPE_BIN=${STRIPE_BIN:-stripe}
U=${RECETTE_DB:-postgresql://boligo:boligo@localhost:5432/boligo_stripe_test}
LOGS=${LOGS:-/tmp/recette-stripe}; mkdir -p "$LOGS"
case "$U" in *@localhost*|*@127.0.0.1*) ;; *) echo "Base locale uniquement." >&2; exit 2 ;; esac

DB=${U##*/}
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS $DB' -c 'CREATE DATABASE $DB OWNER boligo'"
DATABASE_URL=$U DIRECT_URL=$U npx prisma db push --skip-generate >/dev/null
for f in prisma/sql/*.sql; do psql "$U" -q -f "$f" >/dev/null 2>&1 || true; done

# Secret de signature propre à cette session de `stripe listen` (jamais affiché).
WH=$("$STRIPE_BIN" listen --api-key "$STRIPE_TEST_SECRET_KEY" --print-secret)
"$STRIPE_BIN" listen --api-key "$STRIPE_TEST_SECRET_KEY" \
  --events payment_intent.succeeded,charge.refunded,charge.dispute.created,charge.dispute.closed \
  --forward-to localhost:3000/api/payment/webhook > "$LOGS/stripe-listen.log" 2>&1 &
LISTEN=$!
trap 'kill $LISTEN $BACK 2>/dev/null || true' EXIT

env DATABASE_URL=$U DIRECT_URL=$U PORT=3000 NODE_ENV=development JWT_SECRET=local-recette-stripe \
  JWT_EXPIRES_IN=7d OTP_DEBUG=true INTERVIEW_VERSION=8.2 WEB_APP_URL=http://localhost:8081 \
  STRIPE_SECRET_KEY="$STRIPE_TEST_SECRET_KEY" STRIPE_WEBHOOK_SECRET="$WH" BILLING_ENABLED=true \
  node dist/main.js > "$LOGS/backend.log" 2>&1 &
BACK=$!
# Page de retour de Checkout (success_url) : simple réponse 200 locale.
node -e "require('http').createServer((q,r)=>r.end('BOLIGO retour paiement')).listen(8081)" &
RET=$!
trap 'kill $LISTEN $BACK $RET 2>/dev/null || true' EXIT
until curl -s localhost:3000/api/health >/dev/null; do sleep 1; done

cd mobile-steve
API_URL=http://localhost:3000/api E2E_PSQL="psql $U" STRIPE_BIN="$STRIPE_BIN" \
  node e2e/recette-stripe-test.js | tee "$LOGS/recette.log"
grep -E "Événement Stripe reçu|Paiement réussi|rembours" "$LOGS/backend.log" | sed -E 's/(sk|rk|whsec)_[A-Za-z0-9_]+/<masqué>/g' > ../docs/recette-stripe-test/journal-backend.txt || true
