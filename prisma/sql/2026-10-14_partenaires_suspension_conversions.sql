-- BOLIGO : statut « suspendu » des partenaires et ventes confirmées des offres.
-- Migration ADDITIVE : une valeur d'énumération et une table. Aucune donnée
-- existante n'est modifiée. Rejouable sans effet. Base BOLIGO uniquement.
-- À APPLIQUER AVANT LE DÉPLOIEMENT du code qui l'utilise.

ALTER TYPE "PartnerStatus" ADD VALUE IF NOT EXISTS 'SUSPENDU';

CREATE TABLE IF NOT EXISTS "PartnerOfferConversion" (
  "id"           TEXT PRIMARY KEY,
  "offerId"      TEXT NOT NULL REFERENCES "PartnerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "month"        DATE NOT NULL,
  "conversions"  INTEGER NOT NULL,
  "revenueCents" INTEGER NOT NULL,
  "reference"    TEXT,
  "createdBy"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PartnerOfferConversion_offerId_idx" ON "PartnerOfferConversion"("offerId");
-- Même protection que les autres tables du projet (accès par l'API uniquement).
ALTER TABLE "PartnerOfferConversion" ENABLE ROW LEVEL SECURITY;
