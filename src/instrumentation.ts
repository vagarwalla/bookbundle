export async function register() {
  // Only run on the Node.js server runtime (not in the Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { applyMigrations } = await import('./lib/migrate')
    await applyMigrations()
  }
}
