'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { api, type ApiError } from '@/lib/api'

interface Props {
  eventId: string
  initialRegistered: boolean
  isPast: boolean
  isFull: boolean
}

export default function RegisterButton({ eventId, initialRegistered, isPast, isFull }: Props) {
  const router = useRouter()
  // Optimistic UI: меняем состояние сразу, откатываем при ошибке
  const [registered, setRegistered] = useState(initialRegistered)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (isPast) {
    return <span className="text-slate-500 text-sm">Мероприятие прошло</span>
  }

  if (isFull && !registered) {
    return <span className="text-red-600 font-medium">Мест нет</span>
  }

  const toggle = async () => {
    setError(null)
    const wasRegistered = registered
    setRegistered(!wasRegistered) // optimistic

    try {
      if (wasRegistered) {
        await api.delete(`/events/${eventId}/register`)
      } else {
        await api.post(`/events/${eventId}/register`)
      }
      startTransition(() => router.refresh())
    } catch (err) {
      setRegistered(wasRegistered) // rollback
      const e = err as ApiError
      setError(
        e.code === 'no_capacity'
          ? 'Мест уже не осталось'
          : e.code === 'membership_expired'
            ? 'Членство истекло'
            : e.code === 'already_registered'
              ? 'Вы уже зарегистрированы'
              : 'Не удалось выполнить действие',
      )
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={
          registered
            ? 'rounded-xl border border-slate-300 px-5 py-2.5 hover:bg-slate-50 disabled:opacity-50'
            : 'rounded-xl bg-brand px-5 py-2.5 text-white hover:bg-brand-dark disabled:opacity-50'
        }
      >
        {registered ? 'Я иду · отменить' : 'Записаться'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
