import postgres from 'postgres'
const sql = postgres(process.env.DB_URL!, { ssl: 'require' })
const orders = await sql`SELECT id, status, payment_method, payment_status, total, updated_at FROM orders WHERE id='stg1ghsuk3k3z'`
console.table(orders)
const intents = await sql`SELECT reference, status, amount_minor, channel, paid_at, failure_reason FROM payment_intents WHERE order_id='stg1ghsuk3k3z' ORDER BY created_at DESC`
console.table(intents)
const events = await sql`SELECT event_type, processed, error, received_at FROM payment_events WHERE intent_id IN (SELECT id FROM payment_intents WHERE order_id='stg1ghsuk3k3z') ORDER BY received_at DESC LIMIT 10`
console.table(events)
await sql.end()
