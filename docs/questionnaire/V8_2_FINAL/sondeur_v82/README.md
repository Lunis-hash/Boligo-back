# Sondeur V8.2 — prototype hors application

Rien ici n'est exécuté par l'application. Le moteur et le Sondeur en service sont importés tels quels ; les données V8.2 (questions, gabarits natifs) sont ajoutées **en mémoire** pendant la simulation.

| Fichier | Rôle |
|---|---|
| `native-rules.ts` | 11 règles natives V8.2 (stratégie A) + gabarits + 4 questions neutres (stratégie B) |
| `native-tests.ts` → `native-tests-results.json` | 14 contrôles des règles natives |
| `evidence-contract.ts` | Contrat de preuves et validateur déterministe (P1–P14) |
| `validator-corpus.ts`, `heldout*-corpus.json` | Corpus de recette (initial ; indépendants 1 et 2 = réglage ; indépendant 3 = mesure finale, jamais vu) |
| `final-measure.sha256` | Empreintes du corpus 3 et du validateur figés avant la mesure finale |
| `eval-all.ts` → `eval-all.json` | Mesure du validateur sur tous les corpus |
| `gen_couples.py` → `couples.json` | Couples simulés (compatible / partiel / incompatible) |
| `sim.ts` → `sim-results.json` | Simulation V7.1 · V8.2 · A · B · A+B sur le code en service |
| `build_proposal.py` | Génère `../BOLIGO_V8_2_SONDEUR_PROPOSITION_TECHNIQUE.docx` depuis les résultats bruts |

Reproduire (depuis la racine du dépôt, après `node docs/questionnaire/V8_2_FINAL/preuves/hist.js <commits>` pour `hist.json`) :

```bash
python3 docs/questionnaire/V8_2_FINAL/sondeur_v82/gen_couples.py
O='{"module":"commonjs","esModuleInterop":true,"experimentalDecorators":true,"emitDecoratorMetadata":true}'
for f in native-tests validator-run eval-all sim; do npx ts-node --skipProject --transpile-only -O "$O" docs/questionnaire/V8_2_FINAL/sondeur_v82/$f.ts; done
python3 docs/questionnaire/V8_2_FINAL/sondeur_v82/build_proposal.py
```
