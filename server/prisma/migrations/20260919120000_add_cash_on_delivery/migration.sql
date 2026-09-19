-- Cash on delivery: how an order is settled. PREPAID (the existing behaviour)
-- pays in advance and is gated on payment before confirmation; COD is collected
-- at the door, so it is not gated on prepayment. Existing orders default to
-- PREPAID so nothing changes for them.
CREATE TYPE "PaymentMode" AS ENUM ('PREPAID', 'COD');

ALTER TABLE "Order" ADD COLUMN "paymentMode" "PaymentMode" NOT NULL DEFAULT 'PREPAID';
