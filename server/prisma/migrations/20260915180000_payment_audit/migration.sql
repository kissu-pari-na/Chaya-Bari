-- Payments are never hard-deleted; add a VOID status and audit columns so a
-- mistaken payment is voided and a returned one gets an offsetting REFUNDED
-- row, each recording who did it (idempotent).

-- New enum value (safe if it already exists; not used in this same migration).
ALTER TYPE "PaymentTxnStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- Audit columns (snapshots of the acting admin + void metadata).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "recordedByName" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voidedAt" TIMESTAMP(3);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voidedById" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voidedByName" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "voidReason" TEXT;
