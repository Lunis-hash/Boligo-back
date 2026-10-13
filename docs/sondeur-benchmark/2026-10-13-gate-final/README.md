# Seuil de 99 % — lot final held-out (mesuré une seule fois)

Corpus étiqueté `corpus-heldout/corpus.json`, lot final : 113 fautives, 120 valides. Couples synthétiques. Dépense réelle : 0,024 $ (première mesure) + 0,022 $ (mesure corrigée).

| Chaîne | Fautives rejetées | Valides acceptées | Fuites acceptées |
|---|---|---|---|
| Contrôle déterministe seul | 75,2 % | 58,3 % | 1 |
| Contrôle + relecteur GLM (rédacteur Sonnet) | 97,3 % | 47,5 % | 0 |

**Correction** : la première mesure publiée (81,4 % / 50,0 % puis 97,3 % / 38,3 %) reconstituait mal 4 couples tenus à l'écart (T70188, T70459, T70462, T70485 : liste `BENCH_HELDOUT_TOPICS` erronée). Mesure refaite avec la liste d'origine (`enfants,argent,lieu de vie,famille,intimité,religion`), code inchangé, avant tout nouveau réglage. Ce lot est désormais consommé.

Cible (≥ 99 % / ≥ 90 % / 0 fuite) **non atteinte**. Fautives qui passent encore : réciprocité (2/8) et hypothèse retournée (1/8).
2 groupes sur 30 sans relecture (aucun modèle disponible), comptés comme refusés.
Les lignes « dev » de `gate-eval.json` ne sont pas significatives pour la chaîne avec relecteur : le lot de mise au point n'a pas été relu dans cet essai (voir `../2026-10-13-gate/`).
