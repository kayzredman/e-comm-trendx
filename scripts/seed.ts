/**
 * TrendMarga Seed Script
 * Run: pnpm tsx scripts/seed.ts
 * Clears and re-seeds categories + products with realistic Ghana market data.
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { categories, products } from '../packages/db/src/schema'
import { eq } from 'drizzle-orm'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

const client = postgres(DATABASE_URL, { ssl: 'require' })
const db = drizzle(client)

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'cat_fashion',
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80',
  },
  {
    id: 'cat_shoes',
    name: 'Shoes & Footwear',
    slug: 'shoes-footwear',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
  },
  {
    id: 'cat_bags',
    name: 'Bags & Accessories',
    slug: 'bags-accessories',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
  },
  {
    id: 'cat_electronics',
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80',
  },
  {
    id: 'cat_beauty',
    name: 'Beauty & Skincare',
    slug: 'beauty-skincare',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80',
  },
  {
    id: 'cat_phones',
    name: 'Phones & Tablets',
    slug: 'phones-tablets',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80',
  },
  {
    id: 'cat_home',
    name: 'Home & Living',
    slug: 'home-living',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80',
  },
  {
    id: 'cat_sports',
    name: 'Sports & Fitness',
    slug: 'sports-fitness',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80',
  },
]

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── Fashion & Clothing ───────────────────────────────────────────────────
  {
    id: 'prod_001', name: 'Men\'s Slim Fit Ankara Shirt', slug: 'mens-slim-fit-ankara-shirt',
    description: 'Vibrant Ankara print shirt. Perfect for casual and smart-casual occasions. 100% cotton, true to size.',
    price: '89.00', comparePrice: '130.00', sku: 'ANK-001', inventory: 45, categoryId: 'cat_fashion', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=600&q=80',
      'https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=600&q=80',
    ],
  },
  {
    id: 'prod_002', name: 'Women\'s Kente Wrap Dress', slug: 'womens-kente-wrap-dress',
    description: 'Elegant kente-inspired wrap dress. Flattering silhouette, bold colours. Perfect for events and gatherings.',
    price: '145.00', comparePrice: '200.00', sku: 'KEN-002', inventory: 28, categoryId: 'cat_fashion', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80',
      'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80',
    ],
  },
  {
    id: 'prod_003', name: 'Classic White Linen Shirt', slug: 'classic-white-linen-shirt',
    description: 'Breathable linen shirt for the Ghanaian heat. Relaxed fit, perfect for work or weekends.',
    price: '75.00', comparePrice: null, sku: 'LIN-003', inventory: 60, categoryId: 'cat_fashion', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&q=80',
    ],
  },
  {
    id: 'prod_004', name: 'Jogger Pants — Charcoal', slug: 'jogger-pants-charcoal',
    description: 'Comfortable tapered joggers with adjustable waistband. Great for gym or casual outings.',
    price: '65.00', comparePrice: '90.00', sku: 'JOG-004', inventory: 80, categoryId: 'cat_fashion', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80',
    ],
  },
  {
    id: 'prod_005', name: 'Crop Top Set — Summer Edition', slug: 'crop-top-set-summer',
    description: 'Two-piece matching crop top and skirt set. Available in 4 colours. Makes you stand out!',
    price: '120.00', comparePrice: '160.00', sku: 'CRP-005', inventory: 35, categoryId: 'cat_fashion', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
    ],
  },

  // ── Shoes & Footwear ─────────────────────────────────────────────────────
  {
    id: 'prod_011', name: 'Air Cushion Running Sneakers', slug: 'air-cushion-running-sneakers',
    description: 'Lightweight running shoes with air cushion sole. Superior comfort for all-day wear.',
    price: '180.00', comparePrice: '250.00', sku: 'SNK-011', inventory: 42, categoryId: 'cat_shoes', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80',
    ],
  },
  {
    id: 'prod_012', name: 'Women\'s Platform Heels', slug: 'womens-platform-heels',
    description: 'Elegant platform heels with cushioned insole. 4-inch heel. Perfect for every occasion.',
    price: '210.00', comparePrice: '280.00', sku: 'HEL-012', inventory: 22, categoryId: 'cat_shoes', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80',
    ],
  },
  {
    id: 'prod_013', name: 'Men\'s Leather Oxford Shoes', slug: 'mens-leather-oxford',
    description: 'Classic leather oxford shoes. Polished finish, durable sole. For the professional gentleman.',
    price: '290.00', comparePrice: null, sku: 'OXF-013', inventory: 18, categoryId: 'cat_shoes', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600&q=80',
    ],
  },
  {
    id: 'prod_014', name: 'Casual Slip-On Loafers', slug: 'casual-slip-on-loafers',
    description: 'Comfortable slip-on loafers. Great for office or casual wear. Memory foam insole.',
    price: '135.00', comparePrice: '170.00', sku: 'LOA-014', inventory: 55, categoryId: 'cat_shoes', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&q=80',
    ],
  },

  // ── Bags & Accessories ───────────────────────────────────────────────────
  {
    id: 'prod_021', name: 'Leather Tote Bag — Tan', slug: 'leather-tote-bag-tan',
    description: 'Spacious genuine leather tote bag. Multiple interior compartments, magnetic closure.',
    price: '320.00', comparePrice: '420.00', sku: 'TOT-021', inventory: 15, categoryId: 'cat_bags', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80',
    ],
  },
  {
    id: 'prod_022', name: 'Mini Crossbody Bag', slug: 'mini-crossbody-bag',
    description: 'Compact and stylish crossbody bag. Adjustable strap, zip closure. Perfect for everyday use.',
    price: '95.00', comparePrice: '130.00', sku: 'CRB-022', inventory: 40, categoryId: 'cat_bags', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&q=80',
    ],
  },
  {
    id: 'prod_023', name: 'Men\'s Canvas Backpack', slug: 'mens-canvas-backpack',
    description: '20L canvas backpack with laptop sleeve. Durable and lightweight. Great for school or travel.',
    price: '150.00', comparePrice: '190.00', sku: 'BAK-023', inventory: 33, categoryId: 'cat_bags', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    ],
  },

  // ── Electronics & Gadgets ────────────────────────────────────────────────
  {
    id: 'prod_031', name: 'Wireless Earbuds — Pro', slug: 'wireless-earbuds-pro',
    description: 'True wireless earbuds with ANC, 30hr battery life (with case), IPX5 water resistance.',
    price: '399.00', comparePrice: '550.00', sku: 'EAR-031', inventory: 50, categoryId: 'cat_electronics', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
    ],
  },
  {
    id: 'prod_032', name: 'Smart Watch — Series X', slug: 'smart-watch-series-x',
    description: 'Feature-packed smartwatch with health tracking, GPS, AMOLED display. 7-day battery life.',
    price: '680.00', comparePrice: '850.00', sku: 'SWT-032', inventory: 25, categoryId: 'cat_electronics', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
    ],
  },
  {
    id: 'prod_033', name: 'Bluetooth Portable Speaker', slug: 'bluetooth-portable-speaker',
    description: 'Loud 360° sound, IPX7 waterproof, 24hr battery. Perfect for outdoors and parties.',
    price: '250.00', comparePrice: '350.00', sku: 'SPK-033', inventory: 30, categoryId: 'cat_electronics', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
    ],
  },
  {
    id: 'prod_034', name: 'USB-C 65W Fast Charger', slug: 'usb-c-65w-fast-charger',
    description: 'GaN 65W USB-C fast charger. Charges laptop + phone simultaneously. Compact travel-friendly design.',
    price: '85.00', comparePrice: '120.00', sku: 'CHG-034', inventory: 100, categoryId: 'cat_electronics', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&q=80',
    ],
  },

  // ── Beauty & Skincare ────────────────────────────────────────────────────
  {
    id: 'prod_041', name: 'Shea Butter Body Cream', slug: 'shea-butter-body-cream',
    description: 'Pure Ghanaian shea butter enriched with vitamin E and aloe vera. Deeply moisturising, non-greasy.',
    price: '45.00', comparePrice: '60.00', sku: 'SKN-041', inventory: 120, categoryId: 'cat_beauty', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80',
    ],
  },
  {
    id: 'prod_042', name: 'Glow Serum — Vitamin C', slug: 'glow-serum-vitamin-c',
    description: 'Brightening vitamin C serum that evens skin tone and reduces dark spots. Suitable for all skin types.',
    price: '110.00', comparePrice: '150.00', sku: 'SRM-042', inventory: 65, categoryId: 'cat_beauty', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80',
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
    ],
  },
  {
    id: 'prod_043', name: 'Matte Lipstick Set — 6 Shades', slug: 'matte-lipstick-set',
    description: 'Long-lasting matte formula. 6 gorgeous shades from nude to bold. Enriched with castor oil.',
    price: '75.00', comparePrice: '100.00', sku: 'LIP-043', inventory: 90, categoryId: 'cat_beauty', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1586495777744-4e6232bf4847?w=600&q=80',
    ],
  },

  // ── Phones & Tablets ─────────────────────────────────────────────────────
  {
    id: 'prod_051', name: 'Tecno Spark 20 Pro — 8GB/256GB', slug: 'tecno-spark-20-pro',
    description: '50MP RGBW camera, 5000mAh battery, 6.78" HD+ display. 8GB RAM + 256GB storage. Dual SIM.',
    price: '1650.00', comparePrice: '1900.00', sku: 'PHN-051', inventory: 20, categoryId: 'cat_phones', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
      'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600&q=80',
    ],
  },
  {
    id: 'prod_052', name: 'Samsung Galaxy A35 — 128GB', slug: 'samsung-galaxy-a35',
    description: '50MP triple camera, 5000mAh battery, 6.6" Super AMOLED display. 128GB storage.',
    price: '2100.00', comparePrice: '2400.00', sku: 'PHN-052', inventory: 12, categoryId: 'cat_phones', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600&q=80',
    ],
  },
  {
    id: 'prod_053', name: 'Infinix Zero 40 — 256GB', slug: 'infinix-zero-40',
    description: '108MP camera, 90W charging, 6.78" AMOLED 144Hz display. 8GB RAM, 256GB storage.',
    price: '1850.00', comparePrice: null, sku: 'PHN-053', inventory: 18, categoryId: 'cat_phones', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&q=80',
    ],
  },

  // ── Home & Living ────────────────────────────────────────────────────────
  {
    id: 'prod_061', name: 'Decorative Throw Pillow Set', slug: 'decorative-throw-pillow-set',
    description: 'Set of 4 premium throw pillows with African-inspired print covers. Adds warmth to any space.',
    price: '95.00', comparePrice: '140.00', sku: 'HOM-061', inventory: 50, categoryId: 'cat_home', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
    ],
  },
  {
    id: 'prod_062', name: 'Bamboo Kitchen Organiser Set', slug: 'bamboo-kitchen-organiser',
    description: 'Eco-friendly bamboo kitchen set — cutting board, utensil holder, dish rack. Elegant and durable.',
    price: '130.00', comparePrice: '170.00', sku: 'HOM-062', inventory: 40, categoryId: 'cat_home', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    ],
  },

  // ── Sports & Fitness ─────────────────────────────────────────────────────
  {
    id: 'prod_071', name: 'Yoga Mat — Anti-Slip 6mm', slug: 'yoga-mat-anti-slip-6mm',
    description: 'Extra thick 6mm yoga mat with anti-slip surface. Includes carry strap. Great for all levels.',
    price: '80.00', comparePrice: '110.00', sku: 'SPT-071', inventory: 70, categoryId: 'cat_sports', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600&q=80',
    ],
  },
  {
    id: 'prod_072', name: 'Resistance Bands Set — 5 Levels', slug: 'resistance-bands-set',
    description: 'Set of 5 resistance bands from light to heavy. Includes carry bag and workout guide.',
    price: '55.00', comparePrice: '75.00', sku: 'SPT-072', inventory: 95, categoryId: 'cat_sports', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
    ],
  },
  {
    id: 'prod_073', name: 'Premium Gym Gloves', slug: 'premium-gym-gloves',
    description: 'Full-palm padding, wrist support, anti-slip grip. Great for weightlifting and cross-training.',
    price: '40.00', comparePrice: null, sku: 'SPT-073', inventory: 120, categoryId: 'cat_sports', status: 'ACTIVE' as const,
    images: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    ],
  },
]

async function seed() {
  console.log('🌱 Seeding TrendMarga database...\n')

  // Clear existing data (products first due to FK)
  console.log('🗑  Clearing existing products & categories...')
  await db.delete(products)
  await db.delete(categories)
  console.log('   ✓ Cleared\n')

  // Insert categories
  console.log('📂 Inserting categories...')
  for (const cat of CATEGORIES) {
    await db.insert(categories).values(cat).onConflictDoNothing()
    console.log(`   ✓ ${cat.name}`)
  }

  // Insert products
  console.log('\n📦 Inserting products...')
  for (const product of PRODUCTS) {
    await db.insert(products).values(product).onConflictDoNothing()
    console.log(`   ✓ ${product.name}`)
  }

  console.log(`\n✅ Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} products`)
  await client.end()
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1) })
