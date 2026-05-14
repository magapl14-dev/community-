import Constants from 'expo-constants'
import { useAuthStore } from '@/stores/auth'

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:4000'

export async function apiFetch<T = unknown>(
  path: string,
  opts: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const token = useAuthStore.getState().accessToken
  const { body, headers, ...rest } = opts

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ code: 'unknown_error' }))) as {
      code: string
      message?: string
    }
    throw Object.assign(new Error(err.message ?? err.code), { status: res.status, ...err })
  }

  return res.json() as Promise<T>
}
