import { describe, it, expect } from 'vitest'
import { runCombinedOptimizer, getSellerSource } from '../optimizer/strategies/combined'
import { optimize } from '../optimizer'
import type { CartItem, Condition, Listing } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<CartItem> & { id: string }): CartItem {
  return {
    cart_id: 'cart-1',
    title: 'Test Book',
    author: 'Test Author',
    work_id: '/works/OL1W',
    isbn_preferred: `isbn-${overrides.id}`,
    cover_url: null,
    format: 'any',
    conditions: ['new', 'fine', 'good', 'fair'] as Condition[],
    max_price: null,
    flexible: false,
    signed_only: false,
    first_edition_only: false,
    dust_jacket_only: false,
    quantity: 1,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    isbns_candidates: null,
    ...overrides,
  }
}

function makeAbeListing(
  overrides: Partial<Listing> & { seller_id: string; isbn: string; price: number }
): Listing {
  return {
    listing_id: `${overrides.seller_id}-${overrides.isbn}`,
    seller_name: `AbeBooks: ${overrides.seller_id}`,
    shipping_base: 3.99,
    shipping_per_additional: 1.99,
    condition: 'Fine',
    condition_normalized: 'fine',
    signed: false,
    first_edition: false,
    dust_jacket: false,
    url: `https://www.abebooks.com/isbn/${overrides.isbn}`,
    ...overrides,
  }
}

function makeThriftListing(
  overrides: Partial<Listing> & { isbn: string; price: number }
): Listing {
  return {
    listing_id: `thriftbooks-${overrides.isbn}`,
    seller_id: 'thriftbooks',
    seller_name: 'ThriftBooks',
    shipping_base: 3.99,
    shipping_per_additional: 0, // flat rate per ORDER
    condition: 'Fine',
    condition_normalized: 'fine',
    signed: false,
    first_edition: false,
    dust_jacket: false,
    url: `https://www.thriftbooks.com/isbn/${overrides.isbn}`,
    ...overrides,
  }
}

