import { describe, it, expect, vi, beforeEach } from 'vitest'
import { conditionMeets, normalizeCondition, fetchListingsByISBN } from '../abebooks'

// ── conditionMeets ────────────────────────────────────────────────────────────

describe('conditionMeets', () => {
  it('new satisfies every condition level', () => {
    expect(conditionMeets('new', 'new')).toBe(true)
    expect(conditionMeets('new', 'like_new')).toBe(true)
    expect(conditionMeets('new', 'very_good')).toBe(true)
    expect(conditionMeets('new', 'good')).toBe(true)
  })

  it('like_new satisfies like_new and below, not new', () => {
    expect(conditionMeets('like_new', 'new')).toBe(false)
    expect(conditionMeets('like_new', 'like_new')).toBe(true)
    expect(conditionMeets('like_new', 'very_good')).toBe(true)
    expect(conditionMeets('like_new', 'good')).toBe(true)
  })

  it('very_good satisfies very_good and good only', () => {
    expect(conditionMeets('very_good', 'new')).toBe(false)
    expect(conditionMeets('very_good', 'like_new')).toBe(false)
    expect(conditionMeets('very_good', 'very_good')).toBe(true)
    expect(conditionMeets('very_good', 'good')).toBe(true)
  })

  it('good satisfies only good', () => {
    expect(conditionMeets('good', 'new')).toBe(false)
    expect(conditionMeets('good', 'like_new')).toBe(false)
    expect(conditionMeets('good', 'very_good')).toBe(false)
    expect(conditionMeets('good', 'good')).toBe(true)
  })
})

// ── normalizeCondition ────────────────────────────────────────────────────────

describe('normalizeCondition', () => {
  it('maps "New" → new', () => {
    expect(normalizeCondition('New')).toBe('new')
    expect(normalizeCondition('Brand New')).toBe('new')
    expect(normalizeCondition('NEW')).toBe('new')
  })

  it('maps "Like New" / "As New" / "Fine" → like_new', () => {
    expect(normalizeCondition('Like New')).toBe('like_new')
    expect(normalizeCondition('As New')).toBe('like_new')
    expect(normalizeCondition('Fine')).toBe('like_new')
    expect(normalizeCondition('LIKE NEW')).toBe('like_new')
  })

  it('maps "Very Good" → very_good', () => {
    expect(normalizeCondition('Very Good')).toBe('very_good')
    expect(normalizeCondition('Very Good+')).toBe('very_good')
    expect(normalizeCondition('VERY GOOD')).toBe('very_good')
  })

  it('maps "Good" → good', () => {
    expect(normalizeCondition('Good')).toBe('good')
    expect(normalizeCondition('Good+')).toBe('good')
    expect(normalizeCondition('GOOD')).toBe('good')
  })

  it('defaults unknown strings to good', () => {
    expect(normalizeCondition('Fair')).toBe('good')
    expect(normalizeCondition('Poor')).toBe('good')
    expect(normalizeCondition('Acceptable')).toBe('good')
    expect(normalizeCondition('')).toBe('good')
  })
})

// ── fetchListingsByISBN ───────────────────────────────────────────────────────

const ISBN = '9780385533225'

