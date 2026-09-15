import { Prisma, type Product, type ProductCategory } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../utils/httpError.js'
import {
  getProductRatingSummary,
  getRatingSummariesByProduct,
  type RatingSummary,
} from '../reviews/review.service.js'
import type {
  CreateCategoryInput,
  CreateProductInput,
  UpdateCategoryInput,
  UpdateProductInput,
} from './product.schemas.js'

export interface PublicProduct {
  id: string
  name: string
  nameEnglish: string | null
  description: string | null
  imageUrl: string | null
  price: number
  salePrice: number | null
  isActive: boolean
  isAvailable: boolean
  prepInfo: string | null
  categoryId: string | null
  categoryName: string | null
  /// Average star rating (0 when no reviews) and how many reviews it has.
  avgRating: number
  reviewCount: number
}

type ProductWithCategory = Product & { category: ProductCategory | null }

const NO_RATING: RatingSummary = { average: 0, count: 0 }

function toPublicProduct(p: ProductWithCategory, rating: RatingSummary = NO_RATING): PublicProduct {
  return {
    id: p.id,
    name: p.name,
    nameEnglish: p.nameEnglish,
    description: p.description,
    imageUrl: p.imageUrl,
    price: Number(p.price),
    salePrice: p.salePrice ? Number(p.salePrice) : null,
    isActive: p.isActive,
    isAvailable: p.isAvailable,
    prepInfo: p.prepInfo,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    avgRating: rating.average,
    reviewCount: rating.count,
  }
}

// ---- Categories ----

export async function listCategories(onlyActive: boolean) {
  const categories = await prisma.productCategory.findMany({
    where: onlyActive ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return categories
}

export async function createCategory(input: CreateCategoryInput) {
  return prisma.productCategory.create({ data: input })
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryOrThrow(id)
  return prisma.productCategory.update({ where: { id }, data: input })
}

export async function deleteCategory(id: string) {
  await getCategoryOrThrow(id)
  // Products keep existing; their categoryId is set null via the relation.
  await prisma.productCategory.delete({ where: { id } })
}

async function getCategoryOrThrow(id: string) {
  const category = await prisma.productCategory.findUnique({ where: { id } })
  if (!category) throw HttpError.notFound('Category not found')
  return category
}

// ---- Products ----

interface ListProductOptions {
  categoryId?: string
  /// When false, only active products are returned (customer view). Unavailable
  /// (sold-out) products are still listed so the UI can show them as sold out;
  /// inactive products are hidden entirely.
  includeHidden: boolean
}

export async function listProducts(options: ListProductOptions): Promise<PublicProduct[]> {
  const where: Prisma.ProductWhereInput = {}
  if (options.categoryId) where.categoryId = options.categoryId
  if (!options.includeHidden) {
    where.isActive = true
  }

  const products = await prisma.product.findMany({
    where,
    include: { category: true },
    orderBy: [{ createdAt: 'desc' }],
  })
  const ratings = await getRatingSummariesByProduct(products.map((p) => p.id))
  return products.map((p) => toPublicProduct(p, ratings.get(p.id) ?? NO_RATING))
}

export async function getProduct(id: string, includeHidden: boolean): Promise<PublicProduct> {
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } })
  if (!product) throw HttpError.notFound('Product not found')
  if (!includeHidden && !product.isActive) throw HttpError.notFound('Product not found')
  const rating = await getProductRatingSummary(product.id)
  return toPublicProduct(product, rating)
}

/// Ensures a sale price, when present, is below the (effective) list price.
function assertSalePrice(salePrice: number | null | undefined, price: number) {
  if (salePrice != null && salePrice >= price) {
    throw HttpError.badRequest('Sale price must be below the regular price')
  }
}

export async function createProduct(input: CreateProductInput): Promise<PublicProduct> {
  if (input.categoryId) await getCategoryOrThrow(input.categoryId)
  assertSalePrice(input.salePrice, input.price)

  const product = await prisma.product.create({
    data: {
      name: input.name,
      nameEnglish: input.nameEnglish,
      description: input.description,
      imageUrl: input.imageUrl,
      price: new Prisma.Decimal(input.price),
      salePrice: input.salePrice != null ? new Prisma.Decimal(input.salePrice) : null,
      categoryId: input.categoryId,
      prepInfo: input.prepInfo,
      isActive: input.isActive ?? true,
      isAvailable: input.isAvailable ?? true,
      priceHistory: { create: { price: new Prisma.Decimal(input.price) } },
    },
    include: { category: true },
  })
  return toPublicProduct(product)
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<PublicProduct> {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Product not found')
  if (input.categoryId) await getCategoryOrThrow(input.categoryId)

  const priceChanged = input.price !== undefined && !existing.price.equals(new Prisma.Decimal(input.price))

  // Validate sale price against the resulting list price.
  if (input.salePrice !== undefined) {
    const effectivePrice = input.price ?? Number(existing.price)
    assertSalePrice(input.salePrice, effectivePrice)
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      nameEnglish: input.nameEnglish,
      description: input.description,
      imageUrl: input.imageUrl,
      price: input.price !== undefined ? new Prisma.Decimal(input.price) : undefined,
      salePrice:
        input.salePrice === undefined
          ? undefined
          : input.salePrice === null
            ? null
            : new Prisma.Decimal(input.salePrice),
      categoryId: input.categoryId,
      prepInfo: input.prepInfo,
      isActive: input.isActive,
      isAvailable: input.isAvailable,
      // Log the new price only when it actually changed.
      ...(priceChanged
        ? { priceHistory: { create: { price: new Prisma.Decimal(input.price!) } } }
        : {}),
    },
    include: { category: true },
  })
  return toPublicProduct(product)
}

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw HttpError.notFound('Product not found')
  await prisma.product.delete({ where: { id } })
}
