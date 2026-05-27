import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  usersApi,
  productsApi,
  categoriesApi,
  posApi,
  type UserRole,
  type StaffUser,
} from '@/lib/api'
import PosTerminal from './PosTerminal'

const POS_ROLES: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER']

export const metadata = {
  title: 'POS Terminal · TrendX',
}

export default async function PosPage() {
  const { getToken } = await auth()
  const token = await getToken()
  if (!token) redirect('/sign-in')

  let me: StaffUser
  try {
    me = await usersApi.sync(token)
  } catch {
    redirect('/dashboard')
  }
  if (!POS_ROLES.includes(me.role)) redirect('/dashboard')

  const [products, categories, registers, shift] = await Promise.all([
    productsApi.list({ status: 'ACTIVE' }).catch(() => []),
    categoriesApi.list().catch(() => []),
    posApi.listRegisters(token).catch(() => []),
    posApi.currentShift(token),
  ])

  return (
    <PosTerminal
      initialProducts={products}
      initialCategories={categories}
      initialRegisters={registers}
      initialShift={shift}
      cashier={{ id: me.id, name: me.name, role: me.role }}
    />
  )
}
