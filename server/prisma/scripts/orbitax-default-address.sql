-- Backfill: give existing Orbitax staff (accounts on the orbitax.com domain)
-- their office address as the default delivery address.
--
-- Safe to run more than once: it only inserts for customers on the orbitax.com
-- domain who currently have NO saved address, so it never creates duplicates
-- and never overrides an address a user already added.
--
-- The default address for these users is:
--   Recipient name : the user's name
--   Phone          : the user's phone (empty string if none on file)
--   Address        : Orbitax Bd Ltd, 9th floor, Raowa Club, Mohakhali
--   Area           : Mohakhali Dohs
--   City           : Dhaka
--
-- Run it in the Supabase SQL editor (or psql) against the app database.
-- Table/column names are quoted because Prisma creates them in PascalCase.

-- Optional: preview who would be affected before inserting.
-- SELECT u.email, u.name, u.phone
-- FROM "Customer" c
-- JOIN "User" u ON u.id = c."userId"
-- WHERE (lower(u.email) LIKE '%@orbitax.com' OR lower(u.email) LIKE '%.orbitax.com')
--   AND NOT EXISTS (SELECT 1 FROM "Address" a WHERE a."customerId" = c.id);

INSERT INTO "Address" (
  id,
  "customerId",
  label,
  "recipientName",
  "recipientPhone",
  "addressLine",
  area,
  city,
  "isDefault",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c.id,
  'Office',
  u.name,
  COALESCE(u.phone, ''),
  'Orbitax Bd Ltd, 9th floor, Raowa Club, Mohakhali',
  'Mohakhali Dohs',
  'Dhaka',
  true,
  now(),
  now()
FROM "Customer" c
JOIN "User" u ON u.id = c."userId"
WHERE (lower(u.email) LIKE '%@orbitax.com' OR lower(u.email) LIKE '%.orbitax.com')
  AND NOT EXISTS (
    SELECT 1 FROM "Address" a WHERE a."customerId" = c.id
  );
