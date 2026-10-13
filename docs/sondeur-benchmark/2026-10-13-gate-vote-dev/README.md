# Mise au point (lot « dev » seulement) — contrôle renforcé, relecteur avec extrait, second avis

Chaîne : rédacteur Sonnet 5.5 → contrôle déterministe → relecteur GLM 5.3 Flash → second avis GPT‑5.6 Luna (tranche chaque refus du premier ; refus maintenu seulement si le second refuse aussi, règle de fond + extrait cité mot pour mot).

| Lot dev (56 fautives, 52 valides) | Fautives rejetées | Valides acceptées | Fuites |
|---|---|---|---|
| Contrôle seul, avant | 80,4 % | 78,8 % | 1 |
| Contrôle seul, après réglage | 94,6 % | 90,4 % | 0 |
| Chaîne complète (mesure intermédiaire, avant les 3 derniers réglages du contrôle) | 100 % | 80,8 % | 0 |

Coût de cette mesure : 0,028 $. Lignes « final » de `gate-eval.json` : non significatives (non relues).
