-- New enum values used by the next migration. PostgreSQL can't use a value
-- added by ALTER TYPE ... ADD VALUE in the same transaction, so they get their
-- own migration.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ON_WALLET';
ALTER TYPE "CouponScope" ADD VALUE IF NOT EXISTS 'WALLET_LIMIT';
ALTER TYPE "PaymentSource" ADD VALUE IF NOT EXISTS 'SYSTEM';
