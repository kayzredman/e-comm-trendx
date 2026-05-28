/**
 * One-shot migration: copy legacy `products.images: string[]` URLs into the
 * new `product_images` table as rows with source='external'.
 *
 * Idempotent: skips products that already have any product_images rows.
 *
 * Run:  pnpm tsx scripts/migrate-product-images.ts
 */
import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import { products, productImages } from '../packages/db/src/schema'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { ssl: 'require' })
const db = drizzle(client, { schema: { products, productImages } })

async function main() {
  const allProducts = await db.select().from(products)
  console.log(`Found ${allProducts.length} products total`)

  let migrated = 0
  let skipped = 0
  let empty = 0

  for (const p of allProducts) {
    const legacy = (p.images ?? []) as string[]
    if (legacy.length === 0) {
      empty++
      continue
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productImages)
      .where(eq(productImages.productId, p.id))
    if (count > 0) {
      skipped++
      continue
    }

    const rows = legacy
      .map((url) => url?.trim())
      .filter((u): u is string => !!u && /^https?:\/\//i.test(u))
      .map((url, idx) => ({
        productId: p.id,
        source: 'external' as const,
        externalUrl: url,
        alt: p.name,
        sortOrder: idx,
        isPrimary: idx === 0,
      }))

    if (rows.length === 0) {
      empty++
      continue
    }
    await db.insert(productImages).values(rows)
    migrated++
    console.log(`  ✓ ${p.name}: ${rows.length} image(s)`)
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} no-images=${empty}`)
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
