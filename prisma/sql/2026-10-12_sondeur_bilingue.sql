-- BOLIGO : Sondeur bilingue (version anglaise de chaque question servie).
-- Migration ADDITIVE : deux colonnes nullables, aucune donnée modifiée. Une
-- question sans version anglaise est servie en français. Rejouable sans effet.
-- Base BOLIGO uniquement. À APPLIQUER AVANT LE DÉPLOIEMENT du code qui l'utilise.

ALTER TABLE "HarmonyQuestion" ADD COLUMN IF NOT EXISTS "questionTextEn" TEXT;
ALTER TABLE "HarmonyQuestion" ADD COLUMN IF NOT EXISTS "optionsEn" JSONB;
