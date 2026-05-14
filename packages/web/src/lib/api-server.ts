import 'server-only'
import { getAccessToken } from './auth-cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type FetchInit = Omit<RequestInit, 'body'> & { body?: unknown }

export async function apiServer<T = unknown>(path: string, init: FetchInit = {}): Promise<T> {
  const token = getAccessToken()
  const { body, headers, ...rest } = init

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ code: 'unknown_error' }))) as {
      code: string
      message?: string
    }
    throw Object.assign(new Error(err.message ?? err.code), { status: res.status, ...err })
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
