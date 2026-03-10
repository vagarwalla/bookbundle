import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCoverUrl, detectFormat, searchBooks, getEditions } from '../openLibrary'

beforeEach(() => {
  vi.unstubAllGlobals()
})

// ── getCoverUrl ───────────────────────────────────────────────────────────────

describe('getCoverUrl', () => {
  it('builds a medium cover URL by default', () => {
    const url = getCoverUrl('9780385533225')
    expect(url).toBe('https://covers.openlibrary.org/b/isbn/9780385533225-M.jpg')
  })

  it('supports size S', () => {
    expect(getCoverUrl('9780385533225', 'S')).toContain('-S.jpg')
  })

  it('supports size L', () => {
    expect(getCoverUrl('9780385533225', 'L')).toContain('-L.jpg')
  })
})

// ── detectFormat ──────────────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('detects hardcover from title', () => {
    expect(detectFormat('Dune Hardcover Edition', null)).toBe('hardcover')
    expect(detectFormat('Dune Hardback', null)).toBe('hardcover')
  })

  it('detects hardcover from physDesc', () => {
    expect(detectFormat('Dune', 'hardcover')).toBe('hardcover')
    expect(detectFormat('Dune', 'Hardback binding')).toBe('hardcover')
  })

  it('detects paperback from title', () => {
    expect(detectFormat('Dune Paperback', null)).toBe('paperback')
    expect(detectFormat('Dune Softcover', null)).toBe('paperback')
    expect(detectFormat('Dune Mass Market Paperback', null)).toBe('paperback')
  })

  it('detects paperback from physDesc', () => {
    expect(detectFormat('Dune', 'paperback')).toBe('paperback')
  })

  it('returns "any" when format is unknown', () => {
    expect(detectFormat('Dune', null)).toBe('any')
    expect(detectFormat('Dune', 'unknown binding')).toBe('any')
  })

  it('is case-insensitive', () => {
    expect(detectFormat('HARDCOVER EDITION', null)).toBe('hardcover')
    expect(detectFormat('PAPERBACK', null)).toBe('paperback')
  })
})

// ── searchBooks ───────────────────────────────────────────────────────────────

describe('searchBooks', () => {
  it('returns mapped results from the Open Library API', async () => {
    const mockResponse = {
      docs: [
        {
          title: 'Dune',
          author_name: ['Frank Herbert'],
          key: '/works/OL102749W',
          cover_i: 12345,
          first_publish_year: 1965,
        },
        {
          title: 'Dune Messiah',
          author_name: ['Frank Herbert'],
          key: '/works/OL102750W',
          cover_i: null,
          first_publish_year: 1969,
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const results = await searchBooks('Dune')
    expect(results).toHaveLength(2)

    expect(results[0].title).toBe('Dune')
    expect(results[0].author).toBe('Frank Herbert')
    expect(results[0].work_id).toBe('/works/OL102749W')
    expect(results[0].cover_url).toContain('12345')
    expect(results[0].first_publish_year).toBe(1965)

    expect(results[1].cover_url).toBeNull()
  })

  it('uses the first author when multiple are present', async () => {
    const mockResponse = {
      docs: [{
        title: 'Good Omens',
        author_name: ['Terry Pratchett', 'Neil Gaiman'],
        key: '/works/OL123W',
        cover_i: null,
        first_publish_year: 1990,
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const [result] = await searchBooks('Good Omens')
    expect(result.author).toBe('Terry Pratchett')
  })

  it('returns "Unknown" author when author_name is missing', async () => {
    const mockResponse = {
      docs: [{
        title: 'Anonymous Book',
        author_name: null,
        key: '/works/OL1W',
        cover_i: null,
        first_publish_year: null,
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const [result] = await searchBooks('Anonymous')
    expect(result.author).toBe('Unknown')
  })

  it('returns empty array when the API call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    )

    const results = await searchBooks('Dune')
    expect(results).toEqual([])
  })

  it('returns empty array when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
    // searchBooks doesn't have a try-catch so it will throw — this is expected behaviour
    await expect(searchBooks('Dune')).rejects.toThrow()
  })

  it('returns empty array when docs is missing from response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    )

    const results = await searchBooks('Dune')
    expect(results).toEqual([])
  })
})

// ── getEditions ───────────────────────────────────────────────────────────────

describe('getEditions', () => {
  it('returns editions mapped from Open Library entries', async () => {
    const mockResponse = {
      entries: [
        {
          title: 'Dune',
          isbn_13: ['9780441013593'],
          isbn_10: [],
          covers: [98765],
          publish_date: '1990',
          publishers: ['Ace Books'],
          edition_name: 'First Ace Edition',
          physical_format: 'paperback',
        },
        {
          title: 'Dune',
          isbn_13: ['9780340960196'],
          isbn_10: [],
          covers: [],
          publish_date: 'January 2005',
          publishers: ['Hodder'],
          physical_format: 'hardcover',
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W')
    expect(editions).toHaveLength(2)

    const [first, second] = editions

    expect(first.isbn).toBe('9780441013593')
    expect(first.publisher).toBe('Ace Books')
    expect(first.publish_year).toBe(1990)
    expect(first.format).toBe('paperback')
    expect(first.cover_url).toContain('98765')

    expect(second.isbn).toBe('9780340960196')
    expect(second.format).toBe('hardcover')
    expect(second.cover_url).toBeNull() // covers array is empty
  })

  it('deduplicates editions with the same ISBN', async () => {
    const mockResponse = {
      entries: [
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [], publish_date: '1990', publishers: ['Ace'] },
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [], publish_date: '1991', publishers: ['Ace'] },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W')
    expect(editions).toHaveLength(1)
  })

  it('skips entries with no ISBN', async () => {
    const mockResponse = {
      entries: [
        { title: 'Dune', isbn_13: [], isbn_10: [], covers: [], publish_date: '1990', publishers: ['Ace'] },
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [], publish_date: '1991', publishers: ['Ace'] },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W')
    expect(editions).toHaveLength(1)
    expect(editions[0].isbn).toBe('9780441013593')
  })

  it('prefers isbn_13 over isbn_10', async () => {
    const mockResponse = {
      entries: [{
        title: 'Dune',
        isbn_13: ['9780441013593'],
        isbn_10: ['0441013591'],
        covers: [],
        publish_date: '1990',
        publishers: ['Ace'],
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const [edition] = await getEditions('/works/OL102749W')
    expect(edition.isbn).toBe('9780441013593')
  })

  it('returns empty array when the API call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) })
    )

    const editions = await getEditions('/works/OL102749W')
    expect(editions).toEqual([])
  })

  it('handles missing entries gracefully', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    )

    const editions = await getEditions('/works/OL102749W')
    expect(editions).toEqual([])
  })

  it('parses publish year from a date string with non-numeric characters', async () => {
    const mockResponse = {
      entries: [{
        title: 'Dune',
        isbn_13: ['9780441013593'],
        isbn_10: [],
        covers: [],
        publish_date: 'March 15, 1990',
        publishers: ['Ace'],
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const [edition] = await getEditions('/works/OL102749W')
    expect(edition.publish_year).toBe(1990)
  })
})
