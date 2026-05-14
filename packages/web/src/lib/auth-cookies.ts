import { cookies } from 'next/headers'

// httpOnly cookies для JWT — используем из Route Handlers и Server Components.
// SameSite=Lax + Secure в проде, Path=/, HttpOnly (нельзя из JS).

const ACCESS_COOKIE = 'qd_access'
const REFRESH_COOKIE = 'qd_refresh'

const ACCESS_MAX_AGE = 15 * 60 // 15 минут — синхронно с JWT_TTL на бэке
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60 // 30 дней

export function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = cookies()
  const secure = process.env.NODE_ENV === 'production'
  store.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  })
  store.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX_AGE,
  })
}

export function clearAuthCookies() {
  const store = cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value
}
