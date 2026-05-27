import { auth } from '@clerk/nextjs/server'
import { customersApi, type Customer } from '@/lib/api'
import CustomersTable from './CustomersTable'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const { getToken } = await auth()
  const token = await getToken()

  let customers: Customer[] = []
  try {
    if (token) customers = await customersApi.list(token)
  } catch { /* API not running */ }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-20 rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <p className="font-medium" style={{ color: 'var(--color-text-muted)' }}>No customers yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-subtle)' }}>Customers are created automatically when orders are placed</p>
        </div>
      ) : (
        <CustomersTable customers={customers} />
      )}
    </div>
  )
}
