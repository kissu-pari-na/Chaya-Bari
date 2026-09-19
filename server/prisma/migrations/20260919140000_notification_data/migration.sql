-- Structured payload for client-side localization of notifications (a message
-- key + params). The existing title/body remain as the Bengali fallback.
ALTER TABLE "Notification" ADD COLUMN "data" JSONB;
