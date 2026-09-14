-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('PENDING', 'PREPARING', 'PREPARED', 'PACKED');

-- CreateTable
CREATE TABLE "KitchenTask" (
    "id" TEXT NOT NULL,
    "fulfillmentDate" DATE NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "status" "KitchenStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KitchenTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KitchenTask_fulfillmentDate_idx" ON "KitchenTask"("fulfillmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTask_fulfillmentDate_productId_key" ON "KitchenTask"("fulfillmentDate", "productId");

-- AddForeignKey
ALTER TABLE "KitchenTask" ADD CONSTRAINT "KitchenTask_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
