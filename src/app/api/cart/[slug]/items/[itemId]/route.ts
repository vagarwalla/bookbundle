import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Columns added in migration_v2 that may not exist in older DB deployments
const NEW_COLUMNS = new Set(['conditions', 'max_price'])

function splitBody(body: Record<string, unknown>) {
  const legacy: Record<string, unknown> = {}
  const newCols: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body)) {
    if (NEW_COLUMNS.has(k)) newCols[k] = v
    else legacy[k] = v
  }
  return { legacy, newCols }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    const { itemId } = await params
    const body = await req.json()
    const { legacy, newCols } = splitBody(body)

    // If there are no legacy columns to update, we can't hit the DB meaningfully
    // (pre-migration). Just fetch the current item and merge the new-column values.
    if (Object.keys(legacy).length === 0) {
      const { data, error } = await supabase
        .from('cart_items')
        .select('*')
        .eq('id', itemId)
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ...data, ...newCols })
    }

    // Try the full update first
    let result = await supabase
      .from('cart_items')
      .update(body)
      .eq('id', itemId)
      .select()
      .single()

    // If it failed (new columns not in DB yet), retry with only legacy columns
    if (result.error) {
      result = await supabase
        .from('cart_items')
        .update(legacy)
        .eq('id', itemId)
        .select()
        .single()
      if (!result.error && result.data) {
        return NextResponse.json({ ...result.data, ...newCols })
      }
    }

    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json(result.data)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string; itemId: string }> }) {
  try {
    const { itemId } = await params
    const { error } = await supabase.from('cart_items').delete().eq('id', itemId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
