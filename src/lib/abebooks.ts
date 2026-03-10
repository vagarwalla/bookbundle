import type { Condition, Listing } from './types'

const PRICING_URL = 'https://www.abebooks.com/servlet/DWRestService/pricingservice'
const SEARCH_URL = 'https://www.abebooks.com/servlet/SearchResults'

export function normalizeCondition(cond: string): Condition {
  const c = cond.toLowerCase()
  if (c.includes('new') && !c.includes('like') && !c.includes('as')) return 'new'
  if (c.includes('like new') || c.includes('as new') || c.includes('fine')) return 'like_new'
  if (c.includes('very good')) return 'very_good'
  if (c.includes('good')) return 'good'
  return 'good'
}

const CONDITION_RANK: Record<Condition, number> = {
  new: 4,
  like_new: 3,
  very_good: 2,
  good: 1,
}

export function conditionMeets(actual: Condition, minimum: Condition): boolean {
  return CONDITION_RANK[actual] >= CONDITION_RANK[minimum]
}

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.abebooks.com/',
}

function searchUrl(isbn: string): string {
  return `${SEARCH_URL}?isbn=${isbn}&sortby=17&n=100110615`
}

function listingUrl(listingId: string | undefined, isbn: string): string {
  if (listingId && /^\d+$/.test(listingId)) {
    return `https://www.abebooks.com/servlet/BookDetailsPL?bi=${listingId}`
  }
  return searchUrl(isbn)
}

