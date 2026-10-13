# V8.3 (cadres validés) — NOUVEAU lot final tenu à l'écart (mesuré une seule fois)

Corpus `corpus-heldout3/corpus.json` : 353 questions (177 fautives, 176 valides ; 75 % FR, 25 % EN), couples inédits T110xxx (graines 110 000), rédigé par un annotateur indépendant sans accès au code et commité (b66ba89) avant toute mesure. Couples synthétiques uniquement. Dépense : 0,032 $.

Chaîne : rédacteur Sonnet 5.5 (cadres) → contrôle déterministe (cadre exact FR/EN, cases, anti-fuite) → relecteur GLM 5.3 Flash → second avis GPT‑5.6 Luna.

| Chaîne | Fautives rejetées | Valides acceptées | Fuites acceptées |
|---|---|---|---|
| Contrôle seul | 92,1 % | 91,5 % | **0** |
| Chaîne complète | **96,0 %** | **90,9 %** | **0** |
| Cible | 100 % | ≥ 90 % | 0 |

**Fuites : 0** (13 questions qui fuyaient, toutes rejetées). **Valides : 90,9 %** (cible atteinte). **Fautives : 96,0 %, cible de 100 % non atteinte.** Aucun réglage fait sur ce lot.

Fautives qui passent toute la chaîne (7) : effort à sens unique 4 (« vous effacer », « abandonnait ses loisirs », « quitter votre ville pour rejoindre quelqu'un », « retrouver un emploi au plus vite »), fait inventé 1 (« depuis un an »), intrusion 1 (« le lieu de culte fréquenté »), anglais divergent 1.
Valides refusées (16) : contrôle 15 (lien à l'écart F8 : 8, cohérence FR/EN F3 : 3, forme P8 : 3, hors cadre : 1), relecteur 1.

Historique : anciens lots (rédaction libre) 100 % des fautives rejetées et 0 % des valides sous V8.3 (hors cadre) ; mise au point `2026-10-13-v83-dev` : 100 % / 94,6 % / 0 fuite.
