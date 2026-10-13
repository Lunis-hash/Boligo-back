# Essai « écarts seulement » 2026-10-12 — après réécriture de la consigne

Consigne et contrôle réécrits (commit 725be00) : questions de l'IA sur les écarts
réels uniquement, confrontées à la réalité ; rejets P15 (enfance, famille
d'origine, proche), P16 (accord ou neutre), P17 (sans lien avec l'écart).
10 couples FR synthétiques ciblés, contrôle déterministe seul, `data_collection: deny`.

| Modèle | Couples | Rédigées | Retenues | Taux de rejet | Rejets forme / preuve | Coût | Latence P50 |
|---|---|---|---|---|---|---|---|
| Sonnet 5.5 | 3 | 20 | 5 | 75 % | 14 / 1 (P7 1) | 0,30 € | 11 s |
| GLM 5.3 Flash | 10 | 76 | 27 | 64 % | 36 / 13 (P7 7, P17 6, P13 2) | 0,02 € | 12 s |

Dépense réelle de l'essai : 0,31 $ (plafond 1,50 $).
Fiche : `blind-sheet.md` (20 questions sur des écarts : 15 GLM, 5 Sonnet),
correspondance `blind-key.json`, résumé `control-summary.json`.

Points relevés avant notation : deux questions identiques (n° 6 et 8, deux couples
différents) ; plusieurs reprises quasi littérales de l'exemple « Si votre partenaire
ne voulait finalement jamais d'enfant, resteriez-vous ? » ; n° 2 et 3 portent sur
« Disputes dans la famille d'origine », que le moteur classe comme risque partagé
(mêmes réponses) — le n° 3 (« élevait la voix ») frôle les sujets de sécurité.
