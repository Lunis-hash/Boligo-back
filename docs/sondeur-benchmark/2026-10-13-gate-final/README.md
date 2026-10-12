# Seuil de 99 % — lot final held-out (mesuré une seule fois)

Corpus étiqueté `corpus-heldout/corpus.json`, lot final : 113 fautives, 120 valides. Couples synthétiques. Dépense réelle : 0,024 $.

| Chaîne | Fautives rejetées | Valides acceptées | Fuites acceptées |
|---|---|---|---|
| Contrôle déterministe seul | 81,4 % | 50,0 % | 1 |
| Contrôle + relecteur GLM (rédacteur Sonnet) | 97,3 % | 38,3 % | 0 |

Cible (≥ 99 % / ≥ 90 % / 0 fuite) **non atteinte**. Fautives qui passent encore : réciprocité (2/8) et hypothèse retournée (1/8).
2 groupes sur 30 sans relecture (aucun modèle disponible), comptés comme refusés.
Les lignes « dev » de `gate-eval.json` ne sont pas significatives pour la chaîne avec relecteur : le lot de mise au point n'a pas été relu dans cet essai (voir `../2026-10-13-gate/`).
