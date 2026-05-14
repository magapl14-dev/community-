'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '../actions'

export default function LoginForm() {
  const router = useRouter()
  const [state, formAction] = useFormState(loginAction, null)

  useEffect(() => {
    if (state?.ok) router.push(state.redirectTo)
  }, [state, router])

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="email"
        name="email"
        required
        placeholder="Email"
        className="w-full rounded-lg border px-4 py-3 focus:border-brand focus:outline-none"
      />
      <input
        type="password"
        name="password"
        required
        minLength={8}
        placeholder="Пароль"
        className="w-full rounded-lg border px-4 py-3 focus:border-brand focus:outline-none"
      />
      {state && !state.ok && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {state.message}
        </div>
      )}
      <SubmitButton />
    </form>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand px-6 py-3 text-white hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? 'Вход…' : 'Войти'}
    </button>
  )
}
