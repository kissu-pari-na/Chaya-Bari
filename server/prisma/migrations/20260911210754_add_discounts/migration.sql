/*
  Warnings:

  - Added the required column `listUnitPrice` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CouponScope" AS ENUM ('FOOD', 'DELIVERY');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FIXED', 'FREE_DELIVERY');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "deliveryDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "productDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "listUnitPrice" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "salePrice" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "scope" "CouponScope" NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minOrderSubtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
