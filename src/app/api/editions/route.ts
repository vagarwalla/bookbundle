import { NextRequest, NextResponse } from 'next/server'
import { getEditions } from '@/lib/openLibrary'

export async function GET(req: NextRequest) {
  const workId = req.nextUrl.searchParams.get('workId')
  if (!workId) return NextResponse.json({ error: 'workId required' }, { status: 400 })
  const editions = await getEditions(workId)
  return NextResponse.json(editions)
}
