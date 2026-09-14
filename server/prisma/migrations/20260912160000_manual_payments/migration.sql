-- Add PaymentSource enum
CREATE TYPE "PaymentSource" AS ENUM ('ADMIN', 'CUSTOMER');

-- Extend PaymentMethod: add NAGAD, ROCKET, BANK and remove COD (unused).
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'NAGAD';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'ROCKET';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK';

-- Extend NotificationType with manual-payment lifecycle types.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REJECTED';

-- Add source column to Payment.
ALTER TABLE "Payment" ADD COLUMN "source" "PaymentSource" NOT NULL DEFAULT 'ADMIN';
