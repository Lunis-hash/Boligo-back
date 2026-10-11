-- BOLIGO : version durable du Grand Entretien (V7.1 / V8.2).
-- Migration ADDITIVE : une colonne nullable et un déclencheur. Aucune donnée
-- existante n'est modifiée : un entretien sans version est lu en V7.1.
-- Rejouable sans effet. Base BOLIGO uniquement (jamais une autre base).
-- À APPLIQUER AVANT LE DÉPLOIEMENT du code qui l'utilise.

ALTER TABLE "InterviewIA" ADD COLUMN IF NOT EXISTS "questionnaireVersion" TEXT;

-- Valeurs admises.
DO $$ BEGIN
  ALTER TABLE "InterviewIA" ADD CONSTRAINT "InterviewIA_questionnaireVersion_check"
    CHECK ("questionnaireVersion" IS NULL OR "questionnaireVersion" IN ('7.1', '8.2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Immuable : une version fixée ne change plus jamais (ni par le code, ni à la main).
CREATE OR REPLACE FUNCTION boligo_interview_version_immutable() RETURNS trigger AS $$
BEGIN
  IF OLD."questionnaireVersion" IS NOT NULL
     AND NEW."questionnaireVersion" IS DISTINCT FROM OLD."questionnaireVersion" THEN
    RAISE EXCEPTION 'questionnaireVersion est immuable (entretien %)', OLD."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "InterviewIA_questionnaireVersion_immutable" ON "InterviewIA";
CREATE TRIGGER "InterviewIA_questionnaireVersion_immutable"
  BEFORE UPDATE OF "questionnaireVersion" ON "InterviewIA"
  FOR EACH ROW EXECUTE FUNCTION boligo_interview_version_immutable();
