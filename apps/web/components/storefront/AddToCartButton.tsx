'use client'

import { CSSProperties, ReactNode, useState } from 'react'
import { useCartStore } from '@/lib/cart-store'
import { ShoppingCart, Check } from 'lucide-react'

type Props = {
  product: {
    id: string
    name: string
    slug: string
    price: string | number
    images: string[]
  }
  disabled?: boolean
  className?: string
  style?: CSSProperties
  /** Override the button content (idle state) */
  label?: ReactNode
  /** Optional variant selected on the PDP. Phase 4 wires these into the cart store. */
  variantId?: string
  variantLabel?: string | null
}

export default function AddToCartButton({ product, disabled, className, style, label, variantId, variantLabel }: Props) {
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      image: product.images?.[0] ?? '',
      variantId,
      variantLabel: variantLabel ?? undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={disabled || added}
      className={className}
      style={style}
    >
      {added ? <><Check size={16} /> Added!</> : (label ?? <><ShoppingCart size={16} /> Add to Cart</>)}
    </button>
  )
}
