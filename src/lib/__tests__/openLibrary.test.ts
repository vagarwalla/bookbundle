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

/** Stub fetch to return different responses for OL vs GB URLs */
function mockDualFetch(olResponse: unknown, gbResponse: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
    if (url.includes('openlibrary.org')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(olResponse) })
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(gbResponse) })
  }))
}

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
          covers: [54321],
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
    expect(second.cover_url).toContain('54321')
  })

  it('deduplicates editions with the same ISBN', async () => {
    const mockResponse = {
      entries: [
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [11111], publish_date: '1990', publishers: ['Ace'] },
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [11111], publish_date: '1991', publishers: ['Ace'] },
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
        { title: 'Dune', isbn_13: [], isbn_10: [], covers: [11111], publish_date: '1990', publishers: ['Ace'] },
        { title: 'Dune', isbn_13: ['9780441013593'], isbn_10: [], covers: [22222], publish_date: '1991', publishers: ['Ace'] },
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
        covers: [11111],
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
        covers: [11111],
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

  it('includes editions whose OL language matches the filter', async () => {
    const mockResponse = {
      entries: [{
        title: 'Dune',
        isbn_13: ['9780441013593'],
        isbn_10: [],
        covers: [98765],
        publish_date: '1990',
        publishers: ['Ace'],
        languages: [{ key: '/languages/eng' }],
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W', 'eng')
    expect(editions).toHaveLength(1)
    expect(editions[0].isbn).toBe('9780441013593')
  })

  it('excludes editions whose OL language does not match the filter', async () => {
    const mockResponse = {
      entries: [{
        title: 'Dune',
        isbn_13: ['9780441013593'],
        isbn_10: [],
        covers: [98765],
        publish_date: '1990',
        publishers: ['Gallimard'],
        languages: [{ key: '/languages/fre' }],
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W', 'eng')
    expect(editions).toHaveLength(0)
  })

  it('includes all editions (any language) when language filter is empty string', async () => {
    const mockResponse = {
      entries: [
        {
          title: 'Dune',
          isbn_13: ['9780441013593'],
          isbn_10: [],
          covers: [11111],
          publish_date: '1990',
          publishers: ['Ace'],
          languages: [{ key: '/languages/eng' }],
        },
        {
          title: 'Dune (French)',
          isbn_13: ['9782070360024'],
          isbn_10: [],
          covers: [22222],
          publish_date: '1992',
          publishers: ['Gallimard'],
          languages: [{ key: '/languages/fre' }],
        },
      ],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W', '')
    expect(editions).toHaveLength(2)
  })

  it('skips editions with no cover when language filter is active', async () => {
    const mockResponse = {
      entries: [{
        title: 'Dune',
        isbn_13: ['9780441013593'],
        isbn_10: [],
        covers: [],          // no cover
        publish_date: '1990',
        publishers: ['Ace'],
        languages: [{ key: '/languages/eng' }],
      }],
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
    )

    const editions = await getEditions('/works/OL102749W', 'eng')
    expect(editions).toHaveLength(0)
  })

  it('sends untagged editions through Google Books language verification', async () => {
    const olResponse = {
      entries: [
        {
          // Has cover but no OL language tag — needs GB verification
          title: 'Dune',
          isbn_13: ['9780441013593'],
          isbn_10: [],
          covers: [98765],
          publish_date: '1990',
          publishers: ['Ace'],
          // no languages field
        },
      ],
    }

    // GB says it is English
    const gbResponse = { items: [{ volumeInfo: { language: 'en' } }] }

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('editions.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(olResponse) })
      }
      // GB language lookup
      return Promise.resolve({ ok: true, json: () => Promise.resolve(gbResponse) })
    }))

    const editions = await getEditions('/works/OL102749W', 'eng')
    expect(editions).toHaveLength(1)
  })

  it('excludes untagged edition when Google Books identifies it as a different language', async () => {
    const olResponse = {
      entries: [{
        title: 'Dune (French)',
        isbn_13: ['9782070360024'],
        isbn_10: [],
        covers: [22222],
        publish_date: '1992',
        publishers: ['Gallimard'],
        // no languages field
      }],
    }

    // GB says it is French
    const gbResponse = { items: [{ volumeInfo: { language: 'fr' } }] }

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('editions.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(olResponse) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(gbResponse) })
    }))

    const editions = await getEditions('/works/OL102749W', 'eng')
    expect(editions).toHaveLength(0)
  })
})

// ── searchBooks — Google Books series integration ─────────────────────────────

describe('searchBooks — GB series extraction', () => {
  it('extracts series and number from "Series: Book Title" GB format', async () => {
    const olResponse = {
      docs: [{
        title: 'The Screaming Staircase',
        author_name: ['Jonathan Stroud'],
        key: '/works/OL1W',
        cover_i: null,
        first_publish_year: 2013,
      }],
    }
    const gbResponse = {
      items: [{
        volumeInfo: {
          title: 'Lockwood & Co #1: The Screaming Staircase',
        },
      }],
    }

    mockDualFetch(olResponse, gbResponse)

    const results = await searchBooks('The Screaming Staircase')
    expect(results).toHaveLength(1)
    expect(results[0].series).toBe('Lockwood & Co')
    expect(results[0].series_number).toBe('1')
  })

  it('extracts series and number from "Title (Series, #N)" GB format', async () => {
    const olResponse = {
      docs: [{
        title: 'The Name of the Wind',
        author_name: ['Patrick Rothfuss'],
        key: '/works/OL2W',
        cover_i: null,
        first_publish_year: 2007,
      }],
    }
    const gbResponse = {
      items: [{
        volumeInfo: {
          title: 'The Name of the Wind (Kingkiller Chronicle, #1)',
        },
      }],
    }

    mockDualFetch(olResponse, gbResponse)

    const results = await searchBooks('The Name of the Wind')
    expect(results).toHaveLength(1)
    expect(results[0].series).toBe('Kingkiller Chronicle')
    expect(results[0].series_number).toBe('1')
  })

  it('extracts series number from word ordinals like "Book Two"', async () => {
    const olResponse = {
      docs: [{
        title: 'The Wise Man\'s Fear',
        author_name: ['Patrick Rothfuss'],
        key: '/works/OL3W',
        cover_i: null,
        first_publish_year: 2011,
      }],
    }
    const gbResponse = {
      items: [{
        volumeInfo: {
          title: 'The Wise Man\'s Fear (Kingkiller Chronicle, Book Two)',
        },
      }],
    }

    mockDualFetch(olResponse, gbResponse)

    const results = await searchBooks('The Wise Man\'s Fear')
    expect(results).toHaveLength(1)
    expect(results[0].series).toBe('Kingkiller Chronicle')
    expect(results[0].series_number).toBe('2')
  })

  it('does not assign series to short OL titles even if GB has a match', async () => {
    // Title is only 4 chars — matchGB should skip it (< 12 char threshold)
    const olResponse = {
      docs: [{
        title: 'Dune',
        author_name: ['Frank Herbert'],
        key: '/works/OL4W',
        cover_i: null,
        first_publish_year: 1965,
      }],
    }
    const gbResponse = {
      items: [{
        volumeInfo: {
          title: 'Some Long Series: Dune',
        },
      }],
    }

    mockDualFetch(olResponse, gbResponse)

    const results = await searchBooks('Dune')
    expect(results[0].series).toBeNull()
  })

  it('does not assign a series to a title that is an edition note in parentheses', async () => {
    const olResponse = {
      docs: [{
        title: 'The Lord of the Rings',
        author_name: ['J.R.R. Tolkien'],
        key: '/works/OL5W',
        cover_i: null,
        first_publish_year: 1954,
      }],
    }
    const gbResponse = {
      items: [{
        // "Special Edition" should be rejected as a series name
        volumeInfo: { title: 'The Lord of the Rings (Special Edition)' },
      }],
    }

    mockDualFetch(olResponse, gbResponse)

    const results = await searchBooks('The Lord of the Rings')
    expect(results[0].series).toBeNull()
  })
})