// Strategy 1: JSON pricing service API
async function fetchViaAPI(isbn: string): Promise<Listing[]> {
  const params = new URLSearchParams({
    bc: '1',
    bsi: '0',
    cam: '0',
    isbn,
    qty: '1',
    rtype: '3',
    sa: '0',
    stype: '0',
    tn: '0',
    wts: '1',
  })

  const res = await fetch(`${PRICING_URL}?${params}`, {
    headers: {
      ...BASE_HEADERS,
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) return []

  const data = await res.json()
  const books: Record<string, unknown>[] =
    data?.bookSearchResult?.books ||
    data?.books ||
    data?.listings ||
    []

  const listings: Listing[] = []

  for (let i = 0; i < books.length; i++) {
    const book = books[i]
    const price = parseFloat(String(book.bestPriceInPurchaseCurrency ?? book.price ?? '0'))
    if (!price || price <= 0) continue

    const shipping = parseFloat(String(book.shippingCost ?? '3.99'))
    const condition = String(book.condition ?? 'Good')
    const sellerInfo = book.sellerInfo as Record<string, string> | undefined
    const sellerId = String(sellerInfo?.sellerId ?? sellerInfo?.sellerUsername ?? `seller_${i}`)
    const sellerName = String(sellerInfo?.sellerName ?? sellerInfo?.sellerUsername ?? 'AbeBooks Seller')
    const listingId = String(book.listingId ?? book.listing_id ?? '')

    listings.push({
      listing_id: listingId || `${isbn}_${sellerId}_${i}`,
      seller_id: sellerId,
      seller_name: sellerName,
      price,
      shipping_base: isNaN(shipping) ? 3.99 : shipping,
      shipping_per_additional: 1.99,
      condition,
      condition_normalized: normalizeCondition(condition),
      url: listingUrl(listingId, isbn),
      isbn,
    })
  }

  return listings
}

// Strategy 2: parse embedded JSON from HTML search results
async function fetchViaHTML(isbn: string): Promise<Listing[]> {
  const res = await fetch(searchUrl(isbn), {
    headers: {
      ...BASE_HEADERS,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) return []
  const html = await res.text()
  return parseListingsFromHTML(html, isbn)
}

export async function fetchListingsByISBN(isbn: string): Promise<Listing[]> {
  try {
    const apiListings = await fetchViaAPI(isbn)
    if (apiListings.length > 0) return apiListings
  } catch (err) {
    console.error('AbeBooks API error:', err)
  }

  try {
    const htmlListings = await fetchViaHTML(isbn)
    if (htmlListings.length > 0) return htmlListings
  } catch (err) {
    console.error('AbeBooks HTML error:', err)
  }

  return []
}

function parseListingsFromHTML(html: string, isbn: string): Listing[] {
  const listings: Listing[] = []

  // Strategy A: __NEXT_DATA__ (Next.js embedded data)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/)
  if (nextDataMatch) {
    try {
      const data = JSON.parse(nextDataMatch[1])
      const pageProps = data?.props?.pageProps
      const rawListings =
        pageProps?.searchResult?.books ||
        pageProps?.listings ||
        pageProps?.initialState?.listings ||
        data?.props?.initialState?.listings ||
        []

      for (const raw of rawListings) {
        const price = parseFloat(String(
          raw.orderInfo?.surfacePrice ?? raw.price ?? raw.salePrice ?? '0'
        ))
        if (!price || price <= 0) continue

        const shipping = parseFloat(String(
          raw.orderInfo?.shippingInfo?.totalShipping ?? raw.shippingPrice ?? '3.99'
        ))
        const condition = raw.conditionInfo?.conditionDescription || raw.condition || 'Good'
        const sellerId = String(raw.sellerInfo?.sellerId || raw.sellerId || `seller_${listings.length}`)
        const sellerName = raw.sellerInfo?.sellerName || raw.sellerName || 'Unknown Seller'
        const listingId = raw.listingId || raw.id || raw.listing_id

        listings.push({
          listing_id: listingId || `${isbn}_${sellerId}_${listings.length}`,
          seller_id: sellerId,
          seller_name: sellerName,
          price,
          shipping_base: isNaN(shipping) ? 3.99 : shipping,
          shipping_per_additional: 1.99,
          condition,
          condition_normalized: normalizeCondition(condition),
          url: listingUrl(String(listingId ?? ''), isbn),
          isbn,
        })
      }

      if (listings.length > 0) return listings
    } catch { /* fall through */ }
  }

  // Strategy B: window.__INITIAL_STATE__ or window.pagedata
  const scriptMatch =
    html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});?\s*<\/script>/s) ||
    html.match(/window\.pagedata\s*=\s*({.+?});?\s*<\/script>/s)

  if (scriptMatch) {
    try {
      const data = JSON.parse(scriptMatch[1])
      const rawListings: Array<Record<string, unknown>> =
        data?.inventory?.listings || data?.listings || data?.searchResults?.listings || []

      for (const raw of rawListings) {
        if (!raw.bestPriceInPurchaseCurrency) continue
        const price = parseFloat(String(raw.bestPriceInPurchaseCurrency))
        const shipping = parseFloat(String(raw.shippingCost ?? '3.99'))
        const condition = String(raw.condition ?? 'Good')
        const sellerId = String(raw.sellerId ?? raw.sellerUsername ?? `seller_${listings.length}`)
        const sellerName = String(raw.sellerName ?? raw.sellerUsername ?? 'Unknown Seller')
        const listingId = raw.listing_id ? String(raw.listing_id) : undefined

        listings.push({
          listing_id: listingId || `${isbn}_${sellerId}_${listings.length}`,
          seller_id: sellerId,
          seller_name: sellerName,
          price,
          shipping_base: isNaN(shipping) ? 3.99 : shipping,
          shipping_per_additional: 1.99,
          condition,
          condition_normalized: normalizeCondition(condition),
          url: listingUrl(listingId, isbn),
          isbn,
        })
      }

      if (listings.length > 0) return listings
    } catch { /* fall through */ }
  }

  // Strategy C: HTML regex
  const listingRegex = /<li[^>]*data-seller-id="([^"]*)"[^>]*>[\s\S]*?<\/li>/g
  const priceRegex = /class="[^"]*item-price[^"]*"[^>]*>\s*\$?([\d,]+\.?\d*)/
  const sellerRegex = /data-seller-name="([^"]*)"/
  const condRegex = /class="[^"]*item-binding[^"]*"[^>]*>([^<]+)/
  const idRegex = /data-listing-id="([^"]*)"/

  let match
  while ((match = listingRegex.exec(html)) !== null) {
    const block = match[0]
    const sellerId = match[1]
    const priceMatch = priceRegex.exec(block)
    if (!priceMatch) continue

    const sellerMatch = sellerRegex.exec(block)
    const condMatch = condRegex.exec(block)
    const idMatch = idRegex.exec(block)
    const price = parseFloat(priceMatch[1].replace(',', ''))
    const sellerName = sellerMatch ? sellerMatch[1] : sellerId
    const condition = condMatch ? condMatch[1].trim() : 'Good'
    const listingId = idMatch ? idMatch[1] : undefined

    listings.push({
      listing_id: listingId || `${isbn}_${sellerId}`,
      seller_id: sellerId || `s_${listings.length}`,
      seller_name: sellerName,
      price,
      shipping_base: 3.99,
      shipping_per_additional: 1.99,
      condition,
      condition_normalized: normalizeCondition(condition),
      url: listingUrl(listingId, isbn),
      isbn,
    })
  }

  return listings
}
