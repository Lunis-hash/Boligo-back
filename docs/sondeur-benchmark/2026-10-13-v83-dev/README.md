# V8.3 — mise au point (lot `corpus-frames-dev`, couples anciens)

Corpus de mise au point écrit dans les cadres par l'annotateur indépendant : 159 fautives, 92 valides (75 % FR, 25 % EN).

| Étape | Fautives rejetées | Valides acceptées | Fuites |
|---|---|---|---|
| Contrôle seul, premier passage | 80,5 % | 75,0 % | 1 |
| Contrôle seul, après réglage | 100 % | 95,7 % | 0 |
| Chaîne complète (relecteur GLM + second avis Luna), après réglage | 100 % | 94,6 % | 0 |

Réglages (règles générales, jamais un item) : familles de contenus refusés dans une case (deux idées, effort à sens unique, jugement, jargon, intrusion, sécurité, fait supposé, difficulté présupposée), synonymes du sujet de l'écart (FR/EN), cohérence des concepts entre le français et l'anglais, adverbe distinctif d'une réponse = fuite, contractions « au/aux/du/des », tolérance et terrain d'entente admis hors violence et contrôle, consigne du relecteur alignée sur les cadres.
