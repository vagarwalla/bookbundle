import type { CartItem, Listing, OptimizationResult } from '../../types'
import { optimize } from '../index'

/**
 * Runs the optimizer across ALL sources pooled together (AbeBooks + ThriftBooks + BWB).
 * The optimizer freely assigns each book to whichever seller — from any source —
 * yields the lowest total cost, including bundled shipping.
 *
 * This can produce a cheaper result than any single-source solution by, e.g.,
 * buying book A from ThriftBooks (flat $3.99 order) and books B+C from a single
 * AbeBooks seller (shared shipping).
 */
export function runCombinedOptimizer(
  items: CartItem[],
  listingsByIsbn: Map<string, Listing[]>,
): OptimizationResult {
  return optimize(items, listingsByIsbn)
}

/** Derive the source store from a seller_id. */
export function getSellerSource(sellerId: string): 'abe' | 'thriftbooks' | 'bwb' {
  if (sellerId === 'thriftbooks') return 'thriftbooks'
  if (sellerId === 'betterworldbooks') return 'bwb'
  return 'abe'
}
