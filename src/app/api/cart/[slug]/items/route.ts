import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

async function getCart(slug: string) {
  const { data } = await supabase.from('carts').select('id').eq('slug', slug).single()
  return data
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const cart = await getCart(slug)
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const cart = await getCart(slug)
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 })

    const body = await req.json()
    const { data, error } = await supabase
      .from('cart_items')
      .insert({ ...body, cart_id: cart.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
