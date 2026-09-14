-- Singleton payment-account settings shown to customers.
CREATE TABLE "PaymentSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bkash" TEXT,
    "nagad" TEXT,
    "rocket" TEXT,
    "bankInfo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentSetting_pkey" PRIMARY KEY ("id")
);
