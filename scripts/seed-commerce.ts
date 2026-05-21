/**
 * TrendMarga Commerce Seed Script
 * Generates 60 customers + 150 orders across 30 days with realistic spread
 * Run: cd /Users/kwekku/Desktop/Builds/trendX && pnpm tsx scripts/seed-commerce.ts
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { customers, orders, orderItems } from '../packages/db/src/schema'
import { createId } from '@paralleldrive/cuid2'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const client = postgres(DATABASE_URL, { ssl: 'require' })
const db = drizzle(client)

// ─── Ghana customer pool ───────────────────────────────────────────────────────
const NAMES = [
  'Kwame Mensah', 'Abena Owusu', 'Kofi Asante', 'Ama Boateng', 'Yaw Darko',
  'Akosua Appiah', 'Kweku Ofori', 'Efua Amoah', 'Nana Adjei', 'Adwoa Tetteh',
  'Kojo Frimpong', 'Akua Antwi', 'Fiifi Agyemang', 'Araba Asare', 'Kobby Nkrumah',
  'Gifty Osei', 'Kwabena Twum', 'Benedicta Amankwah', 'Ato Hayford', 'Maame Sarpong',
  'Prince Asiedu', 'Christiana Quaye', 'Emmanuel Acheampong', 'Victoria Opoku', 'Samuel Boadu',
  'Esther Gyasi', 'Kwadwo Bonsu', 'Patience Owusu', 'Bright Akyeampong', 'Cecilia Bimpong',
  'Dominic Anane', 'Felicia Ampofo', 'George Kusi', 'Helena Brew', 'Isaac Asante',
  'Joyce Mensah', 'Kelvin Aidoo', 'Linda Frimpong', 'Maxwell Boateng', 'Nancy Adusei',
  'Oppong Nkrumah', 'Portia Darko', 'Quentin Asare', 'Rita Addae', 'Stephen Ofori',
  'Theresa Antwi', 'Ursula Tetteh', 'Victor Appiah', 'Wendy Adjei', 'Xavier Amoah',
  'Yaa Serwah', 'Zipporah Owusu', 'Alfred Koomson', 'Bernice Asante', 'Charles Mensah',
  'Diana Boateng', 'Edward Frimpong', 'Florence Anane', 'Gregory Asiedu', 'Hannah Quaye',
]

const CITIES = [
  { city: 'Accra', region: 'Greater Accra' },
  { city: 'Kumasi', region: 'Ashanti' },
  { city: 'Tema', region: 'Greater Accra' },
  { city: 'Takoradi', region: 'Western' },
  { city: 'Tamale', region: 'Northern' },
  { city: 'Cape Coast', region: 'Central' },
  { city: 'Koforidua', region: 'Eastern' },
  { city: 'Ho', region: 'Volta' },
  { city: 'Sunyani', region: 'Bono' },
  { city: 'Wa', region: 'Upper West' },
]

const STREETS = [
  'Liberation Road', 'Ring Road Central', 'Spintex Road', 'Cantonments Road',
  'Osu Oxford Street', 'Labadi Road', 'East Legon Avenue', 'Madina Highway',
  'Adum High Street', 'Bantama Road', 'Asokwa Junction', 'Nhyiaeso Close',
  'Harbour Road', 'Market Circle', 'Anaji Road',
]

const PHONES = () => {
  const prefixes = ['024', '054', '055', '020', '050', '059', '027', '057']
  return prefixes[Math.floor(Math.random() * prefixes.length)] +
    String(Math.floor(Math.random() * 9000000) + 1000000)
}

// All product IDs from the main seed + their prices
const PRODUCTS = [
  { id: 'prod_001', name: "Men's Slim Fit Ankara Shirt",      price: 89.00 },
  { id: 'prod_002', name: "Women's Kente Wrap Dress",         price: 145.00 },
  { id: 'prod_003', name: 'Classic White Linen Shirt',        price: 75.00 },
  { id: 'prod_004', name: 'Jogger Pants — Charcoal',          price: 65.00 },
  { id: 'prod_005', name: 'Crop Top Set — Summer Edition',    price: 120.00 },
  { id: 'prod_011', name: 'Air Cushion Running Sneakers',     price: 180.00 },
  { id: 'prod_012', name: "Women's Platform Heels",           price: 210.00 },
  { id: 'prod_013', name: "Men's Leather Oxford Shoes",       price: 290.00 },
  { id: 'prod_014', name: 'Casual Slip-On Loafers',           price: 135.00 },
  { id: 'prod_021', name: 'Leather Tote Bag — Tan',           price: 320.00 },
  { id: 'prod_022', name: 'Mini Crossbody Bag',               price: 95.00 },
  { id: 'prod_023', name: "Men's Canvas Backpack",            price: 150.00 },
  { id: 'prod_031', name: 'Wireless Earbuds — Pro',           price: 399.00 },
  { id: 'prod_032', name: 'Smart Watch — Series X',           price: 650.00 },
  { id: 'prod_041', name: 'Moisturising Face Cream SPF30',    price: 55.00 },
  { id: 'prod_042', name: 'Natural Hair Growth Oil',          price: 70.00 },
  { id: 'prod_051', name: 'iPhone 15 Pro Max 256GB',          price: 8500.00 },
  { id: 'prod_052', name: 'Samsung Galaxy A54 128GB',         price: 2200.00 },
  { id: 'prod_061', name: 'Non-Stick Cooking Set 8pc',        price: 180.00 },
  { id: 'prod_062', name: 'Premium Pillow Set (2pc)',         price: 130.00 },
  { id: 'prod_071', name: 'Yoga Mat — Anti-Slip 6mm',         price: 80.00 },
  { id: 'prod_072', name: 'Resistance Bands Set — 5 Levels',  price: 55.00 },
  { id: 'prod_073', name: 'Premium Gym Gloves',               price: 40.00 },
]

const ORDER_STATUSES = [
  'PENDING', 'PENDING',
  'CONFIRMED', 'CONFIRMED',
  'PROCESSING', 'PROCESSING',
  'OUT_FOR_DELIVERY',
  'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', 'DELIVERED', // heavy bias to delivered
  'CANCELLED',
] as const

const PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'MOBILE_MONEY', 'MOBILE_MONEY', 'CARD'] as const

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function rand(min: number, max: number) { return Math.random() * (max - min) + min }

function makeDate(daysAgo: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  // random time of day
  d.setHours(Math.floor(rand(8, 22)), Math.floor(rand(0, 59)), Math.floor(rand(0, 59)))
  return d
}

async function seed() {
  console.log('🌱 Seeding commerce data (customers + orders)...\n')

  // ── Wipe old seeded commerce data ──────────────────────────────────────────
  console.log('🗑  Clearing old orders, order_items, customers...')
  await db.delete(orderItems)
  await db.delete(orders)
  await db.delete(customers)
  console.log('   ✓ Cleared\n')

  // ── Customers ──────────────────────────────────────────────────────────────
  console.log('👥 Inserting 60 customers...')
  const customerRecords = NAMES.map((name, i) => {
    const loc = pick(CITIES)
    return {
      id: `cust_${String(i + 1).padStart(3, '0')}`,
      name,
      email: name.toLowerCase().replace(/ /g, '.') + `${i + 1}@gmail.com`,
      phone: PHONES(),
      address: {
        street: `${Math.floor(rand(1, 99))} ${pick(STREETS)}`,
        city: loc.city,
        region: loc.region,
        country: 'Ghana',
        zip: null,
      },
    }
  })
  await db.insert(customers).values(customerRecords)
  console.log(`   ✓ ${customerRecords.length} customers\n`)

  // ── Orders — spread across last 30 days with more weight on recent days ───
  console.log('🛒 Generating 150 orders across the last 30 days...')

  const orderRecords = []
  const orderItemRecords = []

  for (let i = 0; i < 150; i++) {
    // Weight recent days more heavily (pareto-ish)
    const dayWeight = Math.floor(Math.pow(Math.random(), 0.6) * 30)
    const createdAt = makeDate(dayWeight)
    const updatedAt = new Date(createdAt.getTime() + Math.floor(rand(0, 3 * 3600 * 1000)))

    const customer = pick(customerRecords)
    const status = pick(ORDER_STATUSES)
    const paymentMethod = pick(PAYMENT_METHODS)
    const deliveryFee = pick([15, 20, 25, 30, 35, 0, 0])

    // 1–3 items per order
    const itemCount = Math.floor(rand(1, 4))
    const selectedProducts = [...PRODUCTS].sort(() => 0.5 - Math.random()).slice(0, itemCount)

    let subtotal = 0
    const items = selectedProducts.map(p => {
      const qty = Math.floor(rand(1, 4))
      subtotal += p.price * qty
      return {
        id: createId(),
        orderId: '',          // set below
        productId: p.id,
        productName: p.name,
        unitPrice: String(p.price.toFixed(2)),
        quantity: qty,
      }
    })

    const total = subtotal + deliveryFee
    const orderId = createId()
    items.forEach(item => { item.orderId = orderId })

    orderRecords.push({
      id: orderId,
      customerId: customer.id,
      status,
      subtotal: String(subtotal.toFixed(2)),
      deliveryFee: String(deliveryFee.toFixed(2)),
      total: String(total.toFixed(2)),
      paymentMethod,
      notes: null,
      createdAt,
      updatedAt,
    })
    orderItemRecords.push(...items)
  }

  // Insert in batches
  const BATCH = 50
  for (let i = 0; i < orderRecords.length; i += BATCH) {
    await db.insert(orders).values(orderRecords.slice(i, i + BATCH) as any)
  }
  for (let i = 0; i < orderItemRecords.length; i += BATCH) {
    await db.insert(orderItems).values(orderItemRecords.slice(i, i + BATCH) as any)
  }

  console.log(`   ✓ ${orderRecords.length} orders, ${orderItemRecords.length} order items\n`)
  console.log('✅ Commerce seed complete!\n')
  console.log('Summary:')
  const statuses = orderRecords.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc }, {} as Record<string, number>)
  Object.entries(statuses).forEach(([k, v]) => console.log(`   ${k}: ${v}`))
  await client.end()
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1) })
