'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  PauseCircle,
  Percent,
  Ban,
  CreditCard,
  Banknote,
  Smartphone,
  X,
  ShoppingCart,
  Users as UsersIcon,
  Tag as TagIcon,
  ChevronRight,
  Printer,
  Loader2,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import {
  posApi,
  type Product,
  type Category,
  type PosRegister,
  type PosShift,
  type PosHold,
  type Order,
} from '@/lib/api'
import { usePosCart, selectPosSubtotal, selectPosItemCount } from '@/lib/pos-cart-store'
import { Logo } from '@/components/brand/Logo'

type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD'

const TAX_RATE = 0.15 // 15% VAT (Ghana)
const CURRENCY = 'GHS'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(Math.max(n, 0))

type CashierInfo = { id: string; name: string; role: string }

type Props = {
  initialProducts: Product[]
  initialCategories: Category[]
  initialRegisters: PosRegister[]
  initialShift: PosShift | null
  cashier: CashierInfo
}

export default function PosTerminal({
  initialProducts,
  initialCategories,
  initialRegisters,
  initialShift,
  cashier,
}: Props) {
  const { getToken } = useAuth()
  const [shift, setShift] = useState<PosShift | null>(initialShift)
  const [products] = useState<Product[]>(initialProducts)
  const [categories] = useState<Category[]>(initialCategories)
  const [registers, setRegisters] = useState<PosRegister[]>(initialRegisters)

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const [paymentOpen, setPaymentOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [holdsOpen, setHoldsOpen] = useState(false)
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [holds, setHolds] = useState<PosHold[]>([])

  const cart = usePosCart()
  const subtotal = usePosCart(selectPosSubtotal)
  const itemCount = usePosCart(selectPosItemCount)

  const tax = useMemo(
    () => Math.max(subtotal - cart.discountAmount, 0) * TAX_RATE,
    [subtotal, cart.discountAmount],
  )
  const total = Math.max(subtotal - cart.discountAmount + tax, 0)

  // ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  // Refresh holds when drawer opens
  useEffect(() => {
    if (!shift || !holdsOpen) return
    let cancelled = false
    ;(async () => {
      const token = await getToken()
      if (!token) return
      const list = await posApi.listHolds(shift.id, token).catch(() => [])
      if (!cancelled) setHolds(list)
    })()
    return () => {
      cancelled = true
    }
  }, [holdsOpen, shift, getToken])

  // Auto-hide toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.category?.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [products, search, categoryId])

  // ── Shift gate ─────────────────────────────────────────────────────────────
  if (!shift) {
    return (
      <ShiftGate
        cashier={cashier}
        registers={registers}
        onCreateRegister={async (data) => {
          const token = await getToken()
          if (!token) return
          const r = await posApi.createRegister(data, token)
          setRegisters((p) => [r, ...p])
          return r
        }}
        onOpen={async (data) => {
          const token = await getToken()
          if (!token) throw new Error('Not authenticated')
          const s = await posApi.openShift(data, token)
          setShift({ ...s, register: registers.find((r) => r.id === s.registerId) })
        }}
      />
    )
  }

  // ── Active terminal ────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-page)',
        color: 'var(--color-text)',
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80,
            padding: '10px 16px',
            borderRadius: 999,
            background: 'var(--color-navy-mid)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {toast}
        </div>
      )}

      <div className="pos-shell">
        {/* ─── Header ─── */}
        <header className="pos-header">
          <div className="pos-brand">
            <div className="pos-brand-mark">
              <Receipt size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-.01em' }}>
                <Logo variant="wordmark" size={15} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: 'var(--color-text-muted)',
                    background: 'var(--color-surface-muted)',
                    border: '1px solid var(--color-border)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  POS
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500, marginTop: 2 }}>
                {shift.register?.name ?? 'Register'} · {cashier.name}
              </div>
            </div>
          </div>

          <div className="pos-search">
            <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKU, category…"
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: 'transparent',
                color: 'var(--color-text)',
                fontSize: 14,
              }}
            />
            <kbd
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 6,
                background: 'var(--color-surface-muted)',
                color: 'var(--color-text-muted)',
                fontFamily: 'inherit',
              }}
            >
              ⌘K
            </kbd>
          </div>

          <div className="pos-shift-pill">
            <span className="pos-dot" />
            Shift open · {fmt(Number(shift.openingFloat))} float
            <button
              type="button"
              className="pos-shift-close"
              onClick={() => setCloseOpen(true)}
              title="Close shift"
            >
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ─── Body ─── */}
        <div className="pos-body">
          {/* Catalog */}
          <section className="pos-catalog">
            <div className="pos-cat-chips">
              <button
                className={`pos-chip ${categoryId === null ? 'is-active' : ''}`}
                onClick={() => setCategoryId(null)}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`pos-chip ${categoryId === c.id ? 'is-active' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="pos-product-grid">
              {filteredProducts.length === 0 && (
                <div className="pos-empty">
                  <Search size={28} style={{ opacity: 0.4 }} />
                  <p>No products match.</p>
                </div>
              )}
              {filteredProducts.map((p) => {
                const stock = p.inventory ?? 0
                const stockKind = stock === 0 ? 'out' : stock < 5 ? 'low' : 'ok'
                return (
                  <button
                    key={p.id}
                    className="pos-product"
                    disabled={stock === 0}
                    onClick={() =>
                      cart.addItem({
                        productId: p.id,
                        productName: p.name,
                        unitPrice: Number(p.price),
                        image: p.images?.[0],
                      })
                    }
                  >
                    <div className="pos-product-img">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} />
                      ) : (
                        <TagIcon size={22} style={{ opacity: 0.45 }} />
                      )}
                      <span className={`pos-stock pos-stock-${stockKind}`}>
                        {stock === 0 ? 'Out' : stock < 5 ? `Low · ${stock}` : `${stock}`}
                      </span>
                    </div>
                    <div className="pos-product-meta">
                      <div className="pos-product-name">{p.name}</div>
                      <div className="pos-product-foot">
                        <span className="pos-product-price">{fmt(Number(p.price))}</span>
                        <span className="pos-product-cat">{p.category?.name ?? '—'}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Cart */}
          <aside className="pos-cart">
            <div className="pos-cart-head">
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  Current sale
                </div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{itemCount} item{itemCount === 1 ? '' : 's'}</div>
              </div>
              <button
                className="pos-icon-btn"
                onClick={() => setHoldsOpen(true)}
                title="View held sales"
              >
                <PauseCircle size={18} />
              </button>
            </div>

            <CustomerBar
              customerName={cart.customerName}
              onClear={() => cart.setCustomer(null, null)}
              onSet={(id, name) => cart.setCustomer(id, name)}
            />

            <div className="pos-cart-items">
              {cart.items.length === 0 && (
                <div className="pos-empty pos-empty-cart">
                  <ShoppingCart size={28} style={{ opacity: 0.35 }} />
                  <p>Tap a product to start a sale</p>
                </div>
              )}
              {cart.items.map((item) => (
                <div className="pos-cart-line" key={item.productId}>
                  <div className="pos-cart-thumb">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.productName} />
                    ) : (
                      <TagIcon size={16} style={{ opacity: 0.5 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.productName}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {fmt(item.unitPrice)} · {fmt(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                  <div className="pos-qty">
                    <button onClick={() => cart.updateQty(item.productId, item.quantity - 1)}>
                      <Minus size={12} />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => cart.updateQty(item.productId, item.quantity + 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <button
                    className="pos-icon-btn pos-icon-btn-ghost"
                    onClick={() => cart.removeItem(item.productId)}
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Action row */}
            <div className="pos-actions">
              <button
                className="pos-act"
                disabled={!cart.items.length}
                onClick={async () => {
                  const token = await getToken()
                  if (!token || !shift) return
                  await posApi.hold(
                    {
                      shiftId: shift.id,
                      customerId: cart.customerId,
                      cart: {
                        items: cart.items.map((i) => ({
                          productId: i.productId,
                          productName: i.productName,
                          unitPrice: i.unitPrice.toFixed(2),
                          quantity: i.quantity,
                        })),
                        discountAmount: cart.discountAmount ? cart.discountAmount.toFixed(2) : undefined,
                        discountReason: cart.discountReason || undefined,
                        notes: cart.notes || undefined,
                      },
                    },
                    token,
                  )
                  cart.clear()
                  setToast('Sale held')
                }}
              >
                <PauseCircle size={14} /> Hold
              </button>
              <button
                className="pos-act"
                disabled={!cart.items.length}
                onClick={() => setDiscountOpen(true)}
              >
                <Percent size={14} /> Discount
              </button>
              <button
                className="pos-act pos-act-danger"
                disabled={!cart.items.length}
                onClick={() => {
                  if (confirm('Void this sale?')) cart.clear()
                }}
              >
                <Ban size={14} /> Void
              </button>
            </div>

            {/* Totals */}
            <div className="pos-totals">
              <div className="pos-totals-row">
                <span>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              {cart.discountAmount > 0 && (
                <div className="pos-totals-row" style={{ color: 'var(--color-success)' }}>
                  <span>
                    Discount{cart.discountReason ? ` · ${cart.discountReason}` : ''}
                  </span>
                  <span>− {fmt(cart.discountAmount)}</span>
                </div>
              )}
              <div className="pos-totals-row">
                <span>VAT (15%)</span>
                <span>{fmt(tax)}</span>
              </div>
              <div className="pos-totals-grand">
                <span>Total due</span>
                <span>{fmt(total)}</span>
              </div>
              <button
                className="pos-checkout"
                disabled={!cart.items.length}
                onClick={() => setPaymentOpen(true)}
              >
                Charge {fmt(total)} <ChevronRight size={18} />
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile bottom-bar (cart count) — basic */}
      <div className="pos-mobile-bar">
        <button onClick={() => setHoldsOpen(true)}>
          <PauseCircle size={18} />
          <span>Holds</span>
        </button>
        <button onClick={() => setPaymentOpen(true)} disabled={!cart.items.length}>
          <ShoppingCart size={18} />
          <span>
            {itemCount} · {fmt(total)}
          </span>
        </button>
      </div>

      {/* ─── Payment Modal ─── */}
      {paymentOpen && (
        <PaymentModal
          total={total}
          onClose={() => setPaymentOpen(false)}
          onConfirm={async (payload) => {
            const token = await getToken()
            if (!token || !shift) throw new Error('Not authenticated')
            const order = await posApi.checkout(
              {
                shiftId: shift.id,
                registerId: shift.registerId,
                items: cart.items.map((i) => ({
                  productId: i.productId,
                  productName: i.productName,
                  unitPrice: i.unitPrice.toFixed(2),
                  quantity: i.quantity,
                })),
                customerId: cart.customerId,
                paymentMethod: payload.method,
                tenderedAmount: payload.tendered,
                momoReference: payload.momoReference,
                cardLast4: payload.cardLast4,
                discountAmount: cart.discountAmount,
                discountReason: cart.discountReason || undefined,
                taxAmount: tax,
                notes: cart.notes || undefined,
              },
              token,
            )
            cart.clear()
            setPaymentOpen(false)
            setReceiptOrder(order)
            setToast(`Receipt ${order.receiptNumber}`)
          }}
        />
      )}

      {/* ─── Discount Modal ─── */}
      {discountOpen && (
        <DiscountModal
          initial={cart.discountAmount}
          initialReason={cart.discountReason}
          onClose={() => setDiscountOpen(false)}
          onApply={(amt, reason) => {
            cart.setDiscount(amt, reason)
            setDiscountOpen(false)
            setToast('Discount applied')
          }}
        />
      )}

      {/* ─── Close Shift Modal ─── */}
      {closeOpen && (
        <CloseShiftModal
          shift={shift}
          getToken={getToken}
          onClose={() => setCloseOpen(false)}
          onClosed={() => {
            setShift(null)
            setCloseOpen(false)
            setToast('Shift closed')
          }}
        />
      )}

      {/* ─── Holds Drawer ─── */}
      {holdsOpen && (
        <HoldsDrawer
          holds={holds}
          onClose={() => setHoldsOpen(false)}
          onResume={async (h) => {
            const token = await getToken()
            if (!token) return
            await posApi.resumeHold(h.id, token)
            cart.loadFromHold(
              h.cart,
              h.customer ? { id: h.customer.id, name: h.customer.name } : null,
            )
            setHolds((prev) => prev.filter((x) => x.id !== h.id))
            setHoldsOpen(false)
            setToast('Sale resumed')
          }}
          onVoid={async (h) => {
            const token = await getToken()
            if (!token) return
            await posApi.voidHold(h.id, token)
            setHolds((prev) => prev.filter((x) => x.id !== h.id))
          }}
        />
      )}

      {/* ─── Receipt Modal ─── */}
      {receiptOrder && (
        <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />
      )}

      <PosStyles />
    </div>
  )
}

/* ════════════════════ Shift Gate ════════════════════ */

function ShiftGate({
  cashier,
  registers,
  onOpen,
  onCreateRegister,
}: {
  cashier: CashierInfo
  registers: PosRegister[]
  onOpen: (d: { registerId: string; openingFloat?: number }) => Promise<void>
  onCreateRegister: (d: { name: string; location?: string }) => Promise<PosRegister | undefined>
}) {
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? '')
  const [openingFloat, setOpeningFloat] = useState('100')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newReg, setNewReg] = useState('')

  const isOwnerOrManager = cashier.role === 'OWNER' || cashier.role === 'MANAGER'

  async function go() {
    setError(null)
    if (!registerId) {
      setError('Pick a register first')
      return
    }
    setBusy(true)
    try {
      await onOpen({ registerId, openingFloat: Number(openingFloat) || 0 })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-page)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--color-surface)',
          borderRadius: 20,
          padding: 28,
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'var(--grad-brand)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            marginBottom: 16,
          }}
        >
          <Receipt size={22} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.01em' }}>
          Open a shift
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
          Hi {cashier.name}, set your opening float to begin taking sales.
        </p>

        <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Register
            </label>
            {registers.length > 0 ? (
              <select
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
                style={fieldStyle}
              >
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}{r.location ? ` · ${r.location}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  marginTop: 6,
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  border: '1px dashed var(--color-border)',
                  fontSize: 13,
                  color: 'var(--color-text-muted)',
                }}
              >
                {isOwnerOrManager
                  ? 'No registers yet — create one below.'
                  : 'No registers configured. Ask a manager to set one up.'}
              </div>
            )}
          </div>

          {isOwnerOrManager && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newReg}
                onChange={(e) => setNewReg(e.target.value)}
                placeholder="New register name (e.g. Front Till)"
                style={{ ...fieldStyle, flex: 1, marginTop: 0 }}
              />
              <button
                type="button"
                className="pos-pill-btn"
                onClick={async () => {
                  if (!newReg.trim()) return
                  const r = await onCreateRegister({ name: newReg.trim() })
                  if (r) {
                    setRegisterId(r.id)
                    setNewReg('')
                  }
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
              }}
            >
              Opening float ({CURRENCY})
            </label>
            <input
              type="number"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              style={fieldStyle}
              min={0}
              step="0.01"
            />
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 10,
                borderRadius: 10,
                background: 'rgba(239,68,68,.08)',
                color: 'var(--color-error)',
                fontSize: 13,
              }}
            >
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button
            type="button"
            onClick={go}
            disabled={busy || !registerId}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 12,
              background: 'var(--grad-brand)',
              color: '#fff',
              border: 0,
              fontWeight: 700,
              fontSize: 15,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy || !registerId ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {busy && <Loader2 size={16} className="pos-spin" />} Open shift
          </button>
        </div>
      </div>
      <PosStyles />
    </div>
  )
}

