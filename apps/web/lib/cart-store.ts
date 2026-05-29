import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  id: string
  name: string
  slug: string
  price: number
  image: string
  quantity: number
  /** Selected product variant, when the product has variants. */
  variantId?: string
  variantLabel?: string
}

type CartStore = {
  items: CartItem[]
  drawerOpen: boolean
  addItem: (product: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (id: string, variantId?: string) => void
  updateQty: (id: string, qty: number, variantId?: string) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

/** A cart line is uniquely identified by (productId, variantId?). */
function sameLine(a: { id: string; variantId?: string }, b: { id: string; variantId?: string }) {
  return a.id === b.id && (a.variantId ?? null) === (b.variantId ?? null)
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),

      addItem: (product, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => sameLine(i, product))
          if (existing) {
            return {
              items: state.items.map((i) =>
                sameLine(i, product) ? { ...i, quantity: i.quantity + qty } : i,
              ),
            }
          }
          return { items: [...state.items, { ...product, quantity: qty }] }
        }),

      removeItem: (id, variantId) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, { id, variantId })),
        })),

      updateQty: (id, qty, variantId) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((i) => !sameLine(i, { id, variantId })) }
          }
          return {
            items: state.items.map((i) =>
              sameLine(i, { id, variantId }) ? { ...i, quantity: qty } : i,
            ),
          }
        }),

      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'trendmarga-cart',
      partialize: (state) => ({ items: state.items }) as CartStore,
    },
  ),
)

// Reusable selectors
export const selectItemCount = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0)

export const selectTotal = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
