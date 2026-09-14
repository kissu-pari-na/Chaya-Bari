-- Per-line kitchen stage: each order line (product within an order) tracks its
-- own prep stage; the order status is derived from its lines.
CREATE TYPE "KitchenLineStage" AS ENUM ('TO_COOK', 'PREPARING', 'READY');

ALTER TABLE "OrderItem" ADD COLUMN "kitchenStage" "KitchenLineStage" NOT NULL DEFAULT 'TO_COOK';

-- Backfill existing lines from their order's current status.
UPDATE "OrderItem" oi SET "kitchenStage" = 'PREPARING'
  FROM "Order" o WHERE oi."orderId" = o.id AND o.status = 'PREPARING';
UPDATE "OrderItem" oi SET "kitchenStage" = 'READY'
  FROM "Order" o WHERE oi."orderId" = o.id AND o.status IN ('PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED');
