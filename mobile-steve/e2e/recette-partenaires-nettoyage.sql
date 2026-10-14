-- Nettoyage INTÉGRAL des données de démonstration de la recette partenaires.
--
-- Cible uniquement ce que la recette crée :
--   · comptes et partenaires dont l'e-mail se termine par @boligo-demo.example
--     (domaine réservé « .example », jamais utilisé par un vrai membre) ;
--   · codes promo rattachés à ces partenaires (tous préfixés « DEMO »).
-- Les offres, statistiques et ventes confirmées partent en cascade avec les
-- partenaires ; les visites et inscriptions par jour avec les codes.
--
-- Une seule transaction : tout ou rien. Le bilan final doit afficher 0 partout.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f e2e/recette-partenaires-nettoyage.sql
-- En recette locale, le plus simple reste de supprimer la base jetable :
--   dropdb boligo_recette_partenaires

BEGIN;

CREATE TEMP TABLE demo_users ON COMMIT DROP AS
  SELECT id FROM "User" WHERE email LIKE '%@boligo-demo.example';
CREATE TEMP TABLE demo_codes ON COMMIT DROP AS
  SELECT "promoCodeId" AS id FROM "PartnerApplication"
  WHERE email LIKE '%@boligo-demo.example' AND "promoCodeId" IS NOT NULL;

-- Partenaires (offres, affichages, clics, ventes confirmées : en cascade).
DELETE FROM "PartnerApplication" WHERE email LIKE '%@boligo-demo.example';

-- Traces liées aux codes de démonstration.
DELETE FROM "PromoUsage" WHERE "promoCodeId" IN (SELECT id FROM demo_codes);
DELETE FROM "CreditTransaction" WHERE "promoCodeId" IN (SELECT id FROM demo_codes);
UPDATE "Payment" SET "promoCodeId" = NULL WHERE "promoCodeId" IN (SELECT id FROM demo_codes);
UPDATE "User" SET "referralCodeId" = NULL WHERE "referralCodeId" IN (SELECT id FROM demo_codes);

-- Toutes les lignes qui dépendent d'un compte de démonstration, à toute
-- profondeur (profil, entretien et ses réponses, notifications, transactions,
-- factures…) : les dépendances sont supprimées avant leurs parents.
CREATE FUNCTION pg_temp.purge(tbl regclass, cond text) RETURNS void AS $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS ctbl, a.attname AS ccol, pa.attname AS pcol
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    JOIN pg_attribute pa ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f' AND c.confrelid = tbl AND c.conrelid <> tbl
  LOOP
    PERFORM pg_temp.purge(r.ctbl, format('%I IN (SELECT %I FROM %s WHERE %s)', r.ccol, r.pcol, tbl, cond));
  END LOOP;
  EXECUTE format('DELETE FROM %s WHERE %s', tbl, cond);
END $$ LANGUAGE plpgsql;

SELECT pg_temp.purge('"User"', 'id IN (SELECT id FROM demo_users)');

DELETE FROM "PromoCode" WHERE id IN (SELECT id FROM demo_codes);

-- Bilan : doit afficher 0 / 0 / 0.
SELECT
  (SELECT count(*) FROM "User" WHERE email LIKE '%@boligo-demo.example') AS comptes_demo,
  (SELECT count(*) FROM "PartnerApplication" WHERE email LIKE '%@boligo-demo.example') AS partenaires_demo,
  (SELECT count(*) FROM "PromoCode" c WHERE c.id IN (SELECT id FROM demo_codes)) AS codes_demo;

COMMIT;
