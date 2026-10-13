# BOLIGO V8.2 — recette navigateur locale (LOCAL UNIQUEMENT)

S=/tmp/claude-0/-home-user-Boligo-back/8f815e82-ee6c-56f3-a515-e1ea1d1dda83/scratchpad/e2e
Logs : $S/logs/{build,npm-ci,expo-export,backend,fake-openrouter,static,run*}.log

## 1. PostgreSQL 16 local
```bash
pg_ctlcluster 16 main start
su postgres -c "psql -c \"CREATE ROLE boligo LOGIN PASSWORD '***' CREATEDB\""   # mot de passe local : boligo
su postgres -c "psql -c 'DROP DATABASE IF EXISTS boligo_web_v82' -c 'CREATE DATABASE boligo_web_v82 OWNER boligo'"
cd /home/user/Boligo-back
DATABASE_URL=postgresql://boligo:***@localhost:5432/boligo_web_v82 \
DIRECT_URL=postgresql://boligo:***@localhost:5432/boligo_web_v82 \
  npx prisma db push --skip-generate
# migrations SQL manuelles (idempotentes ; dont le trigger d'immutabilité de questionnaireVersion)
for f in prisma/sql/*.sql; do psql postgresql://boligo:***@localhost:5432/boligo_web_v82 -q -f $f; done
```
(pas de dossier prisma/migrations : `db push` + prisma/sql/*.sql)

## 2. Faux OpenRouter + backend
```bash
cat > $S/sondeur-models.json <<'EOF'
{"generatedAt":"2026-10-12T00:00:00Z","run":"provisional","writer":["z-ai/glm-5.3-flash"],"critic":["anthropic/claude-sonnet-5.5"],"escalation":["anthropic/claude-sonnet-5.5"],"fallback":[],"escalateAboveRejectRate":0.5}
EOF
cd /home/user/Boligo-back/mobile-steve && nohup node e2e/fake-openrouter.js 8799 > $S/logs/fake-openrouter.log 2>&1 &

cd /home/user/Boligo-back && npm run build      # clean + prisma generate + nest build → dist/main.js
env DATABASE_URL=postgresql://boligo:***@localhost:5432/boligo_web_v82 \
    DIRECT_URL=postgresql://boligo:***@localhost:5432/boligo_web_v82 \
    PORT=3000 NODE_ENV=development JWT_SECRET=*** JWT_EXPIRES_IN=7d \
    INTERVIEW_VERSION=8.2 OTP_DEBUG=true \
    OPENROUTER_BASE_URL=http://localhost:8799/api/v1 OPENROUTER_API_KEY=*** \
    HARMONY_QUESTIONS_SOURCE=ai SONDEUR_MODELS_FILE=$S/sondeur-models.json \
  nohup node dist/main.js > $S/logs/backend.log 2>&1 &
```
Aucune clé réelle (Stripe, e-mail, Groq…) : e-mails en simulation, paiements désactivés.

## 3. App web (Expo)
```bash
cd /home/user/Boligo-back/mobile-steve
npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/ --replace-registry-host=registry.npmmirror.com
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo export --platform web --output-dir /tmp/boligo-web
nohup node e2e/static-server.js /tmp/boligo-web 8081 > $S/logs/static.log 2>&1 &
```

## 4. Scénario
```bash
cd /home/user/Boligo-back/mobile-steve
APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api \
E2E_PSQL="psql postgresql://boligo:***@localhost:5432/boligo_web_v82" \
  node e2e/v82.e2e.js
# captures + resultats.json → mobile-steve/docs/screenshots/v82/
```
Le scénario crée de nouveaux comptes à chaque fois (e-mails horodatés) : relançable sans vider la base.

## Remarque : étape « Parcours ouvert au dialogue »
Avec le faux OpenRouter, les lectures IA des journées échouent (503). La messagerie
reste retenue (JourneyInsightsService.holdsChat) jusqu'à 3 échecs espacés de 10 min
(MAX_ATTEMPTS=3, RETRY_AFTER_MS=10 min), alors que le scénario n'attend que ~24 s.
Vérification après coup (visite de /matching/my-matches toutes les 60 s) :
```bash
node $S/poll-chat.js <email de A> <journeyId>     # mot de passe de recette dans le script
```

## Services (ports)
- PostgreSQL 16/main : 5432
- Faux OpenRouter : 8799
- Backend Nest : 3000 (/api)
- Serveur statique : 8081

Arrêt : `pkill -f fake-openrouter.js; pkill -f 'node dist/main.js'; pkill -f static-server.js; pg_ctlcluster 16 main stop`

## Run 2 (après 9880cfc) — configuration actuellement en service
- Base recréée vide (DROP/CREATE + db push + prisma/sql/*.sql), `npm run build`.
- Faux OpenRouter : copie avec journal par requête (même comportement que mobile-steve/e2e/fake-openrouter.js) :
  `nohup node $S/fake-openrouter-logging.js 8799 > $S/logs/fake-openrouter.log 2>&1 &`
  (une ligne JSON par requête : url, model, kind=moderation|autre)
- Backend : même env qu'au §2, mais `SONDEUR_MODELS_FILE=/home/user/Boligo-back/config/sondeur-models.json`.
- Static server et export web inchangés (aucun changement mobile dans les commits).
- Résultats : $S/logs/run2.log (run 1 : $S/run1/).
