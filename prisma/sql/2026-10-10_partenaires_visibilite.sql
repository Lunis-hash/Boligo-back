-- BOLIGO : lien partenaire suivi (?p=CODE) et offres des marques.
-- Migration ADDITIVE : rien n'est supprimé ni modifié. Rejouable sans effet.
-- Base BOLIGO uniquement. À APPLIQUER AVANT LE DÉPLOIEMENT.

DO $$ BEGIN CREATE TYPE "OfferPlacement" AS ENUM ('OFFRES', 'PARTENAIRE_DU_MOIS'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCodeId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "PartnerDailyStat" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PartnerDailyStat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerOffer" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "placement" "OfferPlacement" NOT NULL DEFAULT 'OFFRES',
    "title" TEXT NOT NULL,
    "perk" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "perkCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PartnerOfferStat" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PartnerOfferStat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerDailyStat_promoCodeId_day_key" ON "PartnerDailyStat"("promoCodeId", "day");
CREATE INDEX IF NOT EXISTS "PartnerOffer_isActive_placement_idx" ON "PartnerOffer"("isActive", "placement");
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerOfferStat_offerId_day_key" ON "PartnerOfferStat"("offerId", "day");

DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_referralCodeId_fkey" FOREIGN KEY ("referralCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PartnerDailyStat" ADD CONSTRAINT "PartnerDailyStat_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PartnerOffer" ADD CONSTRAINT "PartnerOffer_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PartnerOfferStat" ADD CONSTRAINT "PartnerOfferStat_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "PartnerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables privées : lues seulement par l'API, jamais par les clés publiques.
ALTER TABLE "PartnerDailyStat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerOfferStat" ENABLE ROW LEVEL SECURITY;
