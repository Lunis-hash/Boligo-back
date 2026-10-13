# V8.3 dernier cycle — mesure finale indépendante (une seule mesure)

Corpus `corpus-heldout4/corpus.json` : 350 questions (180 fautives, 170 valides ; 176 FR / 174 EN ; valides 85 FR / 85 EN), couples inédits T130xxx, rédigé par un annotateur indépendant sans accès au code, commité (063f391) avant tout test. Une seule mesure ; dépense de la mesure : 0,135 $.

Chaîne : rédacteur Sonnet 5.5 (18 cadres profonds) → contrôle déterministe → relecteur GLM 5.3 Flash → second avis GPT‑5.6 Luna. Juge à l'aveugle : Qwen 3.7 Plus (quatrième famille).

Note : l'annotateur a étiqueté les fautives « invalid » (et non « faulty ») ; le récapitulatif automatique (`gate-eval.json`) les a donc ignorées. Les chiffres ci-dessous sont recalculés **sans aucun nouvel appel** à partir des résultats enregistrés de cette mesure (`gate-eval-items.json`, `gate-eval-critic.json`, `gate-eval-judge.json`) ; détail dans `gate-eval-corrected.json`. Le banc accepte désormais « invalid ».

| Mesure (séparée) | Contrôle seul | Chaîne complète | Cible |
|---|---|---|---|
| Fautives rejetées | 94,4 % (170/180) | **98,9 % (178/180)** | 100 % |
| Valides acceptées | 61,8 % | **60,0 % (102/170)** | ≥ 90 % |
| Fuites acceptées | 0 | **0** | 0 |

Jugement à l'aveugle des 102 valides servies : présupposition jugée injustifiée 15,7 %, réciprocité 97,1 %, même sens FR/EN 99,0 %, profondeur 3,89/5, pertinence 4,93/5.

Par catégorie (chaîne complète) : 13 catégories sur 15 rejetées à 100 % ; sécurité 11/12 (« verres par jour… pour conduire après une soirée »), jugement moral 11/12 (« le devoir d'aimer tous les enfants comme les siens »).
Valides refusées : surtout par le contrôle (présupposé F5 21, cohérence FR/EN F3 13, lien à l'écart F8 11, ponctuation F4 6, forme P8 5…), 3 par le relecteur.

**Résultat : critères non atteints (fautives 98,9 % < 100 %, valides 60,0 % < 90 %). Décision : repli déterministe** (`config/sondeur-models.json` → `generation.enabled: false`, voir `docs/SONDEUR_REPLI.md`). Ce résultat sur un corpus de 350 questions n'est pas une garantie absolue.
