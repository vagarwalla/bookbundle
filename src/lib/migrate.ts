/**
 * Auto-migration runner for Supabase.
 *
 * How it works:
 *  1. Reads all .sql files from supabase/migrations/ in alphabetical order.
 *  2. Maintains a `schema_migrations` table in Supabase to track which have run.
 *  3. On server startup (via instrumentation.ts), applies any pending migrations.
 *
 * Requires SUPABASE_ACCESS_TOKEN in env — a Personal Access Token from
 * https://supabase.com/dashboard/account/tokens
 * Add it to .env.local (server-only, never exposed to the client).
 */

import fs from 'fs'
import path from 'path'

const PROJECT_REF = 'xkwiugwafgcmcwlyzawq'
const MGMT_API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function runSQL(sql: string, token: string): Promise<{ error?: string }> {
  const res = await fetch(MGMT_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const body = await res.text()
    return { error: `HTTP ${res.status}: ${body}` }
  }
  return {}
}

export async function applyMigrations() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) {
    console.log('[migrate] No SUPABASE_ACCESS_TOKEN set — skipping auto-migration.')
    return
  }

  // Ensure tracking table exists
  const { error: createErr } = await runSQL(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'schema_migrations' AND policyname = 'service_only'
      ) THEN
        CREATE POLICY "service_only" ON schema_migrations FOR ALL USING (false);
      END IF;
    END $$;
  `, token)
  if (createErr) {
    console.error('[migrate] Failed to create schema_migrations table:', createErr)
    return
  }

  // Fetch already-applied migrations
  const listRes = await fetch(MGMT_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'SELECT version FROM schema_migrations ORDER BY version' }),
  })
  const listData = await listRes.json()
  const applied = new Set<string>(
    (listData as Array<{ version: string }>).map((r) => r.version)
  )

  // Read migration files
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  if (!fs.existsSync(migrationsDir)) return

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let ran = 0
  for (const file of files) {
    if (applied.has(file)) continue

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    console.log(`[migrate] Applying ${file}…`)

    const { error } = await runSQL(sql, token)
    if (error) {
      console.error(`[migrate] Failed to apply ${file}:`, error)
      return // stop on first failure
    }

    await runSQL(
      `INSERT INTO schema_migrations (version) VALUES ('${file.replace(/'/g, "''")}')`,
      token
    )
    console.log(`[migrate] ✓ ${file}`)
    ran++
  }

  if (ran === 0) {
    console.log('[migrate] All migrations already applied.')
  } else {
    console.log(`[migrate] Applied ${ran} migration(s).`)
  }
}
