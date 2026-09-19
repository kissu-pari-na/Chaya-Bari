-- Guest ordering: allow orders placed without a registered account. The
-- customer link becomes optional and guest contact is kept in the existing
-- address snapshot (recipientName / recipientPhone) plus an optional email.
ALTER TABLE "Order" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "Order" ADD COLUMN "guestEmail" TEXT;
