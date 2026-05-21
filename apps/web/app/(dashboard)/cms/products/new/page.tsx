import { categoriesApi, type Category } from '@/lib/api'
import ProductForm from '../ProductForm'

export default async function NewProductPage() {
  let categories: Category[] = []
  try {
    categories = await categoriesApi.list()
  } catch {
    // API not running
  }

  return <ProductForm categories={categories} />
}
