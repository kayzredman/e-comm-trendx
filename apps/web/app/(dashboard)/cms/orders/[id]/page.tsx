import { auth } from '@clerk/nextjs/server'
import { ordersApi } from '@/lib/api'
import { notFound } from 'next/navigation'
import OrderDetail from '../OrderDetail'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const { getToken } = await auth()
  const token = await getToken()

  if (!token) notFound()

  let order = null
  try {
    order = await ordersApi.get(id, token)
  } catch { /* not found or API down */ }

  if (!order) notFound()

  return <OrderDetail order={order} />
}
