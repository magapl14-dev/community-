'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ApiError } from '@/lib/api'

interface AdminEvent {
  id: string
  title: string
  format: 'offline' | 'online' | 'hybrid'
  startAt: string
  location: string | null
  capacity: number | null
  status: 'draft' | 'published' | 'cancelled' | 'past'
}

export default function EventsTable({ items }: { items: AdminEvent[] }) {
  if (items.length === 0) {
    return <p className="text-slate-500">Событий нет</p>
  }
  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <EventRow key={e.id} event={e} />
      ))}
    </ul>
  )
}

function EventRow({ event }: { event: AdminEvent }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'publish' | 'cancel' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = async (action: 'publish' | 'cancel') => {
    setBusy(action)
    setError(null)
    try {
      await api.patch(`/admin/events/${event.id}`, {
        status: action === 'publish' ? 'published' : 'cancelled',
      })
      router.refresh()
    } catch (err) {
      setError((err as ApiError).message ?? 'Ошибка')
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-xl border border-slate-700 bg-slate-800 p-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
          <StatusBadge status={event.status} />
          <span className="text-slate-500">
            {new Date(event.startAt).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <h4 className="mt-1 font-semibold truncate">{event.title}</h4>
        {event.location && <div className="text-sm text-slate-400">{event.location}</div>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {event.status === 'draft' && (
          <button
            onClick={() => update('publish')}
            disabled={busy !== null}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === 'publish' ? '…' : 'Опубликовать'}
          </button>
        )}
        {event.status === 'published' && (
          <button
            onClick={() => update('cancel')}
            disabled={busy !== null}
            className="rounded-lg border border-red-500/50 text-red-400 px-3 py-1.5 text-sm hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy === 'cancel' ? '…' : 'Отменить'}
          </button>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </li>
  )
}

function StatusBadge({ status }: { status: AdminEvent['status'] }) {
  const styles: Record<AdminEvent['status'], { label: string; cls: string }> = {
    draft: { label: 'Черновик', cls: 'bg-slate-600 text-slate-200' },
    published: { label: 'Опубликовано', cls: 'bg-emerald-700 text-emerald-100' },
    cancelled: { label: 'Отменено', cls: 'bg-red-700 text-red-100' },
    past: { label: 'Прошло', cls: 'bg-slate-700 text-slate-300' },
  }
  const s = styles[status]
  return <span className={`rounded px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
}
