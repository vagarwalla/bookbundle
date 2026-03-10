import { describe, it, expect } from 'vitest'
import { optimize } from '../optimizer'
import type { CartItem, Listing } from '../types'

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
    condition_min: 'like_new',
    flexible: false,
    quantity: 1,
    sort_order: 0,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeListing(
  overrides: Partial<Listing> & { seller_id: string; isbn: string; price: number }
): Listing {
  return {
    listing_id: `${overrides.seller_id}-${overrides.isbn}`,
    seller_name: `Seller ${overrides.seller_id}`,
    shipping_base: 3.99,
    shipping_per_additional: 1.99,
    condition: 'Like New',
    condition_normalized: 'like_new',
    url: `https://www.abebooks.com/products/isbn/${overrides.isbn}`,
    ...overrides,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('optimize', () => {
  it('returns empty result for an empty cart', () => {
    const result = optimize([], new Map())
    expect(result.groups).toHaveLength(0)
    expect(result.grand_total).toBe(0)
    expect(result.naive_total).toBe(0)
    expect(result.savings).toBe(0)
  })

  it('handles a single book with a single listing', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const listing = makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })

    const result = optimize([item], new Map([['isbn-1', [listing]]]))

    expect(result.groups).toHaveLength(1)
    const group = result.groups[0]
    expect(group.seller_id).toBe('A')
    expect(group.books_subtotal).toBe(5.00)
    expect(group.shipping).toBeCloseTo(3.99)
    expect(group.group_total).toBeCloseTo(8.99)
    expect(result.grand_total).toBeCloseTo(8.99)
  })

  it('groups two books from the same seller into one group', () => {
    const item1 = makeItem({ id: 'i1', isbn_preferred: 'isbn-1', title: 'Book A' })
    const item2 = makeItem({ id: 'i2', isbn_preferred: 'isbn-2', title: 'Book B' })

    const listings = new Map([
      ['isbn-1', [makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })]],
      ['isbn-2', [makeListing({ seller_id: 'A', isbn: 'isbn-2', price: 6.00 })]],
    ])

    const result = optimize([item1, item2], listings)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].seller_id).toBe('A')
    expect(result.groups[0].assignments).toHaveLength(2)
    // shipping: 3.99 + 1.99 = 5.98
    expect(result.groups[0].shipping).toBeCloseTo(5.98)
  })

  it('splits books across two sellers when no overlap exists', () => {
    const item1 = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const item2 = makeItem({ id: 'i2', isbn_preferred: 'isbn-2' })

    const listings = new Map([
      ['isbn-1', [makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })]],
      ['isbn-2', [makeListing({ seller_id: 'B', isbn: 'isbn-2', price: 6.00 })]],
    ])

    const result = optimize([item1, item2], listings)

    expect(result.groups).toHaveLength(2)
    // Both groups get full $3.99 shipping
    expect(result.grand_total).toBeCloseTo(5.00 + 3.99 + 6.00 + 3.99)
  })

  it('picks the seller with the most books to maximize grouping', () => {
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-1' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-2' }),
      makeItem({ id: 'i3', isbn_preferred: 'isbn-3' }),
    ]

    // Seller A has all 3 books, seller B only has isbn-1 at a lower price
    const listings = new Map([
      ['isbn-1', [
        makeListing({ seller_id: 'B', isbn: 'isbn-1', price: 3.00 }),
        makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 }),
      ]],
      ['isbn-2', [makeListing({ seller_id: 'A', isbn: 'isbn-2', price: 6.00 })]],
      ['isbn-3', [makeListing({ seller_id: 'A', isbn: 'isbn-3', price: 7.00 })]],
    ])

    const result = optimize(items, listings)

    // Seller A has all 3 → should win even if B is cheaper for isbn-1
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].seller_id).toBe('A')
  })

  it('excludes listings that do not meet the minimum condition', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1', condition_min: 'very_good' })

    const listings = new Map([
      ['isbn-1', [
        // Cheaper but condition is too low
        makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 3.00, condition: 'Good', condition_normalized: 'good' }),
        // Meets the condition
        makeListing({ seller_id: 'B', isbn: 'isbn-1', price: 7.00, condition: 'Very Good', condition_normalized: 'very_good' }),
      ]],
    ])

    const result = optimize([item], listings)

    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].seller_id).toBe('B')
    expect(result.groups[0].books_subtotal).toBe(7.00)
  })

  it('respects quantity > 1 in subtotal and shipping', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1', quantity: 3 })
    const listing = makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })

    const result = optimize([item], new Map([['isbn-1', [listing]]]))

    expect(result.groups[0].books_subtotal).toBe(15.00) // 5 × 3
    // shipping: 3.99 + 2 × 1.99 = 7.97
    expect(result.groups[0].shipping).toBeCloseTo(7.97)
  })

  it('produces no group for a book with no isbn', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: null as unknown as string })
    const result = optimize([item], new Map())
    expect(result.groups).toHaveLength(0)
  })

  it('produces no group for a book with an empty listings array', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const result = optimize([item], new Map([['isbn-1', []]]))
    expect(result.groups).toHaveLength(0)
  })

  it('produces no group for a book where all listings fail the condition filter', () => {
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1', condition_min: 'new' })
    const listings = new Map([
      ['isbn-1', [makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00, condition_normalized: 'good' })]],
    ])
    const result = optimize([item], listings)
    expect(result.groups).toHaveLength(0)
  })

  it('calculates savings correctly versus naive per-book ordering', () => {
    const item1 = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const item2 = makeItem({ id: 'i2', isbn_preferred: 'isbn-2' })

    const listings = new Map([
      ['isbn-1', [makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })]],
      ['isbn-2', [makeListing({ seller_id: 'A', isbn: 'isbn-2', price: 6.00 })]],
    ])

    const result = optimize([item1, item2], listings)

    // Naive: (5 + 3.99) + (6 + 3.99) = 18.98
    expect(result.naive_total).toBeCloseTo(18.98)
    // Optimised: 5 + 6 + 3.99 + 1.99 = 16.98
    expect(result.grand_total).toBeCloseTo(16.98)
    expect(result.savings).toBeCloseTo(2.00)
  })

  it('savings is never negative', () => {
    // Single book — naive and optimised are the same
    const item = makeItem({ id: 'i1', isbn_preferred: 'isbn-1' })
    const listing = makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })
    const result = optimize([item], new Map([['isbn-1', [listing]]]))
    expect(result.savings).toBeGreaterThanOrEqual(0)
  })

  it('groups are sorted by number of assignments descending', () => {
    const items = [
      makeItem({ id: 'i1', isbn_preferred: 'isbn-1' }),
      makeItem({ id: 'i2', isbn_preferred: 'isbn-2' }),
      makeItem({ id: 'i3', isbn_preferred: 'isbn-3' }),
    ]

    const listings = new Map([
      ['isbn-1', [makeListing({ seller_id: 'A', isbn: 'isbn-1', price: 5.00 })]],
      ['isbn-2', [makeListing({ seller_id: 'A', isbn: 'isbn-2', price: 5.00 })]],
      ['isbn-3', [makeListing({ seller_id: 'B', isbn: 'isbn-3', price: 5.00 })]],
    ])

    const result = optimize(items, listings)

    expect(result.groups[0].seller_id).toBe('A')
    expect(result.groups[0].assignments.length).toBeGreaterThanOrEqual(
      result.groups[result.groups.length - 1].assignments.length
    )
  })

  it('handles a large cart (10 books) without errors', () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeItem({ id: `i${i}`, isbn_preferred: `isbn-${i}` })
    )
    const listings = new Map(
      items.map((item) => [
        item.isbn_preferred!,
        [makeListing({ seller_id: 'A', isbn: item.isbn_preferred!, price: 5.00 })],
      ])
    )

    const result = optimize(items, listings)
    expect(result.groups).toHaveLength(1)
    expect(result.groups[0].assignments).toHaveLength(10)
    // shipping: 3.99 + 9 × 1.99 = 21.90
    expect(result.groups[0].shipping).toBeCloseTo(21.9)
  })
})
