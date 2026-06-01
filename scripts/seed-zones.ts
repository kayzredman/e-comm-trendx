/**
 * Seed delivery zones for staging
 */
import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

async function run() {
  const client = postgres(DATABASE_URL!, { ssl: 'require' })

  await client`DELETE FROM delivery_zones`

  // Business rule: Accra zones accept Cash on Delivery. All other regions
  // must prepay before dispatch (set via requires_prepayment).
  const zones = [
    { id: 'zone_accra',    name: 'Accra Central',        base_fee: '15.00', fee_strategy: 'FLAT',           free_threshold: '200.00', fee_per_km: null, requires_prepayment: false },
    { id: 'zone_accra2',   name: 'Accra Suburbs',        base_fee: '25.00', fee_strategy: 'FLAT',           free_threshold: '300.00', fee_per_km: null, requires_prepayment: false },
    { id: 'zone_kumasi',   name: 'Kumasi',               base_fee: '35.00', fee_strategy: 'FLAT',           free_threshold: '400.00', fee_per_km: null, requires_prepayment: true  },
    { id: 'zone_tema',     name: 'Tema',                 base_fee: '20.00', fee_strategy: 'FREE_THRESHOLD', free_threshold: '250.00', fee_per_km: null, requires_prepayment: true  },
    { id: 'zone_takoradi', name: 'Takoradi / Western',   base_fee: '50.00', fee_strategy: 'FLAT',           free_threshold: null,     fee_per_km: null, requires_prepayment: true  },
    { id: 'zone_tamale',   name: 'Tamale / Northern',    base_fee: '65.00', fee_strategy: 'FLAT',           free_threshold: null,     fee_per_km: null, requires_prepayment: true  },
  ]

  for (const z of zones) {
    await client`
      INSERT INTO delivery_zones
        (id, name, base_fee, fee_strategy, free_threshold, fee_per_km, requires_prepayment, is_active)
      VALUES (
        ${z.id}, ${z.name}, ${z.base_fee}, ${z.fee_strategy as any},
        ${z.free_threshold}, ${z.fee_per_km}, ${z.requires_prepayment}, true
      )
    `
    console.log(`   ✓ ${z.name}${z.requires_prepayment ? ' (prepay)' : ''}`)
  }

  console.log(`\n✅ Seeded ${zones.length} delivery zones`)
  await client.end()
}

run().catch(e => { console.error(e); process.exit(1) })
