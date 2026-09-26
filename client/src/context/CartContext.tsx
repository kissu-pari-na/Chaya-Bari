import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { effectivePrice, type Product } from '../types/product'

export interface CartItem {
  productId: string
  name: string
  nameEnglish?: string | null
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartContextValue {
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (product: Product, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  removeItem: (productId: string) => void
  clear: () => void
  /// Put several products in the cart at once (e.g. "order again"): either
  /// replacing what's there or adding to it.
  addMany: (lines: { product: Product; quantity: number }[], mode: 'replace' | 'merge') => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)
const STORAGE_KEY = 'chaya_bari_cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

/// The cart with `quantity` more of a product (added as a new line if absent).
function withProduct(current: CartItem[], product: Product, quantity: number): CartItem[] {
  const existing = current.find((i) => i.productId === product.id)
  if (existing) {
    return current.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i))
  }
  return [
    ...current,
    { productId: product.id, name: product.name, nameEnglish: product.nameEnglish, price: effectivePrice(product), imageUrl: product.imageUrl, quantity },
  ]
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Ignore storage failures (private mode); cart just won't persist.
    }
  }, [items])

  const value = useMemo<CartContextValue>(() => {
    const addItem = (product: Product, quantity = 1) => setItems((current) => withProduct(current, product, quantity))

    const addMany = (lines: { product: Product; quantity: number }[], mode: 'replace' | 'merge') =>
      setItems((current) =>
        lines.reduce((acc, l) => withProduct(acc, l.product, l.quantity), mode === 'replace' ? [] : current),
      )

    const setQuantity = (productId: string, quantity: number) =>
      setItems((current) =>
        quantity <= 0
          ? current.filter((i) => i.productId !== productId)
          : current.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      )

    const removeItem = (productId: string) =>
      setItems((current) => current.filter((i) => i.productId !== productId))

    return {
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clear: () => setItems([]),
      addMany,
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
