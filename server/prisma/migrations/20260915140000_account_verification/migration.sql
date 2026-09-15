-- Account confirmation (email-based). Written idempotently so it can be safely
-- re-run after a partially-applied/failed deploy (each step is guarded).

-- Verification channel enum.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationChannel') THEN
    CREATE TYPE "VerificationChannel" AS ENUM ('PHONE', 'EMAIL');
  END IF;
END $$;

-- Confirmation timestamps on the user.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather existing accounts as confirmed so current logins keep working
-- (they predate this feature). Only touch rows not already stamped.
UPDATE "User" SET "phoneVerifiedAt" = now() WHERE "phoneVerifiedAt" IS NULL;
UPDATE "User" SET "emailVerifiedAt" = now() WHERE "emailVerifiedAt" IS NULL;

-- Resolve any pre-existing duplicate phone numbers (e.g. test accounts sharing
-- a number) so the unique index can be built. Keep the phone on one account
-- per number (the lexicographically-smallest id) and null it on the rest. No
-- account is deleted, and phone is nullable, so this is non-destructive.
UPDATE "User" u
SET "phone" = NULL
WHERE u."phone" IS NOT NULL
  AND u."id" <> (SELECT MIN(u2."id") FROM "User" u2 WHERE u2."phone" = u."phone");

-- One phone number per account (nulls allowed for phone-less staff).
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;

-- One-time confirmation codes.
CREATE TABLE IF NOT EXISTS "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "VerificationCode_userId_channel_idx" ON "VerificationCode"("userId", "channel");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VerificationCode_userId_fkey') THEN
    ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
