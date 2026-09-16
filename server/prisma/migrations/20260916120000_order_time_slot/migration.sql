-- Delivery time slot chosen at checkout (two-hour window for the fulfillment
-- day), stored as a canonical "HH:MM-HH:MM" value. Nullable so existing orders
-- placed before slots existed keep working.
ALTER TABLE "Order" ADD COLUMN "timeSlot" TEXT;
