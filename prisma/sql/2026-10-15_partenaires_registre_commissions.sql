-- BOLIGO : registre des commissions partenaires (taux figé à la vente,
-- reprise proportionnelle en cas de remboursement).
-- Migration ADDITIVE : une énumération et une table, puis reprise de
-- l'historique. Rejouable sans effet (ON CONFLICT). Base BOLIGO uniquement.
-- À APPLIQUER AVANT LE DÉPLOIEMENT du code qui l'utilise, APRÈS
-- 2026-10-14_partenaires_suspension_conversions.sql.

DO $$ BEGIN
  CREATE TYPE "PartnerCommissionKind" AS ENUM ('VENTE', 'REPRISE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PartnerCommission" (
  "id"              TEXT PRIMARY KEY,
  "partnerId"       TEXT NOT NULL REFERENCES "PartnerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "promoCodeId"     TEXT,
  "kind"            "PartnerCommissionKind" NOT NULL,
  "paymentRef"      TEXT NOT NULL,
  "idempotencyKey"  TEXT NOT NULL,
  "amountCents"     INTEGER NOT NULL,
  "ratePercent"     INTEGER NOT NULL,
  "commissionCents" INTEGER NOT NULL,
  "saleId"          TEXT,
  "reason"          TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PartnerCommission_idempotencyKey_key" ON "PartnerCommission"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "PartnerCommission_partnerId_kind_idx" ON "PartnerCommission"("partnerId", "kind");
CREATE INDEX IF NOT EXISTS "PartnerCommission_paymentRef_idx" ON "PartnerCommission"("paymentRef");
ALTER TABLE "PartnerCommission" ENABLE ROW LEVEL SECURITY;

-- Historique : ventes payées avant ce registre. Le taux du jour de la vente
-- n'était pas conservé : le taux actuel du partenaire est figé maintenant.
INSERT INTO "PartnerCommission" ("id", "partnerId", "promoCodeId", "kind", "paymentRef",
  "idempotencyKey", "amountCents", "ratePercent", "commissionCents", "reason", "createdAt")
SELECT gen_random_uuid()::text, p."id", t."promoCodeId", 'VENTE', t."paymentRef",
  t."paymentRef" || ':vente', ROUND(t."euroAmount" * 100)::int, COALESCE(p."commissionRate", 0),
  ROUND(ROUND(t."euroAmount" * 100) * COALESCE(p."commissionRate", 0) / 100.0)::int,
  'Reprise de l''historique (taux du partenaire au moment de la migration)', t."date"
FROM "CreditTransaction" t
JOIN "PartnerApplication" p ON p."promoCodeId" = t."promoCodeId"
WHERE t."type" = 'achat' AND t."euroAmount" > 0 AND t."paymentRef" IS NOT NULL
ON CONFLICT ("idempotencyKey") DO NOTHING;

-- Remboursements déjà enregistrés : reprise au prorata.
INSERT INTO "PartnerCommission" ("id", "partnerId", "promoCodeId", "kind", "paymentRef",
  "idempotencyKey", "amountCents", "ratePercent", "commissionCents", "saleId", "reason", "createdAt")
SELECT gen_random_uuid()::text, v."partnerId", v."promoCodeId", 'REPRISE', v."paymentRef",
  v."paymentRef" || ':reprise:historique:' || r."id", ROUND(-r."euroAmount" * 100)::int, v."ratePercent",
  -LEAST(v."commissionCents", ROUND(v."commissionCents" * (-r."euroAmount" * 100) / NULLIF(v."amountCents", 0))::int),
  v."id", 'Reprise de l''historique : remboursement', r."date"
FROM "CreditTransaction" r
JOIN "PartnerCommission" v ON v."kind" = 'VENTE' AND v."paymentRef" = split_part(r."paymentRef", ':', 1)
WHERE r."type" = 'remboursement_paiement' AND r."euroAmount" < 0
ON CONFLICT ("idempotencyKey") DO NOTHING;
