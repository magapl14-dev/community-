'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, type ApiError } from '@/lib/api'

interface Application {
  id: string
  name: string
  phone: string
  email: string | null
  telegram: string | null
  position: string | null
  industry: string | null
  revenueRange: string | null
  motivation: string | null
  status: 'new' | 'reviewing' | 'approved' | 'rejected'
  reviewedAt: string | null
  createdAt: string
}

export default function ApplicationsTable({
  items,
  actionable,
}: {
  items: Application[]
  actionable: boolean
}) {
  if (items.length === 0) {
    return <p className="text-slate-500 italic">пусто</p>
  }

  return (
    <ul className="space-y-3">
      {items.map((app) => (
        <ApplicationRow key={app.id} app={app} actionable={actionable} />
      ))}
    </ul>
  )
}

function ApplicationRow({ app, actionable }: { app: Application; actionable: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  const review = async (status: 'approved' | 'rejected') => {
    setBusy(status === 'approved' ? 'approve' : 'reject')
    setError(null)
    try {
      await api.patch(`/admin/applications/${app.id}`, { status, notes: notes || undefined })
      router.refresh()
    } catch (err) {
      const e = err as ApiError
      setError(e.code === 'already_processed' ? 'Заявка уже обработана' : 'Ошибка')
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h4 className="font-semibold text-lg">{app.name}</h4>
          <div className="mt-1 text-sm text-slate-400 space-y-0.5">
            <div>📱 {app.phone}</div>
            {app.email && <div>✉️ {app.email}</div>}
            {app.telegram && <div>✈️ {app.telegram}</div>}
            {(app.position || app.industry) && (
              <div>
                {[app.position, app.industry].filter(Boolean).join(' · ')}
                {app.revenueRange && ` · ${app.revenueRange}`}
              </div>
            )}
          </div>
          {app.motivation && (
            <p className="mt-3 text-sm text-slate-300 whitespace-pre-wrap">{app.motivation}</p>
          )}
        </div>

        <div className="text-xs text-slate-500 shrink-0">
          {new Date(app.createdAt).toLocaleDateString('ru-RU')}
        </div>
      </div>

      {actionable && (
        <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
          <input
            type="text"
            placeholder="Заметки (опционально)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => review('approved')}
              disabled={busy !== null}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            >
              {busy === 'approve' ? 'Одобрение…' : '✓ Одобрить'}
            </button>
            <button
              onClick={() => review('rejected')}
              disabled={busy !== null}
              className="rounded-lg border border-red-500/50 text-red-400 px-4 py-2 text-sm hover:bg-red-500/10 disabled:opacity-50"
            >
              {busy === 'reject' ? 'Отклонение…' : '✗ Отклонить'}
            </button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </div>
      )}

      {!actionable && (
        <div className="mt-3 text-xs text-slate-500">
          {app.status === 'approved' ? '✓ Одобрено' : '✗ Отклонено'}
          {app.reviewedAt && ` · ${new Date(app.reviewedAt).toLocaleString('ru-RU')}`}
        </div>
      )}
    </li>
  )
}
