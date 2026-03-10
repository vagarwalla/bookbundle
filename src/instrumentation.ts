export async function register() {
  // Only run on the Node.js server runtime (not in the Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { applyMigrations } = await import('./lib/migrate')
      await applyMigrations()
    } catch (err) {
      // Migration errors must not crash the server — log and continue
      console.error('[instrumentation] Migration failed, server will start anyway:', err)
    }
  }
}
