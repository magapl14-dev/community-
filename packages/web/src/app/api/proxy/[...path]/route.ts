import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/auth-cookies'

// Прокси клиентских запросов в backend API.
// Подкладываем Authorization из httpOnly cookie, чтобы JS на клиенте не видел токен.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function proxy(req: NextRequest, params: { path: string[] }) {
  const token = getAccessToken()
  const target = `${API_URL}/api/v1/${params.path.join('/')}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('cookie') // не пробрасываем cookie дальше
  if (token) headers.set('authorization', `Bearer ${token}`)

  const init: RequestInit = {
    method: req.method,
    headers,
    body:
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.arrayBuffer(),
    redirect: 'manual',
  }

  const res = await fetch(target, init)
  const responseHeaders = new Headers(res.headers)
  responseHeaders.delete('content-encoding')
  responseHeaders.delete('content-length')

  return new NextResponse(res.body, { status: res.status, headers: responseHeaders })
}

export const GET = (req: NextRequest, ctx: { params: { path: string[] } }) =>
  proxy(req, ctx.params)
export const POST = GET
export const PATCH = GET
export const DELETE = GET
export const PUT = GET
