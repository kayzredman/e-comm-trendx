import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  id: string
  name: string
  slug: string
  price: number
  image: string
  quantity: number
}

type CartStore = {
  items: CartItem[]
  drawerOpen: boolean
  addItem: (product: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clearCart: () => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
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
          const existing = state.items.find((i) => i.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + qty } : i,
              ),
            }
          }
          return { items: [...state.items, { ...product, quantity: qty }] }
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) =>
        set((state) => {
          if (qty <= 0) return { items: state.items.filter((i) => i.id !== id) }
          return { items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)) }
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