function mockFetch(html: string, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 503,
      text: () => Promise.resolve(html),
    })
  )
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchListingsByISBN — JSON path (__INITIAL_STATE__)', () => {
  it('parses listings from window.__INITIAL_STATE__', async () => {
    const state = {
      inventory: {
        listings: [
          {
            listing_id: 'abc123',
            sellerId: 'SELLER1',
            sellerName: 'Great Books',
            bestPriceInPurchaseCurrency: 8.99,
            shippingCost: 3.99,
            condition: 'Like New',
          },
          {
            listing_id: 'def456',
            sellerId: 'SELLER2',
            sellerName: 'Bargain Books',
            bestPriceInPurchaseCurrency: 5.50,
            shippingCost: 3.99,
            condition: 'Very Good',
          },
        ],
      },
    }

    mockFetch(
      `<html><script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script></html>`
    )

    const listings = await fetchListingsByISBN(ISBN)
    expect(listings).toHaveLength(2)

    expect(listings[0].seller_id).toBe('SELLER1')
    expect(listings[0].seller_name).toBe('Great Books')
    expect(listings[0].price).toBe(8.99)
    expect(listings[0].condition_normalized).toBe('like_new')
    expect(listings[0].isbn).toBe(ISBN)

    expect(listings[1].seller_id).toBe('SELLER2')
    expect(listings[1].price).toBe(5.50)
    expect(listings[1].condition_normalized).toBe('very_good')
  })

  it('sets listing url to the AbeBooks isbn product page', async () => {
    const state = {
      inventory: {
        listings: [{
          listing_id: 'abc123',
          sellerId: 'S1',
          sellerName: 'S1',
          bestPriceInPurchaseCurrency: 9.00,
          shippingCost: 3.99,
          condition: 'New',
        }],
      },
    }
    mockFetch(`<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`)
    const [listing] = await fetchListingsByISBN(ISBN)
    expect(listing.url).toContain(ISBN)
  })

  it('ignores raw listings with no price', async () => {
    const state = {
      inventory: {
        listings: [
          { listing_id: 'a', sellerId: 'S1', sellerName: 'S1', condition: 'Good' }, // no price
          { listing_id: 'b', sellerId: 'S2', sellerName: 'S2', bestPriceInPurchaseCurrency: 7.00, condition: 'Good' },
        ],
      },
    }
    mockFetch(`<script>window.__INITIAL_STATE__ = ${JSON.stringify(state)};</script>`)
    const listings = await fetchListingsByISBN(ISBN)
    expect(listings).toHaveLength(1)
    expect(listings[0].seller_id).toBe('S2')
  })
})

describe('fetchListingsByISBN — HTML regex fallback', () => {
  function makeHtmlListing(sellerId: string, sellerName: string, price: string, condition: string, listingId: string) {
    return `<li data-seller-id="${sellerId}" data-seller-name="${sellerName}" data-listing-id="${listingId}">
      <span class="item-price">$${price}</span>
      <span class="item-binding">${condition}</span>
    </li>`
  }

  it('parses listings from HTML data attributes', async () => {
    const html = `<ul>${makeHtmlListing('SELLER1', 'Good Reads', '12.99', 'Very Good', 'LID1')}</ul>`
    mockFetch(html)

    const listings = await fetchListingsByISBN(ISBN)
    expect(listings.length).toBeGreaterThanOrEqual(1)

    const l = listings[0]
    expect(l.seller_id).toBe('SELLER1')
    expect(l.seller_name).toBe('Good Reads')
    expect(l.price).toBe(12.99)
    expect(l.condition_normalized).toBe('very_good')
    expect(l.listing_id).toBe('LID1')
    expect(l.url).toContain('LID1')
  })

  it('parses multiple listings', async () => {
    const html = `<ul>
      ${makeHtmlListing('S1', 'Seller One', '5.00', 'Good', 'L1')}
      ${makeHtmlListing('S2', 'Seller Two', '9.99', 'Like New', 'L2')}
    </ul>`
    mockFetch(html)

    const listings = await fetchListingsByISBN(ISBN)
    expect(listings).toHaveLength(2)
  })
})

describe('fetchListingsByISBN — error handling', () => {
  it('returns a placeholder when the HTTP response is not ok', async () => {
    mockFetch('Service unavailable', false)
    const listings = await fetchListingsByISBN(ISBN)
    expect(listings).toHaveLength(0)
  })

  it('returns a placeholder when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    const listings = await fetchListingsByISBN(ISBN)
    expect(listings).toHaveLength(0)
  })

  it('returns a placeholder listing when HTML has no recognisable listings', async () => {
    mockFetch('<html><body>No results found</body></html>')
    const listings = await fetchListingsByISBN(ISBN)
    // Falls back to placeholder
    expect(listings).toHaveLength(1)
    expect(listings[0].seller_id).toBe('abebooks')
    expect(listings[0].url).toContain(ISBN)
  })
})
