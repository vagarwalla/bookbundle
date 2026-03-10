import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { customAlphabet } from 'nanoid'

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

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

    const slug = nanoid()
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
