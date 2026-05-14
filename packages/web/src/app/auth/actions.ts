'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { clearAuthCookies, getRefreshToken, setAuthCookies } from '@/lib/auth-cookies'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface ActionError {
  ok: false
  code: string
  message?: string
}
interface ActionOk {
  ok: true
  redirectTo: string
}
export type ActionResult = ActionError | ActionOk

async function callApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ code: 'unknown_error' }))) as {
      code: string
      message?: string
    }
    throw Object.assign(new Error(err.message ?? err.code), { code: err.code, status: res.status })
  }
  return (await res.json()) as T
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { ok: false, code: 'validation_error', message: 'Проверьте email и пароль' }
  }

  try {
    const tokens = await callApi<TokenPair>('/auth/login', parsed.data)
    setAuthCookies(tokens.accessToken, tokens.refreshToken)
    return { ok: true, redirectTo: '/cabinet' }
  } catch (err) {
    const e = err as { code?: string; message?: string }
    return {
      ok: false,
      code: e.code ?? 'unknown',
      message: errorToRussian(e.code),
    }
  }
}

const activateSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, 'Минимум 8 символов'),
})

export async function activateAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = activateSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.errors[0]?.message ?? 'Проверьте данные',
    }
  }

  try {
    const tokens = await callApi<TokenPair>('/auth/activate', parsed.data)
    setAuthCookies(tokens.accessToken, tokens.refreshToken)
    return { ok: true, redirectTo: '/cabinet' }
  } catch (err) {
    return {
      ok: false,
      code: (err as { code?: string }).code ?? 'unknown',
      message: 'Ссылка недействительна или истекла',
    }
  }
}

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8, 'Минимум 8 символов'),
})

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.errors[0]?.message ?? 'Проверьте данные',
    }
  }

  try {
    await callApi('/auth/reset-password', parsed.data)
    return { ok: true, redirectTo: '/auth/login?reset=ok' }
  } catch {
    return { ok: false, code: 'invalid_token', message: 'Ссылка недействительна или истекла' }
  }
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = formData.get('email')
  if (typeof email !== 'string' || !email.includes('@')) {
    return { ok: false, code: 'validation_error', message: 'Введите email' }
  }
  await callApi('/auth/forgot-password', { email }).catch(() => null)
  return { ok: true, redirectTo: '/auth/login?forgot=ok' }
}

export async function logoutAction(): Promise<void> {
  const refresh = getRefreshToken()
  if (refresh) {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    }).catch(() => null)
  }
  clearAuthCookies()
  redirect('/auth/login')
}

function errorToRussian(code: string | undefined): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Неверный email или пароль'
    case 'account_disabled':
      return 'Аккаунт заблокирован'
    case 'too_many_attempts':
      return 'Слишком много попыток. Попробуйте через 15 минут.'
    case 'membership_expired':
      return 'Членство истекло — продлите подписку'
    default:
      return 'Ошибка входа. Попробуйте ещё раз.'
  }
}
