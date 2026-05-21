import { productsApi, categoriesApi, type Category } from '@/lib/api'
import ProductForm from '../../ProductForm'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function EditProductPage({ params }: Props) {
  const { id } = await params

  let product = null
  let categories: Category[] = []
  try {
    ;[product, categories] = await Promise.all([productsApi.get(id), categoriesApi.list()])
  } catch {
    // API error
  }

  if (!product) notFound()

  return <ProductForm categories={categories} product={product} />
}
