'use client'

import { CSSProperties, useState } from 'react'
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
}

export default function AddToCartButton({ product, disabled, className, style }: Props) {
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  function handleAdd() {
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: Number(product.price),
      image: product.images?.[0] ?? '',
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
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
      {added ? 'Added!' : 'Add to Cart'}
    </button>
  )
}
