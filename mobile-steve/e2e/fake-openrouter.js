/* eslint-disable no-console */
/**
 * Faux OpenRouter LOCAL pour la recette navigateur (aucun appel réel, aucun
 * coût) : il ne répond qu'aux modérations (« aucun danger ») ; tout autre
 * appel échoue (503) et le backend se replie sur ses gabarits. Il ne juge
 * rien : la qualité de la modération réelle se mesure avec un vrai modèle.
 *
 *   node e2e/fake-openrouter.js 8799
 *   OPENROUTER_API_KEY=stub-local OPENROUTER_BASE_URL=http://localhost:8799 node dist/main.js
 */
const http = require('http');

const port = Number(process.argv[2] || 8799);
let moderated = 0;
let refused = 0;

http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      // Catalogue injoignable : le backend s'en remet au prix plafond (max_price).
      if (req.url.endsWith('/models')) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        return res.end('{}');
      }
      const prompt = (() => {
        try {
          return JSON.parse(body).messages.map((m) => m.content).join('\n');
        } catch {
          return '';
        }
      })();
      if (/Tu modères une réponse au questionnaire|modérateur de sécurité de BOLIGO/.test(prompt)) {
        moderated += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            choices: [{ message: { content: '{"allowed": true, "danger": []}' } }],
            usage: { prompt_tokens: 0, completion_tokens: 0, cost: 0 },
          }),
        );
      }
      refused += 1;
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'faux OpenRouter : seule la modération est simulée' }));
    });
  })
  .listen(port, () => console.log(`Faux OpenRouter sur http://localhost:${port}`));

process.on('SIGTERM', () => {
  console.log(`modérations simulées : ${moderated}, autres appels refusés : ${refused}`);
  process.exit(0);
});
