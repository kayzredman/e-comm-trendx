import { categoriesApi, type Category } from '@/lib/api'
import CategoryManager from './CategoryManager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  let categories: Category[] = []
  try {
    categories = await categoriesApi.list()
  } catch {
    // API may not be running locally — graceful fallback
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--color-text)' }}>
            Categories
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Organise your products into browsable groups for shoppers.
          </p>
        </div>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  )
}