function makeBwbListing(
  overrides: Partial<Listing> & { isbn: string; price: number }
): Listing {
  return {
    listing_id: `bwb-${overrides.isbn}`,
    seller_id: 'betterworldbooks',
    seller_name: 'Better World Books',
    shipping_base: 3.99,
    shipping_per_additional: 0, // flat rate per ORDER
    condition: 'Fine',
    condition_normalized: 'fine',
    signed: false,
    first_edition: false,
    dust_jacket: false,
    url: `https://www.betterworldbooks.com/isbn/${overrides.isbn}`,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runCombinedOptimizer', () => {
  it('returns empty result for empty cart', () => {
    const result = runCombinedOptimizer([], new Map())
    expect(result.groups).toHaveLength(0)
    expect(result.grand_total).toBe(0)
    expect(result.savings).toBe(0)
  })

  it('handles a single book with a single listing', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const listing = makeAbeListing({ seller_id: 'sellerA', isbn: 'isbn-1', price: 5.00 })
    const result = runCombinedOptimizer([item], new Map([['isbn-1', [listing]]]))
    expect(result.groups).toHaveLength(1)
    expect(result.grand_total).toBeCloseTo(8.99) // 5 + 3.99
  })

  it('returns same or better total than per-source results', () => {
    // Book A: cheap on ThriftBooks, Book B+C: cheap on AbeBooks sellerX
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-a', title: 'Book A' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-b', title: 'Book B' }),
      makeItem({ id: 'i3', isbn_preferred: 'isbn-c', title: 'Book C' }),
    ]

    const listingsByIsbn = new Map([
      ['isbn-a', [
        makeThriftListing({ isbn: 'isbn-a', price: 2.00 }),
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-a', price: 8.00 }),
      ]],
      ['isbn-b', [
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-b', price: 1.00 }),
        makeThriftListing({ isbn: 'isbn-b', price: 7.00 }),
      ]],
      ['isbn-c', [
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-c', price: 1.00 }),
        makeThriftListing({ isbn: 'isbn-c', price: 7.00 }),
      ]],
    ])

    const combinedResult = runCombinedOptimizer(items, listingsByIsbn)

    // Single-source ThriftBooks: 2+7+7 + 3.99 = $19.99
    const tbOnly = new Map([
      ['isbn-a', [makeThriftListing({ isbn: 'isbn-a', price: 2.00 })]],
      ['isbn-b', [makeThriftListing({ isbn: 'isbn-b', price: 7.00 })]],
      ['isbn-c', [makeThriftListing({ isbn: 'isbn-c', price: 7.00 })]],
    ])
    const tbResult = optimize(items, tbOnly)

    // Single-source AbeBooks: 8+1+1 + 3.99+1.99+1.99 = $18.96
    const abeOnly = new Map([
      ['isbn-a', [makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-a', price: 8.00 })]],
      ['isbn-b', [makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-b', price: 1.00 })]],
      ['isbn-c', [makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-c', price: 1.00 })]],
    ])
    const abeResult = optimize(items, abeOnly)

    const bestSingleSource = Math.min(tbResult.grand_total, abeResult.grand_total)

    // Combined: ThriftBooks(A)=$5.99 + AbeBooks(B+C)=$7.98 = $13.97
    expect(combinedResult.grand_total).toBeLessThanOrEqual(bestSingleSource + 0.001)
    expect(combinedResult.grand_total).toBeCloseTo(13.97, 1)
  })

  it('splits books across sources when optimal to do so', () => {
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-a', title: 'Book A' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-b', title: 'Book B' }),
      makeItem({ id: 'i3', isbn_preferred: 'isbn-c', title: 'Book C' }),
    ]

    const listingsByIsbn = new Map([
      ['isbn-a', [
        makeThriftListing({ isbn: 'isbn-a', price: 2.00 }),
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-a', price: 8.00 }),
      ]],
      ['isbn-b', [
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-b', price: 1.00 }),
        makeThriftListing({ isbn: 'isbn-b', price: 7.00 }),
      ]],
      ['isbn-c', [
        makeAbeListing({ seller_id: 'sellerX', isbn: 'isbn-c', price: 1.00 }),
        makeThriftListing({ isbn: 'isbn-c', price: 7.00 }),
      ]],
    ])

    const result = runCombinedOptimizer(items, listingsByIsbn)

    // Should have two groups: one ThriftBooks (book A) and one AbeBooks (books B+C)
    expect(result.groups).toHaveLength(2)
    const sellerIds = result.groups.map((g) => g.seller_id)
    expect(sellerIds).toContain('thriftbooks')
    expect(sellerIds).toContain('sellerX')
  })

  it('groups are correctly attributed: thriftbooks → thriftbooks, bwb → bwb, others → abe', () => {
    expect(getSellerSource('thriftbooks')).toBe('thriftbooks')
    expect(getSellerSource('betterworldbooks')).toBe('bwb')
    expect(getSellerSource('some-abe-seller-123')).toBe('abe')
    expect(getSellerSource('random-seller')).toBe('abe')
  })

  it('works when all books come from one source', () => {
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-1' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-2' }),
    ]

    const listingsByIsbn = new Map([
      ['isbn-1', [makeThriftListing({ isbn: 'isbn-1', price: 5.00 })]],
      ['isbn-2', [makeThriftListing({ isbn: 'isbn-2', price: 6.00 })]],
    ])

    const result = runCombinedOptimizer(items, listingsByIsbn)

    // All from ThriftBooks — flat shipping: 5+6+3.99 = $14.99
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].seller_id).toBe('thriftbooks')
    expect(result.grand_total).toBeCloseTo(14.99)
  })

  it('handles empty listings gracefully', () => {
    const items = [makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })]
    const result = runCombinedOptimizer(items, new Map([['isbn-1', []]]))
    expect(result.groups).toHaveLength(0)
    expect(result.grand_total).toBe(0)
  })

  it('is never worse than the best single-source result with BWB', () => {
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-1', title: 'Book 1' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-2', title: 'Book 2' }),
    ]

    const listingsByIsbn = new Map([
      ['isbn-1', [
        makeBwbListing({ isbn: 'isbn-1', price: 1.50 }),
        makeAbeListing({ seller_id: 'S1', isbn: 'isbn-1', price: 9.00 }),
      ]],
      ['isbn-2', [
        makeAbeListing({ seller_id: 'S1', isbn: 'isbn-2', price: 0.50 }),
        makeBwbListing({ isbn: 'isbn-2', price: 8.00 }),
      ]],
    ])

    const combinedResult = runCombinedOptimizer(items, listingsByIsbn)

    // All-BWB: 1.50+8.00+3.99 = $13.49
    // All-Abe: 9.00+0.50+3.99+1.99 = $15.48
    // Combined (BWB book1 + Abe book2): 1.50+3.99 + 0.50+3.99 = $9.98
    expect(combinedResult.grand_total).toBeCloseTo(9.98, 1)
    expect(combinedResult.grand_total).toBeLessThan(13.49 + 0.001)
  })
})
