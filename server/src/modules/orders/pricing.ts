import { Prisma, type Coupon, type Product } from '@prisma/client'
import { HttpError } from '../../utils/httpError.js'

const ZERO = new Prisma.Decimal(0)

export interface PricedLine {
  productId: string
  productName: string
  listUnitPrice: Prisma.Decimal
  unitPrice: Prisma.Decimal
  quantity: number
  lineTotal: Prisma.Decimal
}

export interface PricedOrder {
  lines: PricedLine[]
  /// Gross food total at list prices.
  subtotal: Prisma.Decimal
  /// Food discount = per-item sale reductions + food coupon.
  productDiscount: Prisma.Decimal
  /// subtotal - productDiscount.
  netFood: Prisma.Decimal
  customerDeliveryCost: Prisma.Decimal
  deliveryDiscount: Prisma.Decimal
  /// netFood + delivery - deliveryDiscount.
  total: Prisma.Decimal
  couponCode: string | null
}

/// Effective (charged) unit price for a product, honoring a valid sale price.
export function effectiveUnitPrice(product: Pick<Product, 'price' | 'salePrice'>): Prisma.Decimal {
  if (product.salePrice && product.salePrice.gt(ZERO) && product.salePrice.lt(product.price)) {
    return product.salePrice
  }
  return product.price
}

function clampDiscount(discount: Prisma.Decimal, max: Prisma.Decimal): Prisma.Decimal {
  if (discount.lt(ZERO)) return ZERO
  return discount.gt(max) ? max : discount
}

/// Validates a coupon and returns the food/delivery discount it produces.
/// Throws HttpError(400) if the coupon can't be applied.
function applyCoupon(
  coupon: Coupon,
  netFood: Prisma.Decimal,
  deliveryCost: Prisma.Decimal,
): { food: Prisma.Decimal; delivery: Prisma.Decimal } {
  if (!coupon.isActive) throw HttpError.badRequest('This coupon is not active')
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw HttpError.badRequest('This coupon has expired')
  }
  if (netFood.lt(coupon.minOrderSubtotal)) {
    throw HttpError.badRequest(
      `This coupon requires a food total of at least ${coupon.minOrderSubtotal.toString()}`,
    )
  }

  if (coupon.scope === 'DELIVERY') {
    if (coupon.kind === 'FREE_DELIVERY') return { food: ZERO, delivery: deliveryCost }
    if (coupon.kind === 'PERCENT') {
      return { food: ZERO, delivery: clampDiscount(deliveryCost.mul(coupon.value).div(100), deliveryCost) }
    }
    return { food: ZERO, delivery: clampDiscount(coupon.value, deliveryCost) }
  }

  // FOOD scope.
  if (coupon.kind === 'FREE_DELIVERY') {
    throw HttpError.badRequest('Invalid coupon configuration')
  }
  if (coupon.kind === 'PERCENT') {
    return { food: clampDiscount(netFood.mul(coupon.value).div(100), netFood), delivery: ZERO }
  }
  return { food: clampDiscount(coupon.value, netFood), delivery: ZERO }
}

interface PriceInput {
  items: { productId: string; quantity: number }[]
  products: Map<string, Product>
  deliveryCost: Prisma.Decimal
  coupon: Coupon | null
}

/// Core order pricing shared by checkout and the coupon preview. Applies
/// per-item sale prices (product discount) then an optional coupon, keeping
/// food and delivery discounts separate per the business rules.
export function priceOrder(input: PriceInput): PricedOrder {
  let subtotal = ZERO
  let productSaleDiscount = ZERO

  const lines: PricedLine[] = input.items.map((item) => {
    const product = input.products.get(item.productId)
    if (!product) throw HttpError.badRequest(`Product not found: ${item.productId}`)
    if (!product.isActive || !product.isAvailable) {
      throw HttpError.badRequest(`"${product.name}" is not available for ordering`)
    }
    const listUnitPrice = product.price
    const unitPrice = effectiveUnitPrice(product)
    const lineTotal = unitPrice.mul(item.quantity)
    subtotal = subtotal.add(listUnitPrice.mul(item.quantity))
    productSaleDiscount = productSaleDiscount.add(listUnitPrice.sub(unitPrice).mul(item.quantity))
    return { productId: product.id, productName: product.name, listUnitPrice, unitPrice, quantity: item.quantity, lineTotal }
  })

  // Net food after per-item sale prices, before any coupon.
  const netFoodBeforeCoupon = subtotal.sub(productSaleDiscount)

  let couponFood = ZERO
  let deliveryDiscount = ZERO
  if (input.coupon) {
    const applied = applyCoupon(input.coupon, netFoodBeforeCoupon, input.deliveryCost)
    couponFood = applied.food
    deliveryDiscount = applied.delivery
  }

  const productDiscount = productSaleDiscount.add(couponFood)
  const netFood = subtotal.sub(productDiscount)
  const total = netFood.add(input.deliveryCost).sub(deliveryDiscount)

  return {
    lines,
    subtotal,
    productDiscount,
    netFood,
    customerDeliveryCost: input.deliveryCost,
    deliveryDiscount,
    total,
    couponCode: input.coupon?.code ?? null,
  }
}
