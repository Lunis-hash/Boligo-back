-- BOLIGO : régions des villes pour les périmètres « Près de chez moi » et
-- « Même région » de la Découverte. Migration ADDITIVE, rejouable sans effet.
-- Base BOLIGO uniquement. À APPLIQUER AVANT LE DÉPLOIEMENT.

CREATE TABLE IF NOT EXISTS "GeoRegion" (
    "key" TEXT NOT NULL,
    "region" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GeoRegion_pkey" PRIMARY KEY ("key")
);

-- Table privée : lue seulement par l'API.
ALTER TABLE "GeoRegion" ENABLE ROW LEVEL SECURITY;
