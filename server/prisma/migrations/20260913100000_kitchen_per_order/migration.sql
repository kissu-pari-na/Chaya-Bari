-- Kitchen now tracks preparation per order (Order.status) like a KDS, so the
-- per-product KitchenTask table and its status enum are no longer used.
DROP TABLE IF EXISTS "KitchenTask";
DROP TYPE IF EXISTS "KitchenStatus";
