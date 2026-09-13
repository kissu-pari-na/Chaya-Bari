-- Move reviews to an order-based model: a review belongs to a delivered order,
-- optionally to a product within it (null productId = overall order review).

-- Existing reviews (dev demo data) have no order; reset the table.
DELETE FROM "Review";

-- Drop old (product, customer) uniqueness.
DROP INDEX IF EXISTS "Review_productId_customerId_key";

-- productId becomes optional (null = overall order review).
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;

-- Every review is tied to an order.
ALTER TABLE "Review" ADD COLUMN "orderId" TEXT NOT NULL;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One product review per (order, product); one overall (null product) per order.
CREATE UNIQUE INDEX "Review_orderId_productId_key" ON "Review"("orderId", "productId");
CREATE UNIQUE INDEX "Review_order_overall_key" ON "Review"("orderId") WHERE "productId" IS NULL;
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

-- Order: delivery time + review-invite bookkeeping.
ALTER TABLE "Order" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "reviewInviteSentAt" TIMESTAMP(3);

-- Notification: click-through link.
ALTER TABLE "Notification" ADD COLUMN "link" TEXT;

-- New notification type for the day-after-delivery review invite.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REVIEW_INVITE';
