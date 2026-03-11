import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { computeDHash } from '@/lib/dhash'
import { hammingDistance } from '@/lib/clustering'
import { areSameCover, borderlinePairs } from '@/lib/aiSimilarity'

const CONCURRENCY = 20

async function withConcurrency<T>(items: T[], fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  async function worker() {
    while (i < items.length) { const item = items[i++]; await fn(item) }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
}

function normalize(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === 'books.google.com') {
      u.searchParams.delete('source')
      u.searchParams.delete('edge')
    }
    return u.toString()
  } catch { return url }
}

// Union-Find
function buildClusters(urls: string[], samePairs: [string, string][]): Record<string, string> {
  const parent = new Map<string, string>(urls.map(u => [u, u]))
  function find(u: string): string {
    if (parent.get(u) !== u) parent.set(u, find(parent.get(u)!))
    return parent.get(u)!
  }
  for (const [a, b] of samePairs) {
    const ra = find(a), rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  return Object.fromEntries(urls.map(u => [u, find(u)]))
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.coverUrls)) {
    return NextResponse.json({ error: 'coverUrls required' }, { status: 400 })
  }

  const force: boolean = body.force === true
  const coverUrls: string[] = [...new Set((body.coverUrls as string[]).map(normalize))]

  // 1. Fetch cached hashes
  const { data: cachedHashes } = await supabase
    .from('cover_hashes')
    .select('cover_url, hash')
    .in('cover_url', coverUrls)

  const hashMap = new Map<string, string>()
  for (const row of cachedHashes ?? []) hashMap.set(row.cover_url, row.hash)

  // 2. Fetch and hash missing covers
  const missing = coverUrls.filter(u => !hashMap.has(u))
  const toUpsertHashes: { cover_url: string; hash: string }[] = []

  await withConcurrency(missing, async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return
      const ct = res.headers.get('content-type') ?? ''
      if (ct.startsWith('image/gif')) return
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 500) return
      const hash = await computeDHash(buf)
      hashMap.set(url, hash)
      toUpsertHashes.push({ cover_url: url, hash })
    } catch { /* skip */ }
  })

  if (toUpsertHashes.length > 0) {
    await supabase.from('cover_hashes').upsert(toUpsertHashes, { onConflict: 'cover_url' })
  }

  // 3. Build tier-1 pairs (Hamming ≤ 3 — definitely same)
  const urls = Array.from(hashMap.keys())
  const samePairs: [string, string][] = []
  for (let i = 0; i < urls.length; i++) {
    for (let j = i + 1; j < urls.length; j++) {
      const ha = BigInt('0x' + hashMap.get(urls[i])!)
      const hb = BigInt('0x' + hashMap.get(urls[j])!)
      if (hammingDistance(ha, hb) <= 3) {
        samePairs.push([urls[i], urls[j]])
      }
    }
  }

  // 4. Find borderline pairs (Hamming 4–10), check cache, call AI for uncached
  const candidates = borderlinePairs(hashMap)

  if (candidates.length > 0) {
    // Check similarity cache (skipped when force=true)
    const { data: cachedSim } = force ? { data: [] } : await supabase
      .from('cover_similarity')
      .select('cover_url_a, cover_url_b, is_same')
      .in('cover_url_a', candidates.map(p => p[0]))

    const simCache = new Map<string, boolean>()
    for (const row of cachedSim ?? []) {
      simCache.set(`${row.cover_url_a}|||${row.cover_url_b}`, row.is_same)
    }

    const uncached = candidates.filter(([a, b]) => !simCache.has(`${a}|||${b}`))
    const toUpsertSim: { cover_url_a: string; cover_url_b: string; is_same: boolean }[] = []

    // Call Claude for uncached borderline pairs (parallel)
    await Promise.all(uncached.map(async ([a, b]) => {
      const result = await areSameCover(a, b)
      if (result !== null) {
        simCache.set(`${a}|||${b}`, result)
        toUpsertSim.push({ cover_url_a: a, cover_url_b: b, is_same: result })
      }
    }))

    if (toUpsertSim.length > 0) {
      await supabase.from('cover_similarity').upsert(toUpsertSim, { onConflict: 'cover_url_a,cover_url_b' })
    }

    // Add AI-confirmed pairs to samePairs
    for (const [a, b] of candidates) {
      if (simCache.get(`${a}|||${b}`) === true) {
        samePairs.push([a, b])
      }
    }
  }

  // 5. Build and return cluster assignments
  const clusters = buildClusters(urls, samePairs)
  return NextResponse.json({ clusters })
}
