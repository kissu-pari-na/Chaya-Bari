import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { KEYS, readJson, writeJson } from './storage'
import { effectivePrice, type Product } from './types'

// The cart, kept on the device like the website's. Prices here are a preview;
// the server reprices every order (R-PLT-004).

export interface CartItem {
  productId: string
  name: string
  nameEnglish?: string | null
  price: number
  imageUrl: string | null
  quantity: number
}

interface CartValue {
  items: CartItem[]
  count: number
  subtotal: number
  addItem: (product: Product, quantity?: number) => void
  setQuantity: (productId: string, quantity: number) => void
  clear: () => void
}

const CartContext = createContext<CartValue | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const loaded = useRef(false)

  useEffect(() => {
    void readJson<CartItem[]>(KEYS.cart).then((saved) => {
      if (saved) setItems((cur) => (cur.length ? cur : saved))
      loaded.current = true
    })
  }, [])

  useEffect(() => {
    if (loaded.current) void writeJson(KEYS.cart, items)
  }, [items])

  const value = useMemo<CartValue>(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.price * i.quantity, 0),
      addItem: (product, quantity = 1) =>
        setItems((cur) =>
          cur.some((i) => i.productId === product.id)
            ? cur.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + quantity } : i))
            : [
                ...cur,
                {
                  productId: product.id,
                  name: product.name,
                  nameEnglish: product.nameEnglish,
                  price: effectivePrice(product),
                  imageUrl: product.imageUrl,
                  quantity,
                },
              ],
        ),
      setQuantity: (productId, quantity) =>
        setItems((cur) =>
          quantity <= 0
            ? cur.filter((i) => i.productId !== productId)
            : cur.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
        ),
      clear: () => setItems([]),
    }),
    [items],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
