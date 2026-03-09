import { NextRequest, NextResponse } from 'next/server'
import type { CartItem, Listing } from '@/lib/types'
import { optimize } from '@/lib/optimizer'

export async function POST(req: NextRequest) {
  const { items, listingsByIsbn }: {
    items: CartItem[]
    listingsByIsbn: Record<string, Listing[]>
  } = await req.json()

  const map = new Map<string, Listing[]>(Object.entries(listingsByIsbn))
  const result = optimize(items, map)
  return NextResponse.json(result)
}
