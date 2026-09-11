import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Product } from '../types/product'

export interface CartItem {
  productId: string
  name: string
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
    const addItem = (product: Product, quantity = 1) =>
      setItems((current) => {
        const existing = current.find((i) => i.productId === product.id)
        if (existing) {
          return current.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i,
          )
        }
        return [
          ...current,
          { productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity },
        ]
      })

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
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}
