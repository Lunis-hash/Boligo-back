# Fiche n° 4 — GLM rédacteur (3 propositions par écart), Sonnet relecteur et escalade (2026-10-12)

Code au commit 54a7fc3. Relecteur : le premier d'une autre famille que le
rédacteur (Sonnet relit GLM ; GLM relit les réécritures de Sonnet). Escalade :
Sonnet 5.5 réécrit un jour vide ou presque. Plafond 0,80 $ atteint après
6 couples sur 10 (les 4 derniers n'ont pas été traités).

| Couple | Scénario | Rédigées (GLM) | Retenues | dont GLM | dont Sonnet (escalade) | Jours escaladés | Coût | Latence |
|---|---|---|---|---|---|---|---|---|
| T50125 enfants | non négociable | 18 | 3 | 2 | 1 | 2 | 0,15 € | 29 s |
| T50402 argent | petit écart | 0 | 0 | 0 | 0 | 0 | 0,10 € | 21 s |
| T50395 religion | écart important | 0 | 0 | 0 | 0 | 0 | 0,11 € | 19 s |
| T50602 lieu de vie | non négociable | 18 | 3 | 0 | 3 | 3 | 0,21 € | 41 s |
| T50603 carrière | non négociable | 18 | 3 | 1 | 2 | 2 | 0,17 € | 32 s |
| T50643 temps de couple | petit écart | 18 | 4 | 4 | 0 | 0 | 0,08 € | 47 s |

Total : 13 retenues ; GLM 7, Sonnet 6 (46 % des questions servies viennent de
l'escalade). Rejets sur les propositions de GLM : forme 44, preuves 27 (P17 13,
P7 6, P21 6, P13 3, P14 2, P19 1, P11 1), relecteur 28 (règles 5 : 9, 17 : 7,
19 : 5, 11 : 3, 3 : 2, 12 : 1, 8 : 1), doublons 2.
Coût réel : 0,73 $ (estimation interne 0,81 €). Latence P50 : 33 s par couple.

Règle 3 du relecteur : 2 refus seulement, sur des questions générales
(« Qu'est-ce que vous ne pourriez pas accepter dans la façon dont chacun voit le
déménagement ? », « Dans dix ans, si aucun de vous deux n'a déménagé, à quoi
ressemblerait votre quotidien ? »). Aucune bonne question concrète rejetée.
