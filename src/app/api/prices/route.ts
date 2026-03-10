import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { fetchListingsByISBN } from '@/lib/abebooks'
import type { Listing, PriceResponse, SourceInfo } from '@/lib/types'

const CACHE_TTL_HOURS = 6

// Other stores we link to for manual browsing (we don't scrape these)
const BROWSE_SOURCES = [
  { name: 'ThriftBooks', search_url: (isbn: string) => `https://www.thriftbooks.com/browse/?b.search=${isbn}` },
  { name: 'BetterWorldBooks', search_url: (isbn: string) => `https://www.betterworldbooks.com/search/results?q=${isbn}` },
]

export async function POST(req: NextRequest) {
  const { isbns }: { isbns: string[] } = await req.json()
  if (!isbns || isbns.length === 0) {
    return NextResponse.json({ listings: {}, sources: [] } satisfies PriceResponse)
  }

  const allListings: Record<string, Listing[]> = {}
  let totalFound = 0

  for (const isbn of isbns) {
    // Check cache
    const { data: cached } = await supabase
      .from('price_cache')
      .select('listings, cached_at')
      .eq('isbn', isbn)
      .single()

    if (cached) {
      const age = Date.now() - new Date(cached.cached_at).getTime()
      if (age < CACHE_TTL_HOURS * 3600 * 1000) {
        allListings[isbn] = cached.listings as Listing[]
        totalFound += (cached.listings as Listing[]).length
        continue
      }
    }

    // Fetch fresh
    const listings = await fetchListingsByISBN(isbn)
    allListings[isbn] = listings

    // Only cache real results (price > 0 means actual listings)
    if (listings.some((l) => l.price > 0)) {
      totalFound += listings.length
      await supabase.from('price_cache').upsert({
        isbn,
        listings,
        cached_at: new Date().toISOString(),
      })
    }
  }

  // Build source info — we always try AbeBooks; others are browse-only links
  // Use the first ISBN as a representative search (they'll all have different ISBNs anyway)
  const representativeIsbn = isbns[0]
  const sources: SourceInfo[] = [
    {
      name: 'AbeBooks',
      search_url: `https://www.abebooks.com/servlet/SearchResults?isbn=${representativeIsbn}&sortby=17`,
      found: totalFound,
    },
    ...BROWSE_SOURCES.map((s) => ({
      name: s.name,
      search_url: s.search_url(representativeIsbn),
      found: -1, // -1 = not searched, just linked
    })),
  ]

  return NextResponse.json({ listings: allListings, sources } satisfies PriceResponse)
}
