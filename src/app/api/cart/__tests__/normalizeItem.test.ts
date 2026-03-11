import { describe, it, expect, vi } from 'vitest'

// Mock supabase before importing the route module
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))

import { normalizeItem } from '../[slug]/items/route'

// ── normalizeItem ─────────────────────────────────────────────────────────────

describe('normalizeItem — signed_only / first_edition_only / dust_jacket_only defaults', () => {
  it('defaults signed_only to false when it is undefined', () => {
    const item: Record<string, unknown> = { conditions: ['new'] }
    const result = normalizeItem(item)
    expect(result.signed_only).toBe(false)
  })

  it('defaults signed_only to false when it is null', () => {
    const item: Record<string, unknown> = { conditions: ['new'], signed_only: null }
    const result = normalizeItem(item)
    expect(result.signed_only).toBe(false)
  })

  it('preserves signed_only when it is explicitly true', () => {
    const item: Record<string, unknown> = { conditions: ['new'], signed_only: true }
    const result = normalizeItem(item)
    expect(result.signed_only).toBe(true)
  })

  it('defaults first_edition_only to false when it is undefined', () => {
    const item: Record<string, unknown> = { conditions: ['new'] }
    const result = normalizeItem(item)
    expect(result.first_edition_only).toBe(false)
  })

  it('defaults first_edition_only to false when it is null', () => {
    const item: Record<string, unknown> = { conditions: ['new'], first_edition_only: null }
    const result = normalizeItem(item)
    expect(result.first_edition_only).toBe(false)
  })

  it('preserves first_edition_only when it is explicitly true', () => {
    const item: Record<string, unknown> = { conditions: ['new'], first_edition_only: true }
    const result = normalizeItem(item)
    expect(result.first_edition_only).toBe(true)
  })

  it('defaults dust_jacket_only to false when it is undefined', () => {
    const item: Record<string, unknown> = { conditions: ['new'] }
    const result = normalizeItem(item)
    expect(result.dust_jacket_only).toBe(false)
  })

  it('defaults dust_jacket_only to false when it is null', () => {
    const item: Record<string, unknown> = { conditions: ['new'], dust_jacket_only: null }
    const result = normalizeItem(item)
    expect(result.dust_jacket_only).toBe(false)
  })

  it('preserves dust_jacket_only when it is explicitly true', () => {
    const item: Record<string, unknown> = { conditions: ['new'], dust_jacket_only: true }
    const result = normalizeItem(item)
    expect(result.dust_jacket_only).toBe(true)
  })
})

describe('normalizeItem — conditions defaults', () => {
  it('defaults conditions to [new, fine, good] when conditions is falsy (undefined)', () => {
    const item: Record<string, unknown> = {}
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['new', 'fine', 'good'])
  })

  it('defaults conditions to [new, fine, good] when conditions is null', () => {
    const item: Record<string, unknown> = { conditions: null }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['new', 'fine', 'good'])
  })

  it('passes through an existing conditions array unchanged', () => {
    const item: Record<string, unknown> = { conditions: ['fine', 'good'] }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['fine', 'good'])
  })
})

describe('normalizeItem — condition_min mapping', () => {
  it('maps condition_min=new to conditions=[new]', () => {
    const item: Record<string, unknown> = { condition_min: 'new' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['new'])
  })

  it('maps condition_min=fine to conditions=[fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'fine' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['fine', 'new'])
  })

  it('maps condition_min=like_new to conditions=[fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'like_new' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['fine', 'new'])
  })

  it('maps condition_min=very_good to conditions=[good, fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'very_good' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['good', 'fine', 'new'])
  })

  it('maps condition_min=good to conditions=[good, fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'good' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['good', 'fine', 'new'])
  })

  it('maps condition_min=acceptable to conditions=[fair, good, fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'acceptable' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['fair', 'good', 'fine', 'new'])
  })

  it('maps condition_min=fair to conditions=[fair, good, fine, new]', () => {
    const item: Record<string, unknown> = { condition_min: 'fair' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['fair', 'good', 'fine', 'new'])
  })

  it('falls back to [new, fine, good] for an unknown condition_min value', () => {
    const item: Record<string, unknown> = { condition_min: 'unknown_value' }
    const result = normalizeItem(item)
    expect(result.conditions).toEqual(['new', 'fine', 'good'])
  })

  it('ignores condition_min when conditions is already set', () => {
    const item: Record<string, unknown> = { conditions: ['fair'], condition_min: 'new' }
    const result = normalizeItem(item)
    // conditions is truthy, so condition_min mapping is skipped
    expect(result.conditions).toEqual(['fair'])
  })
})

describe('normalizeItem — max_price and isbns_candidates defaults', () => {
  it('defaults max_price to null when it is undefined', () => {
    const item: Record<string, unknown> = { conditions: ['new'] }
    const result = normalizeItem(item)
    expect(result.max_price).toBeNull()
  })

  it('preserves max_price when it is set', () => {
    const item: Record<string, unknown> = { conditions: ['new'], max_price: 25 }
    const result = normalizeItem(item)
    expect(result.max_price).toBe(25)
  })

  it('defaults isbns_candidates to null when it is undefined', () => {
    const item: Record<string, unknown> = { conditions: ['new'] }
    const result = normalizeItem(item)
    expect(result.isbns_candidates).toBeNull()
  })

  it('preserves isbns_candidates when it is set', () => {
    const item: Record<string, unknown> = { conditions: ['new'], isbns_candidates: ['isbn-1', 'isbn-2'] }
    const result = normalizeItem(item)
    expect(result.isbns_candidates).toEqual(['isbn-1', 'isbn-2'])
  })
})
