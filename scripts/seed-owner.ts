import postgres from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1) }

async function run() {
  const client = postgres(DATABASE_URL!, { ssl: 'require' })
  const rows = await client`
    INSERT INTO users (id, clerk_id, email, name, role, created_at, updated_at)
    VALUES (
      'usr_kayzredman',
      'user_3E30jh4EWfsuEMh9gv2yiu7EEqq',
      'kayzredman@gmail.com',
      'Kay Streams',
      'OWNER',
      NOW(), NOW()
    )
    ON CONFLICT (clerk_id) DO UPDATE SET role = 'OWNER', updated_at = NOW()
    RETURNING id, email, role
  `
  console.log('✅ Done:', rows[0])
  await client.end()
}

run().catch(e => { console.error(e); process.exit(1) })
