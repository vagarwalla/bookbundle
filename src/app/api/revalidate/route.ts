import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(revalidateTag as any)('editions')
  return NextResponse.json({ revalidated: true })
}
