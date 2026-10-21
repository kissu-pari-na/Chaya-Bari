-- Wallet ledger + 5-step order flow (vault: wallet, orders D-ORD-003, delivery D-DLV-002).
--  * OrderStatus: READY and PACKED merge into PREPARING; a PACKED order keeps
--    the fact as Order.readyAt.
--  * PaymentMode: PREPAID -> PAY_FIRST, plus PAY_LATER.
--  * Delivery loses its own status machine (the order status is the one truth).
--  * Payment rows become WalletEntry rows; past orders get their charges so
--    every wallet balance starts out correct.

-- ---------------------------------------------------------------- orders
ALTER TABLE "Order" ADD COLUMN "readyAt" TIMESTAMP(3),
                    ADD COLUMN "dispatchedAt" TIMESTAMP(3);

UPDATE "Order" SET "readyAt" = "updatedAt" WHERE "status" = 'PACKED';
UPDATE "Order" SET "dispatchedAt" = "updatedAt" WHERE "status" = 'OUT_FOR_DELIVERY';

CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE WHEN "status"::text IN ('READY', 'PACKED') THEN 'PREPARING' ELSE "status"::text END
)::"OrderStatus_new";
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE TYPE "PaymentMode_new" AS ENUM ('PAY_FIRST', 'PAY_LATER', 'COD');
ALTER TABLE "Order" ALTER COLUMN "paymentMode" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "paymentMode" TYPE "PaymentMode_new" USING (
  CASE WHEN "paymentMode"::text = 'PREPAID' THEN 'PAY_FIRST' ELSE "paymentMode"::text END
)::"PaymentMode_new";
ALTER TYPE "PaymentMode" RENAME TO "PaymentMode_old";
ALTER TYPE "PaymentMode_new" RENAME TO "PaymentMode";
DROP TYPE "PaymentMode_old";
ALTER TABLE "Order" ALTER COLUMN "paymentMode" SET DEFAULT 'PAY_FIRST';

-- ---------------------------------------------------------------- wallet tables
CREATE TYPE "WalletEntryStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');
CREATE TYPE "WalletEntryType" AS ENUM ('ORDER_CHARGE', 'ORDER_REFUND', 'PAYMENT', 'ADJUSTMENT');

CREATE TABLE "WalletEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "orderId" TEXT,
    "type" "WalletEntryType" NOT NULL,
    "status" "WalletEntryStatus" NOT NULL DEFAULT 'CONFIRMED',
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod",
    "reference" TEXT,
    "note" TEXT,
    "source" "PaymentSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdByName" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "reviewNote" TEXT,
    CONSTRAINT "WalletEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletEntry_customerId_createdAt_idx" ON "WalletEntry"("customerId", "createdAt");
CREATE INDEX "WalletEntry_orderId_idx" ON "WalletEntry"("orderId");
CREATE INDEX "WalletEntry_status_idx" ON "WalletEntry"("status");
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WalletEntry" ADD CONSTRAINT "WalletEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WalletLimitGrant" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "couponId" TEXT,
    "code" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletLimitGrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WalletLimitGrant_customerId_expiresAt_idx" ON "WalletLimitGrant"("customerId", "expiresAt");
CREATE UNIQUE INDEX "WalletLimitGrant_customerId_couponId_key" ON "WalletLimitGrant"("customerId", "couponId");
ALTER TABLE "WalletLimitGrant" ADD CONSTRAINT "WalletLimitGrant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------- data: payments -> wallet entries
-- Every old payment row keeps its amount, method, reference, note and audit.
-- SUCCESS -> confirmed credit; PENDING -> pending claim; FAILED/VOID -> rejected;
-- REFUNDED (money returned to the customer) -> a confirmed debit adjustment.
INSERT INTO "WalletEntry" ("id", "customerId", "orderId", "type", "status", "amount", "method", "reference",
                           "note", "source", "createdAt", "createdById", "createdByName",
                           "reviewedAt", "reviewedById", "reviewedByName", "reviewNote")
SELECT 'mig_' || p."id",
       o."customerId",
       p."orderId",
       CASE WHEN p."status" = 'REFUNDED' THEN 'ADJUSTMENT' ELSE 'PAYMENT' END::"WalletEntryType",
       CASE p."status"
         WHEN 'SUCCESS' THEN 'CONFIRMED'
         WHEN 'REFUNDED' THEN 'CONFIRMED'
         WHEN 'PENDING' THEN 'PENDING'
         ELSE 'REJECTED'
       END::"WalletEntryStatus",
       CASE WHEN p."status" = 'REFUNDED' THEN -p."amount" ELSE p."amount" END,
       p."method",
       p."reference",
       CASE WHEN p."status" = 'REFUNDED' THEN COALESCE(p."note", 'Refund') ELSE p."note" END,
       p."source",
       p."createdAt",
       p."recordedById",
       p."recordedByName",
       p."voidedAt",
       p."voidedById",
       p."voidedByName",
       CASE WHEN p."status" = 'VOID' THEN COALESCE('Voided: ' || p."voidReason", 'Voided')
            WHEN p."status" = 'FAILED' THEN 'Rejected'
            ELSE NULL END
