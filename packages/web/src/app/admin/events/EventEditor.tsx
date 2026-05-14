'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createEventSchema, type CreateEventInput } from '@qd/shared'
import { api } from '@/lib/api'

export default function EventEditor() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: '',
      description: '',
      format: 'offline',
      isMembersOnly: true,
    },
  })

  const onSubmit = async (data: CreateEventInput) => {
    setSaving(true)
    setError(null)
    try {
      const event = await api.post<{ id: string }>('/admin/events', data)
      setCreatedId(event.id)
      form.reset()
      router.refresh()
    } catch (e) {
      setError((e as Error).message ?? 'Ошибка создания')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Название" error={form.formState.errors.title?.message}>
        <input className={inputCls} {...form.register('title')} />
      </Field>

      <Field label="Описание (Markdown)" error={form.formState.errors.description?.message}>
        <textarea className={inputCls + ' min-h-32'} {...form.register('description')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Начало" error={form.formState.errors.startAt?.message}>
          <input
            type="datetime-local"
            className={inputCls}
            {...form.register('startAt', { valueAsDate: true })}
          />
        </Field>
        <Field label="Окончание (опц.)" error={form.formState.errors.endAt?.message}>
          <input
            type="datetime-local"
            className={inputCls}
            {...form.register('endAt', { valueAsDate: true })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Формат">
          <select className={inputCls} {...form.register('format')}>
            <option value="offline">Офлайн</option>
            <option value="online">Онлайн</option>
            <option value="hybrid">Гибрид</option>
          </select>
        </Field>
        <Field label="Место" error={form.formState.errors.location?.message}>
          <input className={inputCls} {...form.register('location')} />
        </Field>
        <Field label="Лимит мест" error={form.formState.errors.capacity?.message}>
          <input
            type="number"
            min={1}
            className={inputCls}
            {...form.register('capacity', { valueAsNumber: true })}
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1" {...form.register('isMembersOnly')} />
        <span>Только для членов клуба</span>
      </label>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 border border-red-500/30">
          {error}
        </div>
      )}
      {createdId && (
        <div className="rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 border border-emerald-500/30">
          ✓ Создано (id: <code>{createdId}</code>). Статус: draft — опубликуйте из списка ниже.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? 'Создание…' : 'Создать черновик'}
      </button>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg bg-slate-900 border border-slate-700 px-4 py-2.5 focus:border-cyan-400 focus:outline-none text-slate-100'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-300">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </label>
  )
}
