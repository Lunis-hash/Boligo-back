/* eslint-disable no-console */
/**
 * FAUX OpenRouter pour vérifier la MÉCANIQUE du banc d'essai sans réseau ni
 * coût (catalogue, appels, juges, sélection, fichiers écrits). Ses réponses
 * sont fabriquées : aucun résultat de ce serveur ne mesure un vrai modèle.
 *
 *   node scripts/bench-fake-openrouter.js 8798
 *   OPENROUTER_API_KEY=faux OPENROUTER_BASE_URL=http://localhost:8798 BENCH_RUN=mecanique ...
 */
const http = require('http');
const THEMES = [
  'famille',
  'argent',
  'spiritualite',
  'intimite',
  'communication',
  'projet',
  'lieu',
];
const WORDS = {
  famille: 'votre famille',
  argent: "l'argent",
  spiritualite: 'la foi',
  intimite: 'la tendresse',
  communication: 'une dispute',
  projet: 'votre projet de vie',
  lieu: 'votre lieu de vie',
};
const MODELS = [
  {
    id: 'fakeqwen/qwen-flash',
    pricing: { prompt: '0.0000001', completion: '0.0000004' },
  },
  {
    id: 'fakeglm/glm-flash',
    pricing: { prompt: '0.0000002', completion: '0.0000008' },
  },
  {
    id: 'anthropic/claude-sonnet-faux',
    pricing: { prompt: '0.000003', completion: '0.000015' },
  },
];
const json = (res, body, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
http
  .createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      if (req.url.endsWith('/models'))
        return json(res, {
          data: MODELS.map((m) => ({
            ...m,
            context_length: 128000,
            supported_parameters: ['response_format', 'reasoning'],
          })),
        });
      if (/\/endpoints$/.test(req.url))
        return json(res, {
          data: {
            endpoints: [
              {
                provider_name: 'Faux',
                zdr: true,
                latency_last_30m: 900,
                uptime_last_30m: 99.9,
              },
            ],
          },
        });
      let prompt = '';
      let model = '';
      try {
        const b = JSON.parse(body);
        model = b.model;
        prompt = b.messages.map((m) => m.content).join('\n');
      } catch {
        /* corps illisible */
      }
      const usage = {
        prompt_tokens: Math.ceil(prompt.length / 3),
        completion_tokens: 800,
        cost: 0,
      };
      const reply = (content) =>
        json(res, { choices: [{ message: { content } }], usage, model });
      const day = /JOUR (\d) du Sondeur/.exec(prompt);
      if (day) {
        const questions = THEMES.flatMap((t, i) => [
          {
            day: Number(day[1]),
            themeKey: t,
            theme: 'x',
            emoji: '💬',
            text: `Avec ${WORDS[t]}, sur quoi ne céderez-vous jamais ?`,
            preuves: [`N-${t}`],
            nature: 'neutre',
            options: ['A', 'B', 'Autre...'],
            text_en: `When it comes to this, what will you never give up on (${i})?`,
            options_en: ['A', 'B', 'Other...'],
          },
        ]);
        return reply(JSON.stringify({ analyse: ['x'], questions }));
      }
      if (/évalues, en aveugle/.test(prompt)) {
        const n = (prompt.match(/^\d+\. FR :/gm) || []).length;
        const base = model.startsWith('fakeqwen') ? 2 : 1;
        return reply(
          JSON.stringify({
            verdicts: Array.from({ length: n }, (_, i) => ({
              q: i + 1,
              scores: Object.fromEntries(
                [
                  'gap_targeting',
                  'new_information',
                  'evidence_fidelity',
                  'directness',
                  'depth',
                  'natural_french',
                  'natural_english',
                  'non_ai_style',
                  'non_leading',
                  'non_judgment',
                  'actionability',
                  'fr_en_equivalence',
                  'safety',
                ].map((k) => [k, base]),
              ),
              hard: [],
            })),
          }),
        );
      }
      if (/QUESTIONS À RELIRE/.test(prompt)) {
        const n = (prompt.match(/^\s*\d+\. /gm) || []).length || 14;
        return reply(
          JSON.stringify({
            verdicts: Array.from({ length: n }, (_, i) => ({
              n: i + 1,
              ok: true,
            })),
            meilleures: [1],
          }),
        );
      }
      return json(res, { error: 'faux serveur' }, 503);
    });
  })
  .listen(Number(process.argv[2] || 8798), () =>
    console.log('Faux OpenRouter (banc d’essai, mécanique seulement)'),
  );
