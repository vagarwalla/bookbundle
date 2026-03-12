import type { CartItem, Condition, Listing } from './types'

export const CONDITION_ORDER: Condition[] = ['new', 'fine', 'good', 'fair']
export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'New', fine: 'Fine', good: 'Good', fair: 'Fair',
}

export type RelaxSuggestion =
  | { type: 'condition'; newConditions: Condition[]; addedLabels: string[]; count: number }
  | { type: 'max_price'; count: number }

/** Tier indicating how significant a relaxed deal is relative to the strict criteria price. */
export type DealTier =
  | 'better_deal'  // saves ≥$4 or ≥40% — worth calling out prominently
  | 'heads_up'     // saves $1–$3.99 and <40% — informational for price-sensitive users
  | 'trivial'      // saves <$1 — user is already getting the best deal for their criteria

export interface RelaxedDeal {
  listing: Listing
  relaxationType: 'condition'
  newConditions: Condition[]
  addedLabels: string[]    // e.g. ['Good'] or ['Good', 'Fair']
  strictCheapest: number   // cheapest price within strict criteria
  relaxedCheapest: number  // cheapest price with relaxed criteria
  savingsAmount: number
  savingsPct: number
  tier: DealTier
}

export interface NearMissPrice {
  cheapestBlocked: number  // cheapest listing passing condition filter but blocked by price cap
  delta: number            // how much over the cap (cheapestBlocked - maxPrice)
}

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

/**
 * Find the best deal available by relaxing conditions one level at a time (downward only —
 * worse/cheaper conditions). Returns null when no strictly cheaper option exists.
 * Always returns a result (with tier='trivial') if savings are >$0 but <$1.
 */
export function findRelaxedDeal(
  item: CartItem,
  byIsbn: Record<string, Listing[]>,
  currentListings: Listing[],
  conditions: Condition[],
  maxPrice: number | null,
): RelaxedDeal | null {
  if (currentListings.length === 0) return null

  const strictCheapest = Math.min(...currentListings.map((l) => l.price))

  // Only expand downward to worse (cheaper) conditions
  const lowestIdx = Math.max(...conditions.map((c) => CONDITION_ORDER.indexOf(c)))
  const worseConditions = CONDITION_ORDER.slice(lowestIdx + 1).filter((c) => !conditions.includes(c))
  if (worseConditions.length === 0) return null

  for (let i = 1; i <= worseConditions.length; i++) {
    const expanded = [...conditions, ...worseConditions.slice(0, i)]
    const expandedListings = computeListings(item, byIsbn, expanded, maxPrice)
    if (expandedListings.length === 0) continue

    const relaxedCheapest = Math.min(...expandedListings.map((l) => l.price))
    if (relaxedCheapest >= strictCheapest) continue

    const savingsAmount = strictCheapest - relaxedCheapest
    const savingsPct = savingsAmount / strictCheapest
    const tier: DealTier =
      (savingsAmount >= 4 || savingsPct >= 0.4) ? 'better_deal' :
      savingsAmount >= 1 ? 'heads_up' :
      'trivial'

    const listing = expandedListings.reduce((a, b) => a.price <= b.price ? a : b)
    return {
      listing,
      relaxationType: 'condition',
      newConditions: expanded,
      addedLabels: worseConditions.slice(0, i).map((c) => CONDITION_LABELS[c]),
      strictCheapest,
      relaxedCheapest,
      savingsAmount,
      savingsPct,
      tier,
    }
  }

  return null
}

/**
 * Find if the max_price cap is narrowly blocking listings that pass all other criteria.
 * Returns a signal only when the cheapest blocked listing is within $2 of the cap.
 */
export function findNearMissPrice(
  item: CartItem,
  byIsbn: Record<string, Listing[]>,
  conditions: Condition[],
  maxPrice: number | null,
): NearMissPrice | null {
  if (maxPrice == null) return null

  // Find listings passing condition filter but blocked by price cap
  const conditionOnly = computeListings(item, byIsbn, conditions, null)
  const blocked = conditionOnly.filter((l) => l.price > maxPrice)
  if (blocked.length === 0) return null

  const cheapestBlocked = Math.min(...blocked.map((l) => l.price))
  const delta = cheapestBlocked - maxPrice
  if (delta > 2) return null

  return { cheapestBlocked, delta }
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
