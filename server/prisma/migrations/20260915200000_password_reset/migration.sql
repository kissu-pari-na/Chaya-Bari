-- Password-reset codes reuse the verification-code infrastructure via a new
-- channel value (idempotent; not used in this same migration).
ALTER TYPE "VerificationChannel" ADD VALUE IF NOT EXISTS 'PASSWORD_RESET';
