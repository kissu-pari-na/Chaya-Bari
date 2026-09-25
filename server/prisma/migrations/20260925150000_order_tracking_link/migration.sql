-- Public order tracking link, emailed once when an order is confirmed.
ALTER TABLE "Order" ADD COLUMN "trackingToken" TEXT;
ALTER TABLE "Order" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_trackingToken_key" ON "Order"("trackingToken");