/* ════════════════════ Customer Bar ════════════════════ */

function CustomerBar({
  customerName,
  onSet,
  onClear,
}: {
  customerName: string | null
  onSet: (id: string, name: string) => void
  onClear: () => void
}) {
  // Simple placeholder — full customer lookup TODO (phone-based)
  const [val, setVal] = useState('')

  if (customerName) {
    return (
      <div className="pos-customer">
        <UsersIcon size={14} style={{ color: 'var(--color-primary)' }} />
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{customerName}</span>
        <button className="pos-icon-btn pos-icon-btn-ghost" onClick={onClear} title="Detach">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="pos-customer">
      <UsersIcon size={14} style={{ color: 'var(--color-text-muted)' }} />
      <input
        placeholder="Walk-in · phone or name (optional)"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) {
            // For now, attach freeform name as guest label only — proper lookup is API-side
            onSet('walkin-' + Date.now(), val.trim())
            setVal('')
          }
        }}
        style={{
          flex: 1,
          border: 0,
          outline: 0,
          background: 'transparent',
          fontSize: 13,
          color: 'var(--color-text)',
        }}
      />
    </div>
  )
}

/* ════════════════════ Payment Modal ════════════════════ */

function PaymentModal({
  total,
  onClose,
  onConfirm,
}: {
  total: number
  onClose: () => void
  onConfirm: (payload: {
    method: PaymentMethod
    tendered?: number
    momoReference?: string
    cardLast4?: string
  }) => Promise<void>
}) {
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [tendered, setTendered] = useState(total.toFixed(2))
  const [momoRef, setMomoRef] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const tenderedNum = Number(tendered) || 0
  const change = method === 'CASH' ? Math.max(tenderedNum - total, 0) : 0

  async function go() {
    setErr(null)
    if (method === 'CASH' && tenderedNum < total) {
      setErr('Tendered amount is less than total')
      return
    }
    if (method === 'MOBILE_MONEY' && !momoRef.trim()) {
      setErr('MoMo reference required')
      return
    }
    if (method === 'CARD' && cardLast4 && !/^\d{4}$/.test(cardLast4)) {
      setErr('Card last 4 must be 4 digits')
      return
    }
    setBusy(true)
    try {
      await onConfirm({
        method,
        tendered: method === 'CASH' ? tenderedNum : undefined,
        momoReference: method === 'MOBILE_MONEY' ? momoRef.trim() : undefined,
        cardLast4: method === 'CARD' && cardLast4 ? cardLast4 : undefined,
      })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-head">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Charge
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em' }}>
              {fmt(total)}
            </div>
          </div>
          <button className="pos-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="pos-pay-methods">
          {(
            [
              { id: 'CASH', label: 'Cash', icon: Banknote },
              { id: 'MOBILE_MONEY', label: 'MoMo', icon: Smartphone },
              { id: 'CARD', label: 'Card', icon: CreditCard },
            ] as const
          ).map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                className={`pos-pay ${method === m.id ? 'is-active' : ''}`}
                onClick={() => setMethod(m.id)}
              >
                <Icon size={18} />
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        {method === 'CASH' && (
          <>
            <label className="pos-field-label">Tendered</label>
            <input
              type="number"
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              style={fieldStyle}
              step="0.01"
              autoFocus
            />
            <div className="pos-quick-cash">
              {[20, 50, 100, 200].map((n) => (
                <button
                  key={n}
                  onClick={() => setTendered(((Number(tendered) || 0) + n).toFixed(2))}
                >
                  +{n}
                </button>
              ))}
              <button onClick={() => setTendered(total.toFixed(2))}>Exact</button>
            </div>
            <div className="pos-change">
              <span>Change</span>
              <strong>{fmt(change)}</strong>
            </div>
          </>
        )}

        {method === 'MOBILE_MONEY' && (
          <>
            <label className="pos-field-label">MoMo reference</label>
            <input
              type="text"
              value={momoRef}
              onChange={(e) => setMomoRef(e.target.value)}
              style={fieldStyle}
              placeholder="MTN/Vodafone/AirtelTigo TX ID"
              autoFocus
            />
          </>
        )}

        {method === 'CARD' && (
          <>
            <label className="pos-field-label">Card last 4 (optional)</label>
            <input
              type="text"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              style={fieldStyle}
              placeholder="1234"
              maxLength={4}
            />
          </>
        )}

        {err && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 10,
              borderRadius: 10,
              background: 'rgba(239,68,68,.08)',
              color: 'var(--color-error)',
              fontSize: 13,
              marginTop: 12,
            }}
          >
            <AlertTriangle size={14} /> {err}
          </div>
        )}

        <div className="pos-modal-foot">
          <button className="pos-pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="pos-pill-btn pos-pill-primary" onClick={go} disabled={busy}>
            {busy ? <Loader2 size={14} className="pos-spin" /> : null}
            Confirm payment
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════ Discount Modal ════════════════════ */

function DiscountModal({
  initial,
  initialReason,
  onClose,
  onApply,
}: {
  initial: number
  initialReason: string
  onClose: () => void
  onApply: (amt: number, reason: string) => void
}) {
  const [amt, setAmt] = useState(initial ? initial.toFixed(2) : '')
  const [reason, setReason] = useState(initialReason)
  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div className="pos-modal pos-modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-head">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Apply discount
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{CURRENCY} value</div>
          </div>
          <button className="pos-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <label className="pos-field-label">Amount</label>
        <input
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          style={fieldStyle}
          step="0.01"
          autoFocus
        />
        <label className="pos-field-label">Reason (optional)</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={fieldStyle}
          placeholder="Loyalty, damaged item, manager approval…"
        />
        <div className="pos-modal-foot">
          <button className="pos-pill-btn" onClick={() => onApply(0, '')}>
            Remove
          </button>
          <button
            className="pos-pill-btn pos-pill-primary"
            onClick={() => onApply(Math.max(Number(amt) || 0, 0), reason)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════ Close Shift Modal ════════════════════ */

function CloseShiftModal({
  shift,
  getToken,
  onClose,
  onClosed,
}: {
  shift: PosShift
  getToken: () => Promise<string | null>
  onClose: () => void
  onClosed: () => void
}) {
  const [closingCash, setClosingCash] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<{ gross: string; orders: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await getToken()
      if (!token) return
      const s = await posApi.shiftSummary(shift.id, token).catch(() => null)
      if (!cancelled && s) setSummary({ gross: s.totals.gross, orders: s.totals.orders })
    })()
    return () => {
      cancelled = true
    }
  }, [shift.id, getToken])

  async function go() {
    setBusy(true)
    try {
      const token = await getToken()
      if (!token) return
      await posApi.closeShift(
        shift.id,
        { closingCash: Number(closingCash) || 0, notes: notes || undefined },
        token,
      )
      onClosed()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div className="pos-modal pos-modal-narrow" onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-head">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Close shift
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {shift.register?.name ?? 'Register'}
            </div>
          </div>
          <button className="pos-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {summary && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 8,
              fontSize: 13,
            }}
          >
            <span>{summary.orders} sales</span>
            <strong>{fmt(Number(summary.gross))}</strong>
          </div>
        )}
        <label className="pos-field-label">Counted cash in drawer ({CURRENCY})</label>
        <input
          type="number"
          value={closingCash}
          onChange={(e) => setClosingCash(e.target.value)}
          style={fieldStyle}
          step="0.01"
          autoFocus
        />
        <label className="pos-field-label">Notes (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={fieldStyle}
        />
        <div className="pos-modal-foot">
          <button className="pos-pill-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="pos-pill-btn pos-pill-primary" onClick={go} disabled={busy}>
            {busy ? <Loader2 size={14} className="pos-spin" /> : null}
            Close shift
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════ Holds Drawer ════════════════════ */

function HoldsDrawer({
  holds,
  onClose,
  onResume,
  onVoid,
}: {
  holds: PosHold[]
  onClose: () => void
  onResume: (h: PosHold) => Promise<void>
  onVoid: (h: PosHold) => Promise<void>
}) {
  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div
        className="pos-modal"
        style={{ maxWidth: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal-head">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Held sales
            </div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {holds.length} pending
            </div>
          </div>
          <button className="pos-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
          {holds.length === 0 && (
            <div className="pos-empty">
              <PauseCircle size={28} style={{ opacity: 0.35 }} />
              <p>No held sales.</p>
            </div>
          )}
          {holds.map((h) => {
            const itemCount = h.cart.items.reduce((s, i) => s + i.quantity, 0)
            const subtotal = h.cart.items.reduce(
              (s, i) => s + Number(i.unitPrice) * i.quantity,
              0,
            )
            return (
              <div
                key={h.id}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background: 'var(--color-surface-muted)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    {h.customer?.name ?? h.label ?? 'Walk-in'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {itemCount} items · {fmt(subtotal)}
                  </div>
                </div>
                <button className="pos-pill-btn" onClick={() => onVoid(h)}>
                  Void
                </button>
                <button
                  className="pos-pill-btn pos-pill-primary"
                  onClick={() => onResume(h)}
                >
                  Resume
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════ Receipt Modal ════════════════════ */

function ReceiptModal({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <div className="pos-modal-bg" onClick={onClose}>
      <div
        className="pos-modal pos-modal-narrow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pos-modal-head">
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Receipt
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily:
                  '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {order.receiptNumber ?? order.id.slice(-8).toUpperCase()}
            </div>
          </div>
          <button className="pos-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'var(--color-surface-muted)',
            border: '1px solid var(--color-border)',
            fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
            fontSize: 12,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ marginBottom: 4 }}>
              <Logo variant="wordmark" size={18} withPulse={false} />
            </div>
            <div style={{ color: 'var(--color-text-muted)' }}>
              {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }} />
          {order.items?.map((it) => (
            <div
              key={it.id}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}
            >
              <span style={{ flex: 1 }}>
                {it.quantity} × {it.productName}
              </span>
              <span>{fmt(Number(it.unitPrice) * it.quantity)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{fmt(Number(order.subtotal))}</span>
          </div>
          {Number(order.discountAmount ?? 0) > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: 'var(--color-success)',
              }}
            >
              <span>Discount</span>
              <span>− {fmt(Number(order.discountAmount))}</span>
            </div>
          )}
          {Number(order.taxAmount ?? 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>VAT</span>
              <span>{fmt(Number(order.taxAmount))}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 800,
              fontSize: 14,
              marginTop: 4,
            }}
          >
            <span>Total</span>
            <span>{fmt(Number(order.total))}</span>
          </div>
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '8px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{order.paymentMethod}</span>
            <span>
              {order.paymentMethod === 'CASH' && order.tenderedAmount
                ? `Tend ${fmt(Number(order.tenderedAmount))}`
                : ''}
            </span>
          </div>
          {order.paymentMethod === 'CASH' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Change</span>
              <span>{fmt(Number(order.changeAmount ?? 0))}</span>
            </div>
          )}
          <div style={{ borderTop: '1px dashed var(--color-border)', margin: '10px 0 6px' }} />
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 11 }}>
            Thank you for shopping with trendMarga
          </div>
        </div>
        <div className="pos-modal-foot">
          <button
            className="pos-pill-btn"
            onClick={() => window.print()}
            style={{ gap: 6 }}
          >
            <Printer size={14} /> Print
          </button>
          <button className="pos-pill-btn pos-pill-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════ Styles (scoped via class names) ════════════════════ */

const fieldStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 14,
  outline: 'none',
}

function PosStyles() {
  return (
    <style jsx global>{`
      .pos-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        min-width: 0;
        width: 100%;
        overflow-x: hidden;
      }
      .pos-header {
        display: grid;
        grid-template-columns: minmax(200px, 1fr) minmax(240px, 2fr) auto;
        gap: 16px;
        align-items: center;
        padding: 14px 22px;
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border);
        position: sticky;
        top: 0;
        z-index: 30;
        min-width: 0;
      }
      @media (max-width: 1023px) {
        .pos-header {
          grid-template-columns: 1fr auto;
          padding: 12px 14px;
        }
        .pos-header > .pos-search { grid-column: 1 / -1; order: 3; }
      }
      .pos-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pos-brand-mark {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: var(--grad-brand);
        color: #fff;
        display: grid;
        place-items: center;
      }
      .pos-search {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        border-radius: 12px;
        background: var(--color-surface-muted);
        border: 1px solid var(--color-border);
      }
      .pos-shift-pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px 8px 14px;
        border-radius: 999px;
        background: rgba(16, 185, 129, 0.1);
        color: var(--color-success);
        font-weight: 600;
        font-size: 12px;
      }
      .pos-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-success);
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
        animation: pos-pulse 1.8s ease-in-out infinite;
      }
      @keyframes pos-pulse {
        50% {
          box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
        }
      }
      .pos-shift-close {
        margin-left: 4px;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 0;
        background: rgba(16, 185, 129, 0.18);
        color: var(--color-success);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .pos-shift-close:hover {
        background: rgba(16, 185, 129, 0.3);
      }

      .pos-body {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 380px;
        gap: 18px;
        padding: 18px;
        flex: 1;
        min-height: 0;
        min-width: 0;
      }
      @media (max-width: 1440px) {
        .pos-body {
          grid-template-columns: minmax(0, 1fr) 340px;
        }
      }
      @media (max-width: 1280px) {
        .pos-body {
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 14px;
          padding: 14px;
        }
      }
      @media (max-width: 1023px) {
        .pos-body {
          grid-template-columns: minmax(0, 1fr);
          padding-bottom: 80px;
        }
      }

      .pos-catalog {
        display: flex;
        flex-direction: column;
        min-height: 0;
        gap: 14px;
      }
      .pos-cat-chips {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: thin;
      }
      .pos-chip {
        padding: 8px 14px;
        border-radius: 999px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        color: var(--color-text);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s ease;
      }
      .pos-chip:hover {
        background: var(--color-surface-muted);
      }
      .pos-chip.is-active {
        background: var(--color-text);
        color: var(--color-surface);
        border-color: var(--color-text);
      }

      .pos-product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
        overflow-y: auto;
        padding-right: 4px;
      }
      @media (max-width: 640px) {
        .pos-product-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        }
      }
      .pos-product {
        text-align: left;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        flex-direction: column;
      }
      .pos-product:hover:not(:disabled) {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      .pos-product:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .pos-product-img {
        position: relative;
        aspect-ratio: 1 / 1;
        background: var(--color-surface-muted);
        display: grid;
        place-items: center;
      }
      .pos-product-img img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .pos-stock {
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .pos-stock-ok {
        background: rgba(16, 185, 129, 0.15);
        color: var(--color-success);
      }
      .pos-stock-low {
        background: rgba(245, 158, 11, 0.18);
        color: var(--color-warning);
      }
      .pos-stock-out {
        background: rgba(239, 68, 68, 0.15);
        color: var(--color-error);
      }
      .pos-product-meta {
        padding: 10px 12px 12px;
      }
      .pos-product-name {
        font-weight: 600;
        font-size: 13px;
        line-height: 1.3;
        margin-bottom: 6px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .pos-product-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .pos-product-price {
        font-weight: 800;
        font-size: 14px;
        color: var(--color-text);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .pos-product-cat {
        font-size: 11px;
        color: var(--color-text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 80px;
      }

      .pos-cart {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        min-height: 0;
        max-height: calc(100vh - 100px);
        position: sticky;
        top: 84px;
      }
      .pos-cart-head {
        padding: 16px 18px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--color-border);
      }
      .pos-customer {
        margin: 12px 18px;
        padding: 10px 14px;
        background: var(--color-surface-muted);
        border: 1px solid var(--color-border);
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pos-cart-items {
        flex: 1;
        overflow-y: auto;
        padding: 0 18px 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pos-cart-line {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        border-radius: 10px;
        background: var(--color-surface-muted);
      }
      .pos-cart-thumb {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: var(--color-surface);
        display: grid;
        place-items: center;
        flex-shrink: 0;
        overflow: hidden;
      }
      .pos-cart-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .pos-qty {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px;
        border-radius: 999px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
      }
      .pos-qty button {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 0;
        background: transparent;
        color: var(--color-text);
        display: grid;
        place-items: center;
        cursor: pointer;
      }
      .pos-qty button:hover {
        background: var(--color-surface-muted);
      }
      .pos-qty span {
        min-width: 24px;
        text-align: center;
        font-weight: 700;
        font-size: 13px;
      }
      .pos-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pos-icon-btn:hover {
        background: var(--color-surface-muted);
      }
      .pos-icon-btn-ghost {
        border: 0;
        background: transparent;
        color: var(--color-text-muted);
      }
      .pos-icon-btn-ghost:hover {
        color: var(--color-error);
        background: rgba(239, 68, 68, 0.08);
      }

      .pos-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        padding: 12px 18px 0;
      }
      .pos-act {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 600;
        font-size: 12.5px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pos-act:hover:not(:disabled) {
        background: var(--color-surface-muted);
      }
      .pos-act:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .pos-act-danger:hover:not(:disabled) {
        color: var(--color-error);
        border-color: rgba(239, 68, 68, 0.3);
        background: rgba(239, 68, 68, 0.06);
      }

      .pos-totals {
        padding: 14px 18px 18px;
        border-top: 1px solid var(--color-border);
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pos-totals-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--color-text-muted);
      }
      .pos-totals-grand {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding-top: 8px;
        margin-top: 4px;
        border-top: 1px dashed var(--color-border);
      }
      .pos-totals-grand > span:first-child {
        font-weight: 700;
      }
      .pos-totals-grand > span:last-child {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--color-primary);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .pos-checkout {
        margin-top: 12px;
        width: 100%;
        padding: 14px 16px;
        border-radius: 12px;
        background: var(--grad-brand);
        color: #fff;
        border: 0;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.15s ease;
      }
      .pos-checkout:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: var(--shadow-md);
      }
      .pos-checkout:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pos-empty {
        grid-column: 1 / -1;
        padding: 40px 20px;
        text-align: center;
        color: var(--color-text-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font-size: 13px;
      }
      .pos-empty-cart {
        padding: 60px 16px;
      }

      .pos-mobile-bar {
        display: none;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 40;
        background: var(--color-surface);
        border-top: 1px solid var(--color-border);
        padding: 10px 14px;
        gap: 10px;
      }
      .pos-mobile-bar button {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border-radius: 10px;
        background: var(--color-surface-muted);
        border: 0;
        color: var(--color-text);
        font-weight: 600;
        font-size: 13px;
      }
      .pos-mobile-bar button:nth-child(2) {
        background: var(--grad-brand);
        color: #fff;
      }
      .pos-mobile-bar button:disabled {
        opacity: 0.5;
      }
      @media (max-width: 1023px) {
        .pos-mobile-bar {
          display: flex;
        }
        .pos-cart {
          position: static;
          max-height: none;
        }
      }

      /* Modals */
      .pos-modal-bg {
        position: fixed;
        inset: 0;
        z-index: 60;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(4px);
        display: grid;
        place-items: center;
        padding: 16px;
        animation: posFade 0.15s ease;
      }
      @keyframes posFade {
        from {
          opacity: 0;
        }
      }
      .pos-modal {
        width: 100%;
        max-width: 480px;
        background: var(--color-surface);
        border-radius: 18px;
        padding: 22px;
        border: 1px solid var(--color-border);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pos-modal-narrow {
        max-width: 420px;
      }
      .pos-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 6px;
      }
      .pos-field-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-top: 8px;
      }

      .pos-pay-methods {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin: 6px 0;
      }
      .pos-pay {
        padding: 14px 8px;
        border-radius: 12px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }
      .pos-pay:hover {
        background: var(--color-surface-muted);
      }
      .pos-pay.is-active {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
        color: var(--color-primary-dark);
      }
      .pos-quick-cash {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }
      .pos-quick-cash button {
        padding: 8px 14px;
        border-radius: 999px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .pos-quick-cash button:hover {
        background: var(--color-surface-muted);
      }
      .pos-change {
        margin-top: 12px;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 14px;
      }
      .pos-change > strong {
        font-size: 18px;
        color: var(--color-success);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }

      .pos-modal-foot {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 14px;
      }
      .pos-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 16px;
        border-radius: 10px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        color: var(--color-text);
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .pos-pill-btn:hover:not(:disabled) {
        background: var(--color-surface-muted);
      }
      .pos-pill-primary {
        background: var(--grad-brand);
        color: #fff;
        border-color: transparent;
      }
      .pos-pill-primary:hover:not(:disabled) {
        box-shadow: var(--shadow-md);
      }
      .pos-pill-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pos-spin {
        animation: posSpin 0.9s linear infinite;
      }
      @keyframes posSpin {
        to {
          transform: rotate(360deg);
        }
      }
    `}</style>
  )
}
