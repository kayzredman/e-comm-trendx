import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PosCartItem = {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  image?: string
}

type PosCartStore = {
  items: PosCartItem[]
  customerId: string | null
  customerName: string | null
  discountAmount: number
  discountReason: string
  notes: string

  addItem: (item: Omit<PosCartItem, 'quantity'>, qty?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, qty: number) => void
  clear: () => void

  setCustomer: (id: string | null, name: string | null) => void
  setDiscount: (amount: number, reason?: string) => void
  setNotes: (notes: string) => void
  loadFromHold: (cart: {
    items: Array<{ productId: string; productName: string; unitPrice: string; quantity: number }>
    discountAmount?: string
    discountReason?: string
    notes?: string
  }, customer?: { id: string; name: string } | null) => void
}

export const usePosCart = create<PosCartStore>()(
  persist(
    (set) => ({
      items: [],
      customerId: null,
      customerName: null,
      discountAmount: 0,
      discountReason: '',
      notes: '',

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
              ),
            }
          }
          return { items: [...state.items, { ...item, quantity: qty }] }
        }),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),

      updateQty: (productId, qty) =>
        set((state) => {
          if (qty <= 0) return { items: state.items.filter((i) => i.productId !== productId) }
          return {
            items: state.items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
          }
        }),

      clear: () =>
        set({
          items: [],
          customerId: null,
          customerName: null,
          discountAmount: 0,
          discountReason: '',
          notes: '',
        }),

      setCustomer: (id, name) => set({ customerId: id, customerName: name }),
      setDiscount: (amount, reason = '') =>
        set({ discountAmount: Math.max(amount, 0), discountReason: reason }),
      setNotes: (notes) => set({ notes }),

      loadFromHold: (cart, customer) =>
        set({
          items: cart.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            unitPrice: Number(i.unitPrice),
            quantity: i.quantity,
          })),
          discountAmount: cart.discountAmount ? Number(cart.discountAmount) : 0,
          discountReason: cart.discountReason ?? '',
          notes: cart.notes ?? '',
          customerId: customer?.id ?? null,
          customerName: customer?.name ?? null,
        }),
    }),
    { name: 'trendx-pos-cart' },
  ),
)

export const selectPosSubtotal = (state: PosCartStore) =>
  state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0)

export const selectPosItemCount = (state: PosCartStore) =>
  state.items.reduce((sum, i) => sum + i.quantity, 0)
