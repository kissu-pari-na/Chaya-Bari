-- Orders placed by an admin on behalf of an email. The customer gets a
-- placeholder account (no usable password) that whoever confirms that email
-- later takes over, inheriting every order placed for it.
ALTER TABLE "User" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;

-- Footprint: which admin placed an order on the customer's behalf.
ALTER TABLE "Order" ADD COLUMN "placedById" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_placedById_fkey"
  FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Guest orders are claimed by email when the owner confirms an account.
CREATE INDEX "Order_guestEmail_idx" ON "Order"("guestEmail");
