# Essai réduit 2026-10-12 — contrôle humain avant tout test large

Couples synthétiques (10 couples FR ciblés : enfants, argent, religion, lieu de vie,
carrière*, temps de couple*, famille, intimité, aucun écart, sécurité), contrôle
déterministe seul (`BENCH_NO_JUDGES=1`), `data_collection: deny`, aucun modèle gratuit.
*La V8.2 n'a pas de question carrière ni temps passé ensemble : écarts voisins
(perte d'emploi, temps à soi dans le couple).

Dépense réelle depuis la recharge : 3,78 $ (plafond 4 €). Une part a été perdue
en réponses vides avant les correctifs (réflexion bornée, prix réels, plafond sur
la dépense réelle).

| Modèle | Couples | Rédigées | Retenues | Rejets forme / preuve | Coût | Latence P50 |
|---|---|---|---|---|---|---|
| Sonnet 5.5 | 3 | 124 | 66 | 35 / 23 | 0,58 € | 27 s |
| GLM 5.3 Flash | 10 | 362 | 214 | 68 / 78 | 0,02 € | 49 s |
| DeepSeek v4.1 Flash (relance, 8000 jetons) | 3 | 14 | 9 | 2 / 3 | 0,04 € | 94 s |
| Qwen 3.8 Flash | 13 | 0 | 0 | réponses vides (fin : length, 4500 puis 8000 jetons) | ~0 € | 75–122 s |
| Kimi K2.6 (relance) | 3 | 0 | 0 | réponses vides (length) et délais dépassés | ~0 € | 120 s |

Codes de rejet : P14/P13 (forme : hors sujet, présupposés), P7 (reprend la réponse
d'un membre), P11/P12/P10 (habitude, passé, émotion présupposés), P9 (état partagé
affirmé), P2 (preuve d'un autre thème), P6 (attribue une intention), EN4/EN5 (version
anglaise : accord affirmé, attribution).

Fiche à l'aveugle : `blind-sheet.md` (21 questions : 7 par modèle ayant produit des
questions — 30 impossible à 5–7 par modèle avec 3 modèles). Correspondance :
`blind-key.json`. Résumé : `control-summary.json`. Relance : `../2026-10-12-reduit-relance/`.
Aucun modèle n'est qualifié par cet essai.
