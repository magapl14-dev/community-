import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { setAuthCookies } from '@/lib/auth-cookies'

const bodySchema = z.object({
  accessToken: z.string().min(10),
  refreshToken: z.string().min(10),
})

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  setAuthCookies(parsed.data.accessToken, parsed.data.refreshToken)
  return NextResponse.json({ ok: true })
}
