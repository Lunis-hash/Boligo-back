/**
 * Recette locale uniquement (chargé par recette-stripe-test.sh avec node -r) :
 * dans le conteneur de recette, l'accès à Internet passe par un proxy.
 * stripe-node crée son propre https.Agent, qui ignore HTTPS_PROXY ; cette cale
 * lui fait suivre le proxy de l'environnement (option proxyEnv de Node ≥ 22.21).
 * Sans effet sans proxy. Jamais chargée en production (Render a un accès direct).
 */
const https = require('https');
if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const Base = https.Agent;
  https.Agent = class ProxyEnvAgent extends Base {
    constructor(options = {}) {
      super({ proxyEnv: process.env, ...options });
    }
  };
}
