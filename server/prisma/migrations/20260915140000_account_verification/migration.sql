-- Account confirmation (phone mandatory, email optional).

-- Verification channel enum.
CREATE TYPE "VerificationChannel" AS ENUM ('PHONE', 'EMAIL');

-- Confirmation timestamps on the user.
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather existing accounts as fully confirmed so current logins keep
-- working (they predate this feature).
UPDATE "User" SET "phoneVerifiedAt" = now(), "emailVerifiedAt" = now();

-- One phone number per account (nulls allowed for phone-less staff).
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone") WHERE "phone" IS NOT NULL;

-- One-time confirmation codes.
CREATE TABLE "VerificationCode" (
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
CREATE INDEX "VerificationCode_userId_channel_idx" ON "VerificationCode"("userId", "channel");
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
