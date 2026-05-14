'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { forgotPasswordAction } from '../actions'

export default function ForgotForm() {
  const router = useRouter()
  const [state, action] = useFormState(forgotPasswordAction, null)

  useEffect(() => {
    if (state?.ok) router.push(state.redirectTo)
  }, [state, router])

  return (
    <form action={action} className="mt-6 space-y-3">
      <input
        type="email"
        name="email"
        required
        placeholder="Email"
        className="w-full rounded-lg border px-4 py-3 focus:border-brand focus:outline-none"
      />
      {state && !state.ok && (
        <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{state.message}</div>
      )}
      <Submit />
    </form>
  )
}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand px-6 py-3 text-white hover:bg-brand-dark disabled:opacity-50"
    >
      {pending ? 'Отправка…' : 'Отправить ссылку'}
    </button>
  )
}
