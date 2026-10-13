# Run 2026-10-12 — INVALIDE (crédits OpenRouter épuisés)

Ces fichiers ne mesurent pas la qualité des modèles.

- Compte OpenRouter : 5 $ de crédits au total, épuisés pendant le screen
  (la limite de la clé, 20 $, n'était pas le facteur limitant).
- 3 107 appels ont reçu HTTP 402 « Insufficient credits » : 954 exécutions
  sur 966 n'ont rien rédigé, les juges et relecteurs n'ont rien noté.
- Tous les scores (qualité 0, échec dur 100 %, relecteurs 100 % / 0 %) sont
  des artefacts de ces erreurs.
- Défaut du banc également observé : variantes `:batch` retenues alors
  qu'elles sont refusées par chat/completions (HTTP 404). Corrigé dans
  `scripts/sondeur-benchmark.ts`.

Décision : aucun modèle qualifié, `config/sondeur-models.json` non écrit.
Dépense du banc : 3,13 € (plafond 20 €). Couples synthétiques uniquement,
`data_collection: deny`, aucun modèle gratuit.

À relancer après ajout de crédits, avec `OPENROUTER_AUTH=proxy NODE_USE_ENV_PROXY=1`.
