# Comparaison finale du Sondeur — 2026-10-12 (préproduction)

Même corpus pour les deux options : les 6 couples de la fiche n° 4 et 4 couples
tenus à l'écart (held-out, graines 70 000+, jamais vus pendant le réglage).
Couples synthétiques, `data_collection: deny`, aucun modèle gratuit.
Juge à l'aveugle d'une troisième famille, payant : `openai/gpt-5.6-luna`.
Plafond total 2,00 $ ; dépense réelle 1,97 $ (rédaction, relecture, escalade, juge).

| | A : Sonnet rédige, GLM relit, sans escalade | B : GLM rédige, Sonnet relit et escalade |
|---|---|---|
| Couples traités (plafond) | 8 / 10 | 7 / 10 |
| Questions retenues | 18 (2,3 par couple) | 14 (2,0 par couple) |
| Couples sans question | 3 | 2 |
| Rejet (contrôle + relecteur + doublons) | 83 % | 84 % |
| Qualité (juge, 0–1) | 0,944 (FR 0,926, EN 0,903) | 0,932 (FR 0,881, EN 0,911) |
| Fuites de réponse | 1 (juge) | 0 |
| Hypothèses non fondées | 0 | 0 |
| Faits connus répétés | 0 | 1 |
| Part écrite par l'escalade | 0 % | 86 % |
| Sondeur mesuré, par couple | 0,124 € | 0,138 € |
| Parcours complet P50 / P90 | 0,219 € / 0,222 € | 0,153 € / 0,249 € |
| Latence P50 par couple | 21 s | 36 s |

Décision (qualité d'abord, coût ensuite) : qualité équivalente (écart 0,012
sur 18 et 14 questions), mais A a une fuite de réponse relevée par le juge et
B aucune ; B est moins cher en médiane. **Option B retenue** :
`config/sondeur-models.json` (rédacteur GLM 5.3 Flash ; relecteur Sonnet 5.5,
ou GLM pour relire Sonnet ; escalade Sonnet 5.5 ; secours Sonnet 5.5, mesuré
comme rédacteur dans A).

Coût d'un parcours : Sondeur mesuré par couple + lectures des 3 jours, bilan,
contrôle de fidélité, 2 relances et modération estimés (taille réelle des
consignes × prix du catalogue). Euros ≈ dollars.

Réserves :
- Contrôle déterministe sur les 4 corpus de recette : 97,3 % des questions
  fautives rejetées (179/184), 94,6 % des valides acceptées (87/92) ; le seuil
  de 99 % n'est pas atteint par le contrôle seul, et le relecteur IA n'a pas été
  mesuré sur corpus étiqueté (budget).
- Les couples à un seul écart par jour obtenaient 0 question (seuil de
  4 questions codé en dur) : corrigé après ces mesures (commit 8bb7b6b), donc
  « couples sans question » est surestimé pour A comme pour B.
- Échantillon petit : 18 et 14 questions jugées.

Fichiers : `comparison.json`, `comparison.csv` ; essais `../2026-10-12-final-A/`,
`../2026-10-12-final-B/` (runs, scores du juge, budgets).
