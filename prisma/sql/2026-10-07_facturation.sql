-- BOLIGO : facturation (paiements, factures, avoirs, rétractation).
-- Migration ADDITIVE : rien n'est supprimé ni modifié, seules de nouvelles
-- tables et une nouvelle valeur d'énumération sont créées. Rejouable sans
-- effet. Base BOLIGO uniquement.
-- À APPLIQUER AVANT LE DÉPLOIEMENT : la valeur « remboursement_paiement » est
-- lue par les pages partenaires, même sans BILLING_ENABLED. Les tables, elles,
-- ne servent qu'avec BILLING_ENABLED=true.

-- CreateEnum
DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('en_attente', 'reussi', 'rembourse', 'rembourse_partiel', 'conteste'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InvoiceKind" AS ENUM ('facture', 'avoir'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "InvoiceStatus" AS ENUM ('a_emettre', 'emise', 'erreur'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum
DO $$ BEGIN CREATE TYPE "WithdrawalStatus" AS ENUM ('recue', 'remboursee', 'refusee'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'remboursement_paiement';

-- CreateTable
CREATE TABLE IF NOT EXISTS "BillingProfile" (
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "name" TEXT,
    "line1" TEXT,
    "line2" TEXT,
    "postalCode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" VARCHAR(2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "stripePaymentIntentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'en_attente',
    "planId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "listAmountCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER,
    "taxCountry" VARCHAR(2),
    "customerCountry" VARCHAR(2),
    "cardCountry" VARCHAR(2),
    "promoCodeId" TEXT,
    "termsVersion" TEXT,
    "earlyStartConsentAt" TIMESTAMP(3),
    "earlyStartConsentText" TEXT,
    "refundedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "succeededAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "kind" "InvoiceKind" NOT NULL DEFAULT 'facture',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'a_emettre',
    "idempotencyKey" TEXT NOT NULL,
    "number" TEXT,
    "stripeObjectId" TEXT,
    "paymentId" TEXT NOT NULL,
    "originalInvoiceId" TEXT,
    "userId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "currency" VARCHAR(3) NOT NULL,
    "totalExclTaxCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalInclTaxCents" INTEGER NOT NULL,
    "taxRatePercent" DECIMAL(6,3),
    "taxCountry" VARCHAR(2),
    "taxRegime" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerAddress" TEXT,
    "buyerCountry" VARCHAR(2),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'recue',
    "ackSentAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,
    "refundCents" INTEGER,
    "stripeRefundId" TEXT,
    "note" TEXT,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BillingProfile_stripeCustomerId_key" ON "BillingProfile"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_promoCodeId_idx" ON "Payment"("promoCodeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_idempotencyKey_key" ON "Invoice"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_stripeObjectId_key" ON "Invoice"("stripeObjectId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_paymentId_idx" ON "Invoice"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalRequest_stripeRefundId_key" ON "WithdrawalRequest"("stripeRefundId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_paymentId_idx" ON "WithdrawalRequest"("paymentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_userId_idx" ON "WithdrawalRequest"("userId");

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "BillingProfile" ADD CONSTRAINT "BillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Payment" ADD CONSTRAINT "Payment_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_originalInvoiceId_fkey" FOREIGN KEY ("originalInvoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey
DO $$ BEGIN ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables privées : lues seulement par l'API (connexion serveur), jamais par
-- les clés publiques de Supabase.
ALTER TABLE "BillingProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WithdrawalRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StripeEvent" ENABLE ROW LEVEL SECURITY;
