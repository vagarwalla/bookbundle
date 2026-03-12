import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function uniqueSlug(base: string): Promise<string> {
  const { data } = await supabase
    .from('carts')
    .select('slug')
    .or(`slug.eq.${base},slug.like.${base}-%`)

  const existing = new Set((data || []).map((r: { slug: string }) => r.slug))
  if (!existing.has(base)) return base

  let n = 2
  while (existing.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('carts')
      .select('id, slug, name, created_at')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const cartIds = (data || []).map((c) => c.id)
    if (cartIds.length === 0) return NextResponse.json([])

    const { data: counts } = await supabase
      .from('cart_items')
      .select('cart_id')
      .in('cart_id', cartIds)

    const countMap: Record<string, number> = {}
    for (const row of counts || []) {
      countMap[row.cart_id] = (countMap[row.cart_id] || 0) + 1
    }

    const carts = (data || []).map((c) => ({
      ...c,
      item_count: countMap[c.id] || 0,
    }))

    return NextResponse.json(carts)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name }: { name: string } = await req.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name required' }, { status: 400 })
    }

    const slug = await uniqueSlug(toSlug(name.trim()))
    const { data, error } = await supabase
      .from('carts')
      .insert({ slug, name: name.trim() })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
