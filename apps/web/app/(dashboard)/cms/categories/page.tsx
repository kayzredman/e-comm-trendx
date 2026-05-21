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
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Categories</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {categories.length} categor{categories.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
      </div>
      <CategoryManager initialCategories={categories} />
    </div>
  )
}
