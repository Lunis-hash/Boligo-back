# Sondeur — repli déterministe (rédaction des questions par l'IA désactivée)

## État actuel
Depuis la mesure finale du 13/10/2026 (`docs/sondeur-benchmark/2026-10-13-v83b-final/`), **la rédaction des questions du Sondeur par l'IA est désactivée** :

```json
// config/sondeur-models.json
"generation": { "enabled": false, "disabledThemes": [], "disabledFrames": [] }
```

Raison : deux critères de Steve ne sont pas atteints sur le corpus final indépendant (98,9 % des fautives rejetées pour 100 % visé, 60,0 % des valides acceptées pour 90 % visé ; 0 fuite).

## Ce que voient les membres
Le Sondeur reste complet, réciproque et adaptatif : toutes les questions viennent des **questions déterministes déjà validées** (gabarits de BOLIGO : écarts, accords, limites de sécurité). Les lectures du jour, la relance adaptative et le bilan ne changent pas.

## Réglages disponibles (`config/sondeur-models.json`, clé `generation`)
| Réglage | Effet |
|---|---|
| `"enabled": false` | repli complet : l'IA ne rédige aucune question du Sondeur |
| `"disabledThemes": ["famille"]` | repli pour les écarts de ces thèmes seulement |
| `"disabledFrames": ["C03"]` | repli pour ces cadres seulement |

Le fichier est relu toutes les 5 minutes (pas de redéploiement de code nécessaire si le fichier est mis à jour avec l'application ; sur Render, il faut un nouveau déploiement de la branche, le fichier étant versionné).

## Réactiver l'IA
1. Mesurer d'abord sur un **nouveau** corpus indépendant (banc `scripts/sondeur-benchmark.ts gate-eval`, voir `docs/sondeur-benchmark/2026-10-13-v83b-final/README.md`).
2. Si les critères sont atteints : mettre `"enabled": true` (et vider `disabledThemes` / `disabledFrames`), committer, déployer.
3. Pour une réactivation partielle : `"enabled": true` et lister dans `disabledThemes` / `disabledFrames` ce qui reste en repli.

Test qui garantit le repli : `src/journey/sondeur-ai-layer.spec.ts` (« repli déterministe ») et `src/ai/sondeur-models.config.spec.ts` (« repli déterministe (generation) »).
