// Универсальный API-клиент: работает и на сервере (Server Components, Route Handlers),
// и на клиенте через тот же путь "/api/proxy/...", который проксирует Next в backend
// (см. rewrites в next.config.mjs).

const API_BASE = '/api/proxy'

export interface ApiError extends Error {
  status: number
  code: string
  details?: unknown
}

type FetchInit = Omit<RequestInit, 'body'> & { body?: unknown }

async function request<T>(path: string, init: FetchInit = {}): Promise<T> {
  const { body, headers, ...rest } = init
  // На сервере нужно полное URL для fetch — реверс берётся из NEXT_PUBLIC_API_URL
  const url =
    typeof window === 'undefined'
      ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1${path}`
      : `${API_BASE}${path}`

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ code: 'unknown_error' }))) as {
      code: string
      message?: string
      details?: unknown
    }
    const e = new Error(err.message ?? err.code) as ApiError
    e.status = res.status
    e.code = err.code
    e.details = err.details
    throw e
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T>(path: string, init?: FetchInit) => request<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: FetchInit) =>
    request<T>(path, { ...init, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, init?: FetchInit) =>
    request<T>(path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: FetchInit) => request<T>(path, { ...init, method: 'DELETE' }),
}
