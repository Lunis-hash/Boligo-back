# Vérification des migrations partenaires (14/10/2026)

Migrations vérifiées :

- `prisma/sql/2026-10-14_partenaires_suspension_conversions.sql`
- `prisma/sql/2026-10-15_partenaires_registre_commissions.sql`

**Résultat : tous les contrôles réussis** (script `scripts/verifier-migrations-partenaires.sh`, code de sortie 0, deux passages complets). Les migrations ont été vérifiées sur des bases **jetables** PostgreSQL 16.15 locales (127.0.0.1:5433), supprimées à la fin. Aucune base distante n'a été touchée, et les migrations n'ont **pas** été appliquées en production.

## Rejouer

```bash
scripts/verifier-migrations-partenaires.sh            # PGHOST=127.0.0.1 PGPORT=5433 PGUSER=boligo REF=origin/main par défaut
```

Le garde-fou refuse tout `PGHOST` autre que `127.0.0.1`. Le script ignore `DATABASE_URL`, `DIRECT_URL` et `PGDATABASE`. Il ne crée et ne supprime que `boligo_jetable_migr_part` et `boligo_jetable_migr_part_inverse`.

## Méthode et résultats

| Étape | Contrôle | Résultat |
|---|---|---|
| (a) | Base au schéma d'avant : `prisma db push` du `schema.prisma` d'`origin/main` (07a9481), puis les 5 scripts SQL antérieurs au 14/10 (facturation, visibilité, régions, sondeur, version d'entretien) | OK : ni `PartnerCommission` ni `PartnerOfferConversion` |
| (b) | Données existantes réalistes : 4 codes promo (dont 1 hors partenaire), 4 membres (3 rattachés à un code), 4 partenaires (ambassadrice 20 %, marque sans commission, créatrice **refusée**, candidature nouvelle), 4 offres (en ligne, brouillon, programmée, expirée), 3 statistiques d'offre, 4 paiements (réussi, remboursé partiellement, remboursé, hors partenaire), 8 transactions (4 achats, 1 remboursement partiel, 1 total, 1 activation gratuite à 0 €, 1 consommation) | — |
| (c) | 1er passage dans l'ordre 14 → 15 | OK, sans erreur |
| (c) | 2e passage (idempotence) | OK, sans erreur (avis `already exists, skipping` uniquement). Nombres identiques : 5 lignes de commission, 0 conversion, 3 offres publiées. Énumérations identiques. Registre identique : même md5 hors `id` |
| (d) | Données d'avant : nombre de lignes et md5 de toutes les colonnes d'avant, sur les 7 tables (`User`, `PromoCode`, `PartnerApplication`, `PartnerOffer`, `PartnerOfferStat`, `Payment`, `CreditTransaction`), avant et après les deux passages | OK : identiques. `updatedAt` des offres est inchangé |
| (d) | `publishedAt` ajouté | Égal à `createdAt` pour les 3 offres `isActive = true` (y compris la programmée et l'expirée), NULL pour le brouillon |
| (d) | Reprise de l'historique | `pi_mig_1` VENTE 1350 c × 20 % = 270 ; `pi_mig_2` VENTE 270, puis REPRISE de 675 c à −135 (prorata 50 %) ; `pi_mig_3` (marque sans taux) VENTE 0 et REPRISE 0. Rien n'est créé pour l'activation gratuite, ni pour le code hors partenaire |
| (d) | `prisma migrate diff --from-url <base> --to-schema-datamodel prisma/schema.prisma --script` | `-- This is an empty migration.` : **aucun écart** |
| (e) | Ordre inverse 15 → 14 sur une 2e base jetable | Les deux sont **acceptées**. Le registre et le schéma sont identiques à ceux de l'ordre normal |

## Ordre requis

Il faut appliquer **2026-10-14 puis 2026-10-15**, comme l'indique l'en-tête de 2026-10-15, et les deux **avant** le déploiement du code.

L'ordre inverse fonctionne techniquement : 2026-10-15 n'utilise ni `SUSPENDU`, ni `publishedAt`, ni `PartnerOfferConversion`. Le résultat est alors identique. L'ordre 14 → 15 reste la règle documentée.

Prérequis :

- `gen_random_uuid()` (PostgreSQL ≥ 13 ; Supabase convient) ;
- `ALTER TYPE … ADD VALUE` exécuté hors d'une transaction qui utiliserait aussitôt `SUSPENDU`. Ne pas les envelopper dans un `BEGIN … COMMIT` avec du code qui s'en sert. `psql -f` suffit.

## Caractère additif : liste exacte des instructions

**Aucune instruction `DROP`, `DELETE` ni `TRUNCATE`.** Les deux seules occurrences de « DELETE » sont les clauses `ON DELETE CASCADE` des clés étrangères des **nouvelles** tables.

2026-10-14 :

1. `ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'SUSPENDU';`
2. `ALTER TABLE "PartnerOffer" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);` : colonne nullable, sans défaut.
3. **`UPDATE "PartnerOffer" SET "publishedAt" = "createdAt" WHERE "publishedAt" IS NULL AND "isActive" = true;`**
   - ⚠️ C'est la **seule écriture sur des lignes existantes** des deux migrations.
   - Elle ne renseigne que la nouvelle colonne. Toutes les colonnes d'avant restent identiques : md5 vérifié, `updatedAt` non modifié.
   - Elle est rejouable sans effet grâce à `publishedAt IS NULL`.
   - Au sens strict (« aucun UPDATE »), cette migration n'est donc **pas** purement additive : il s'agit d'un remplissage de la nouvelle colonne.
4. `CREATE TABLE IF NOT EXISTS "PartnerOfferConversion" (…)` : clé étrangère vers `PartnerOffer` avec `ON DELETE CASCADE ON UPDATE CASCADE`.
5. `CREATE INDEX IF NOT EXISTS "PartnerOfferConversion_offerId_idx" …`
6. `ALTER TABLE "PartnerOfferConversion" ENABLE ROW LEVEL SECURITY;` : nouvelle table uniquement.

2026-10-15 :

1. `DO $$ BEGIN CREATE TYPE "PartnerCommissionKind" AS ENUM ('VENTE','REPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
2. `CREATE TABLE IF NOT EXISTS "PartnerCommission" (…)` : clé étrangère vers `PartnerApplication` avec `ON DELETE CASCADE ON UPDATE CASCADE`.
3. Trois `CREATE [UNIQUE] INDEX IF NOT EXISTS` sur `PartnerCommission` (`idempotencyKey` unique, `(partnerId, kind)`, `paymentRef`).
4. `ALTER TABLE "PartnerCommission" ENABLE ROW LEVEL SECURITY;`
5. `INSERT INTO "PartnerCommission" … SELECT … FROM "CreditTransaction" JOIN "PartnerApplication" … WHERE type='achat' AND euroAmount > 0 AND paymentRef IS NOT NULL ON CONFLICT ("idempotencyKey") DO NOTHING;`
   - **Lecture seule** des tables existantes, écriture dans la nouvelle table uniquement.
6. `INSERT INTO "PartnerCommission" … SELECT … FROM "CreditTransaction" r JOIN "PartnerCommission" v … WHERE r.type='remboursement_paiement' AND r.euroAmount < 0 ON CONFLICT DO NOTHING;`
   - Idem : lecture seule des tables existantes.

## Points d'attention (non bloquants)

- **Taux de l'historique** : les ventes passées reçoivent le taux **actuel** du partenaire, puisque l'ancien n'était pas conservé. C'est voulu et documenté dans la migration. Une marque sans taux reçoit des lignes à 0 €.
- **Partenaire refusé** : ses ventes passées sont aussi reprises dans le registre, si elles existent. Le cas a été testé sans vente payante (activation à 0 €, ignorée).
- **Clés de reprise** : la reprise historique utilise `<pi>:reprise:historique:<id transaction>`, alors que le code utilise `<pi>:reprise:<cumul remboursé>`. Le code calcule la reprise d'après la **somme** des reprises déjà enregistrées (`src/partners/partner-commissions.ts`). Un remboursement ultérieur du même paiement ne reprend donc que la différence, sans doublon. Ce point a été vérifié à la lecture du code, pas par le script.
- **Arrondi** : chaque remboursement historique est plafonné individuellement à la commission de la vente. Avec plusieurs remboursements partiels d'un même paiement, l'arrondi peut dépasser la commission d'un centime au plus.
