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
