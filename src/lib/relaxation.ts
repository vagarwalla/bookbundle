import type { CartItem, Condition, Listing } from './types'

export const CONDITION_ORDER: Condition[] = ['new', 'fine', 'good', 'fair']
export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'New', fine: 'Fine', good: 'Good', fair: 'Fair',
}

export type RelaxSuggestion =
  | { type: 'condition'; newConditions: Condition[]; addedLabels: string[]; count: number }
  | { type: 'max_price'; count: number }

export function computeListings(
  item: CartItem,
  byIsbn: Record<string, Listing[]>,
  conditions: Condition[],
  maxPrice: number | null,
): Listing[] {
  const isbns = [...new Set([
    ...(item.isbn_preferred ? [item.isbn_preferred] : []),
    ...(item.isbns_candidates ?? []),
  ])]
  return [...new Map(
    isbns.flatMap((isbn) => byIsbn[isbn] ?? []).map((l) => [l.listing_id, l])
  ).values()].filter((l) =>
    conditions.includes(l.condition_normalized) &&
    (maxPrice == null || l.price <= maxPrice) &&
    (!item.signed_only || l.signed) &&
    (!item.first_edition_only || l.first_edition) &&
    (!item.dust_jacket_only || l.dust_jacket)
  )
}

/** Find the minimal constraint relaxation that yields at least one listing. */
export function findSuggestion(
  item: CartItem,
  byIsbn: Record<string, Listing[]>,
  conditions: Condition[],
  maxPrice: number | null,
): RelaxSuggestion | null {
  // First check: are there ANY raw listings for these ISBNs at all (ignoring condition/price)?
  const anyRaw = computeListings(item, byIsbn, CONDITION_ORDER, null)
  if (anyRaw.length === 0) return null  // needs editions relaxation

  // Try expanding conditions one step at a time
  const missing = CONDITION_ORDER.filter((c) => !conditions.includes(c))
  for (let i = 1; i <= missing.length; i++) {
    const expanded = [...conditions, ...missing.slice(0, i)]
    const count = computeListings(item, byIsbn, expanded, maxPrice).length
    if (count > 0) {
      return {
        type: 'condition',
        newConditions: expanded,
        addedLabels: missing.slice(0, i).map((c) => CONDITION_LABELS[c]),
        count,
      }
    }
  }

  // Try removing max_price cap
  if (maxPrice != null) {
    const count = computeListings(item, byIsbn, CONDITION_ORDER, null).length
    if (count > 0) return { type: 'max_price', count }
  }

  return null
}

/** If cheapest listing > $20, find the minimal relaxation that would yield cheaper options. */
export function findCheaperSuggestion(
  item: CartItem,
  byIsbn: Record<string, Listing[]>,
  currentListings: Listing[],
  conditions: Condition[],
  maxPrice: number | null,
): { addedLabels: string[]; newConditions: Condition[]; cheaperPrice: number } | null {
  if (currentListings.length === 0) return null
  const currentCheapest = Math.min(...currentListings.map((l) => l.price))
  if (currentCheapest <= 20) return null

  const missing = CONDITION_ORDER.filter((c) => !conditions.includes(c))
  if (missing.length === 0) return null

  for (let i = 1; i <= missing.length; i++) {
    const expanded = [...conditions, ...missing.slice(0, i)]
    const expanded_listings = computeListings(item, byIsbn, expanded, maxPrice)
    if (expanded_listings.length === 0) continue
    const cheaperPrice = Math.min(...expanded_listings.map((l) => l.price))
    if (cheaperPrice < currentCheapest - 1) {
      return { addedLabels: missing.slice(0, i).map((c) => CONDITION_LABELS[c]), newConditions: expanded, cheaperPrice }
    }
  }
  return null
}
