import type { Condition, Listing } from './types'

// AbeBooks pricing service endpoint
const PRICING_URL = 'https://www.abebooks.com/servlet/DWRestService/pricingservice'
const SEARCH_URL = 'https://www.abebooks.com/servlet/SearchResults'

// Suppress unused variable warnings for constants kept for documentation purposes
void PRICING_URL

function normalizeCondition(cond: string): Condition {
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

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.abebooks.com/',
}

interface AbeListingRaw {
  listing_id?: string
  sellerId?: string
  sellerName?: string
  sellerUsername?: string
  bestPriceInPurchaseCurrency?: number | string
  shippingCost?: number | string
  condition?: string
  isbn?: string
}

export async function fetchListingsByISBN(isbn: string): Promise<Listing[]> {
  try {
    // Use the AbeBooks search results page with ISBN
    const params = new URLSearchParams({
      isbn: isbn,
      sts: 't',
      cm_sp: 'SearchF-_-topnav-_-Results',
      an: '',
      tn: '',
      kn: '',
      lang: 'en',
      n: '100110615',  // US books
      sortby: '17',    // price + shipping low to high
    })

    const url = `${SEARCH_URL}?${params}`
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      console.error(`AbeBooks search failed: ${res.status}`)
      return []
    }

    const html = await res.text()
    return parseListingsFromHTML(html, isbn)
  } catch (err) {
    console.error('AbeBooks fetch error:', err)
    return []
  }
}

function parseListingsFromHTML(html: string, isbn: string): Listing[] {
  const listings: Listing[] = []

  // AbeBooks embeds listing data as JSON in script tags
  // Look for the listings data in the page
  const scriptMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});?\s*<\/script>/s) ||
                      html.match(/window\.pagedata\s*=\s*({.+?});?\s*<\/script>/s)

  if (scriptMatch) {
    try {
      const data = JSON.parse(scriptMatch[1])
      const rawListings: AbeListingRaw[] = data?.inventory?.listings ||
                     data?.listings ||
                     data?.searchResults?.listings || []

      for (const raw of rawListings) {
        if (!raw.bestPriceInPurchaseCurrency) continue

        const price = parseFloat(String(raw.bestPriceInPurchaseCurrency))
        const shipping = parseFloat(String(raw.shippingCost ?? '3.99'))
        const condition = raw.condition || 'Good'
        const conditionNorm = normalizeCondition(condition)
        const sellerId = raw.sellerId || raw.sellerUsername || `seller_${listings.length}`
        const sellerName = raw.sellerName || raw.sellerUsername || 'Unknown Seller'
        const listingId = raw.listing_id || `${isbn}_${sellerId}_${listings.length}`

        listings.push({
          listing_id: listingId,
          seller_id: sellerId,
          seller_name: sellerName,
          price,
          shipping_base: shipping,
          shipping_per_additional: 1.99,
          condition,
          condition_normalized: conditionNorm,
          url: `https://www.abebooks.com/products/isbn/${isbn}`,
          isbn,
        })
      }

      if (listings.length > 0) return listings
    } catch {
      // Fall through to regex parsing
    }
  }

  // Fallback: parse listing data from HTML structure using regex
  // AbeBooks listing containers
  const listingRegex = /<li[^>]*data-seller-id="([^"]*)"[^>]*>[\s\S]*?<\/li>/g
  const priceRegex = /class="[^"]*item-price[^"]*"[^>]*>\s*\$?([\d,]+\.?\d*)/
  const sellerRegex = /data-seller-name="([^"]*)"/
  const condRegex = /class="[^"]*item-binding[^"]*"[^>]*>([^<]+)/
  const idRegex = /data-listing-id="([^"]*)"/

  let match
  while ((match = listingRegex.exec(html)) !== null) {
    const block = match[0]
    const sellerId = match[1]
    const sellerMatch = sellerRegex.exec(block)
    const priceMatch = priceRegex.exec(block)
    const condMatch = condRegex.exec(block)
    const idMatch = idRegex.exec(block)

    if (!priceMatch) continue

    const price = parseFloat(priceMatch[1].replace(',', ''))
    const sellerName = sellerMatch ? sellerMatch[1] : sellerId
    const condition = condMatch ? condMatch[1].trim() : 'Good'
    const listingId = idMatch ? idMatch[1] : `${isbn}_${sellerId}`

    listings.push({
      listing_id: listingId,
      seller_id: sellerId || `s_${listings.length}`,
      seller_name: sellerName,
      price,
      shipping_base: 3.99,
      shipping_per_additional: 1.99,
      condition,
      condition_normalized: normalizeCondition(condition),
      url: listingId ? `https://www.abebooks.com/servlet/BookDetailsPL?bi=${listingId}` : `https://www.abebooks.com/products/isbn/${isbn}`,
      isbn,
    })
  }

  // If still no listings, return a placeholder directing to AbeBooks
  if (listings.length === 0) {
    listings.push({
      listing_id: `placeholder_${isbn}`,
      seller_id: 'abebooks',
      seller_name: 'View on AbeBooks',
      price: 0,
      shipping_base: 3.99,
      shipping_per_additional: 1.99,
      condition: 'Unknown',
      condition_normalized: 'good',
      url: `https://www.abebooks.com/products/isbn/${isbn}`,
      isbn,
    })
  }

  return listings
}
