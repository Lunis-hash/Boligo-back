# Grand Entretien V8.2 — version finale (conception)

Documents finaux (Word) :

| Fichier | SHA-256 |
|---|---|
| BOLIGO_Grand_Entretien_V8_2_FINAL_ENGLISH.docx | `15d636a7b3c9ca22faf47f9efaffe3e3130cd80f8343044193716a3b4dabf1e2` |
| BOLIGO_Grand_Entretien_V8_2_FINAL_FRANCAIS.docx | `76bd849f52b2191f055ea82ce59f53e9e7e20d3ef987f3b5fdacb9790ca79396` |
| BOLIGO_V8_2_RAPPORT_DE_VALIDATION.docx | `5f03ba549fae4fdf06a424dfd6a99903b5993ad3e7b82db06225dc58590a3aee` |
| BOLIGO_V8_2_SPECIFICATIONS_TECHNIQUES_FINAL.docx | `f0c98ab703390a45f11a5c33dd22da85258d81d1c4768b8f7bb15c72bcbcba0c` |

Statut : conception finalisée, **non intégrée, non déployée**. Le Sondeur et le moteur en service ne sont pas modifiés.

## Preuves (`preuves/`)

Tous les contrôles sont **documentaires ou de simulation** : aucun n'a été exécuté dans l'application réelle (API, base, interface).

- `items_base.py`, `model.py`, `classes.py` : source unique des 113 questions, des codes, des conditions, des règles de compatibilité, de la migration V7 → V8.2 et de la couche de compatibilité.
- `tests.py` → `results.json` : recette documentaire (70 contrôles), dont 22 cas de migration et le classement des 47 dépendances.
- `hist.js` : extrait les 13 versions historiques de `src/interview/questions.data.ts` depuis git (`hist.json`), base de la vérification des codes V7.
- `deps.json`, `depscan.py`, `dead.json` : inventaire des questions V7 retirées lues par le moteur, le Sondeur et les autres modules.
- `simpairs.py`, `sim_complement.py`, `simsondeur.ts` → `simsondeur.json` : exécution du moteur et du générateur du Sondeur **en service, non modifiés**, hors application, sur 300 couples simulés par configuration (réponses aléatoires, graines fixes). Mesure de capacité, pas d'usage réel.
- `build.py`, `html2docx2.py`, `slim2.py` : génération des quatre documents.

## Reproduire (depuis la racine du dépôt)

```bash
cd docs/questionnaire/V8_2_FINAL/preuves
node hist.js 37c6fa9 2c29450 488e713 12e33f8 bfb343d 5c73bab 9e72178 298b61b ecffb13 c90e370 be9374c f076f0f 50e7cf5
python3 tests.py            # 70 contrôles, 0 échec attendu
python3 build.py            # documents HTML dans sortie/ (identiques à la version livrée)
python3 simpairs.py && python3 sim_complement.py
cd ../../../.. && npx ts-node --skipProject --transpile-only -O '{"module":"commonjs","esModuleInterop":true,"experimentalDecorators":true,"emitDecoratorMetadata":true}' docs/questionnaire/V8_2_FINAL/preuves/simsondeur.ts
```

Données de base : la migration a aussi été vérifiée sur les réponses réelles (2 entretiens de test, lecture seule, distributions agrégées, 10/10/2026) ; ces données ne sont pas copiées ici.
