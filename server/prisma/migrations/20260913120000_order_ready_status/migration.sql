-- Distinguish "ready" (all items cooked) from "packed" (physically packed) at
-- the order level. New OrderStatus value READY (between PREPARING and PACKED)
-- and its notification type.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY' BEFORE 'PACKED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ORDER_READY';
