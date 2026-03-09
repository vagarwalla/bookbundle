import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { itemId } = await params
  const body = await req.json()
  const { data, error } = await supabase
    .from('cart_items')
    .update(body)
    .eq('id', itemId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  const { itemId } = await params
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
