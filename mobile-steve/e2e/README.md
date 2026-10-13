# Recette navigateur (Expo web + Playwright)

Le conteneur de recette ne dispose ni d'émulateur Android ni de simulateur
iOS : le parcours utilisateur est donc rejoué dans Chromium sur l'export
web de l'application (react-native-web), contre le backend de test local.

```bash
# 1. backend de test sur http://localhost:3000/api (base PostgreSQL vide)
# 2. export web de l'app pointant vers ce backend
EXPO_PUBLIC_API_URL=http://localhost:3000/api npx expo export --platform web --output-dir /tmp/boligo-web
# 3. serveur statique + scénario
node e2e/static-server.js /tmp/boligo-web 8081 &
node e2e/journey.e2e.js            # captures dans docs/screenshots/
```

Limites connues du web : pas de Stripe natif, pas de WebView (appel vidéo),
pas de notifications push. Ces parties sont couvertes par
`scripts/backend-flow-smoke.js` (API) et les tests unitaires.

## Recette V8.2 (`v82.e2e.js`) avec le faux OpenRouter

`fake-openrouter.js` remplace OpenRouter **en local** (aucun appel réseau
réel, aucune clé). Il est déterministe : il reconnaît chaque consigne du
backend à des marqueurs stables et répond comme un modèle sage.

| Consigne (marqueur)                                  | Réponse simulée |
|------------------------------------------------------|-----------------|
| modération                                           | aucun danger |
| « Tu prépares les questions du JOUR n »              | 2 questions valides par écart réel du jour (bloc PREUVES), + questions **pièges** sur un accord et sur un risque partagé |
| « QUESTIONS À RELIRE » (relecteur)                   | tout accepté (le contrôle du code a déjà filtré) |
| « Écris la lecture de cette journée »                | jour 1 : un écart non compris (`toDiscuss`) ; jours 2 et 3 : `toDiscuss` vide |
| « LECTURE À VÉRIFIER » (fidélité)                    | `{"fidele": true}` |
| « Propose DEUX questions d'approfondissement »       | relance sur le thème de l'écart du jour 1, avec `text_en` |
| « Écris le bilan Harmonie »                          | accords cités mot pour mot, trois premières questions |
| tout le reste (catalogue `/models`, autres consignes) | 503 |

Contrôle : `GET /__stats` (compteurs par type et par modèle),
`GET /__traps` (textes des pièges, dernières preuves lues). Une ligne JSON
par requête dans son journal.

```bash
node e2e/fake-openrouter.js 8799 &
# backend : OPENROUTER_BASE_URL=http://localhost:8799/api/v1 OPENROUTER_API_KEY=stub-local
#           HARMONY_QUESTIONS_SOURCE=ai INSIGHTS_RETRY_AFTER_MS=2000
APP_URL=http://localhost:8081 API_URL=http://localhost:3000/api \
E2E_PSQL="psql postgresql://boligo:boligo@localhost:5432/boligo_web_v82" \
FAKE_OPENROUTER_URL=http://localhost:8799 node e2e/v82.e2e.js
```

`INSIGHTS_RETRY_AFTER_MS=2000` raccourcit seulement l'écart entre deux essais
d'une lecture IA (10 min par défaut) ; la règle ne change pas : le dialogue
s'ouvre quand chaque lecture est écrite ou a échoué trois fois. Avec le faux
OpenRouter, les lectures réussissent et le dialogue s'ouvre aussitôt ; la
recette attend au plus 60 s.

Contrôles propres à cette recette :
- **NO_FAKE_GAP** : aucune question servie (table `HarmonyQuestion`) n'a le
  texte d'un piège ; chaque question de source `ia` porte une preuve d'écart
  (ni accord, ni risque partagé) ; au moins une question IA servie, sinon le
  contrôle échoue (il ne prouverait rien).
- **ADAPTIVE_FOLLOWUP** : jour 1 (écart non compris) → exactement une
  question `followUp` au jour 2, sur le thème de l'écart ; jour 2 (écart
  compris) → aucune au jour 3.

Les réponses scriptées créent de vrais écarts non sensibles : B répond
M4_Q14 = C (épargne) et M0_Q03 = D (déménagement), A et B répondent
M3_Q12 = C (risque partagé, cible d'un piège).
