-- Singleton business-profile settings (JSON blob), shared across clients.
CREATE TABLE "BusinessProfileSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BusinessProfileSetting_pkey" PRIMARY KEY ("id")
);
