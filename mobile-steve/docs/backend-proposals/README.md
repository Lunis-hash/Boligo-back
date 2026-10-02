# Propositions de correctifs backend (`Boligo-back`)

> **Mise à jour (2026-10-02)** : sur demande explicite, ces cinq correctifs ont été
> **appliqués sur la branche `claude/magical-keller-kw9t2c` de `Boligo-back`**
> (commits `dde576a`, `3e50a6e`, `384757f`, `d1262e5`, `73ec406`), avec en plus le
> moteur de divergences, le Sondeur ciblé et le durcissement des routes de parcours
> (voir `docs/BOLIGO_MOTEUR_COMPATIBILITE.md` à la racine du dépôt). `main` reste intact :
> la fusion vers `main`, donc le déploiement Render, reste une décision humaine.

Les fichiers ci-dessous sont conservés comme trace. Pour appliquer sur `main`, depuis la
racine de `Boligo-back` :

```bash
git apply --check docs/backend-proposals/<fichier>.patch   # vérification
git apply docs/backend-proposals/<fichier>.patch           # application
```

Les cinq patchs ont été vérifiés : ils s'appliquent proprement sur `main`
(`e58a986`) et le projet compile (`tsc -p tsconfig.build.json`) une fois le
correctif de build appliqué.

| Patch | Priorité | Objet |
|---|---|---|
| `admin-service-build-fix.patch` | **P0** | `main` ne compile pas (`admin.service.ts`) : les déploiements Render échouent, la production reste sur `0046ad8`. |
| `account-status-enforcement.patch` | **P0 sécurité** | Un compte `suspendu` peut toujours se connecter et utiliser l'API (prouvé en local : login 200, `/profile/me` 200). Refus 403 au login et à la validation du JWT. |
| `sondeur-day-gating.patch` | P1 métier | Le serveur accepte les 21 réponses d'une traite ; applique la règle « 7 questions par jour » (jour calendaire), vérifie l'appartenance au parcours et interdit la double réponse. |
| `discover-strict-filters-real-details.patch` | P1 métier | La Découverte repliait sur **tous** les profils quand les filtres du Module 0 ne laissaient personne, et affichait des données **inventées** (situation, enfants, études, distance, « nuance de rythme »). Filtres stricts, détails lus dans l'entretien, point de vigilance issu du score. |
| `interview-questions-enrichment.patch` | P2 produit | 7 questions ciblées (substances, polygamie, dettes, téléphone/confiance, réconciliation, temps ensemble, gestion des divergences) + coquille « m'excluser ». Voir `docs/AUDIT_METIER.md` § 2. |
