'use server'

import { applicationSchema } from '@qd/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; code: string; message: string }

export async function submitApplicationAction(input: unknown): Promise<SubmitResult> {
  const parsed = applicationSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.errors[0]?.message ?? 'Проверьте данные',
    }
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ code: 'unknown' }))) as {
        code: string
        message?: string
      }
      const message =
        err.code === 'already_submitted'
          ? 'Заявка уже отправлена. Координатор скоро свяжется.'
          : err.code === 'captcha_failed'
            ? 'Капча не пройдена. Попробуйте ещё раз.'
            : (err.message ?? 'Не удалось отправить заявку')
      return { ok: false, code: err.code, message }
    }
    const { id } = (await res.json()) as { id: string }
    return { ok: true, id }
  } catch (err) {
    return { ok: false, code: 'network', message: (err as Error).message }
  }
}