FROM "Payment" p
JOIN "Order" o ON o."id" = p."orderId";

-- The old admin screen could mark an order PAID by hand with no payment row.
-- Those orders were settled under the old rules, so credit the missing amount
-- (otherwise the charges below would show a debt the customer never had).
INSERT INTO "WalletEntry" ("id", "customerId", "orderId", "type", "status", "amount", "note", "source", "createdAt")
SELECT 'mig_gap_' || o."id",
       o."customerId",
       o."id",
       'PAYMENT',
       'CONFIRMED',
       o."total" - COALESCE(x."paid", 0),
       'Marked paid before the wallet existed',
       'ADMIN',
       o."updatedAt"
FROM "Order" o
LEFT JOIN LATERAL (
  SELECT SUM(e."amount") AS "paid" FROM "WalletEntry" e
  WHERE e."orderId" = o."id" AND e."status" = 'CONFIRMED'
) x ON TRUE
WHERE o."status" <> 'CANCELLED'
  AND o."paymentStatus" = 'PAID'
  AND ((o."paymentMode" = 'PAY_FIRST' AND o."status" <> 'PENDING')
       OR (o."paymentMode" = 'COD' AND o."status" = 'DELIVERED'))
  AND o."total" - COALESCE(x."paid", 0) > 0;

-- Charges for orders that were owed under the old rules:
--  * pay-first orders past PENDING (they could only be confirmed once fully paid);
--  * COD orders already delivered (collected, or still owed).
INSERT INTO "WalletEntry" ("id", "customerId", "orderId", "type", "status", "amount", "note", "source", "createdAt")
SELECT 'mig_charge_' || o."id",
       o."customerId",
       o."id",
       'ORDER_CHARGE',
       'CONFIRMED',
       -o."total",
       'Order ' || o."orderNumber",
       'SYSTEM',
       COALESCE(CASE WHEN o."paymentMode" = 'COD' THEN o."deliveredAt" END, o."createdAt")
FROM "Order" o
WHERE o."status" <> 'CANCELLED'
  AND ((o."paymentMode" = 'PAY_FIRST' AND o."status" <> 'PENDING')
       OR (o."paymentMode" = 'COD' AND o."status" = 'DELIVERED'));

-- Order payment status under the new model.
-- Pay-first orders past PENDING: settled if they were PAID, otherwise the
-- payment was voided/refunded after cooking started and the charge is a debt.
UPDATE "Order" o SET "paymentStatus" = CASE WHEN o."paymentStatus" = 'PAID' THEN 'PAID' ELSE 'ON_WALLET' END::"PaymentStatus"
WHERE o."status" <> 'CANCELLED' AND o."paymentMode" = 'PAY_FIRST' AND o."status" <> 'PENDING';

UPDATE "Order" o SET "paymentStatus" = CASE
    WHEN COALESCE((SELECT SUM(e."amount") FROM "WalletEntry" e
                   WHERE e."orderId" = o."id" AND e."type" = 'PAYMENT' AND e."status" = 'CONFIRMED'), 0) >= o."total"
      THEN 'PAID'::"PaymentStatus"
    ELSE 'ON_WALLET'::"PaymentStatus" END
WHERE o."status" = 'DELIVERED' AND o."paymentMode" = 'COD';

UPDATE "Order" o SET "paymentStatus" = 'PENDING'
WHERE o."status" NOT IN ('CANCELLED', 'DELIVERED')
  AND (o."paymentMode" = 'COD' OR (o."paymentMode" = 'PAY_FIRST' AND o."status" = 'PENDING'));

DROP TABLE "Payment";
DROP TYPE "PaymentTxnStatus";

-- ---------------------------------------------------------------- delivery: no separate status machine
DROP INDEX IF EXISTS "Delivery_status_idx";
ALTER TABLE "Delivery" DROP COLUMN "status";
DROP TYPE "DeliveryStatus";

-- ---------------------------------------------------------------- promo codes that raise the pay-later limit
ALTER TABLE "Coupon" ADD COLUMN "limitDays" INTEGER,
                     ADD COLUMN "maxRedemptions" INTEGER;
ALTER TABLE "WalletLimitGrant" ADD CONSTRAINT "WalletLimitGrant_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------- default pay-later limit (admin-editable)
ALTER TABLE "OrderingSetting" ADD COLUMN "walletCreditLimit" DECIMAL(10,2) NOT NULL DEFAULT 100;
