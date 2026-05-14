'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createNewsSchema, type CreateNewsInput } from '@qd/shared'
import { api } from '@/lib/api'

export default function NewsEditor() {
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateNewsInput>({
    resolver: zodResolver(createNewsSchema),
    defaultValues: {
      title: '',
      body: '',
      type: 'news',
      isPinned: false,
      publishedAt: new Date(),
    },
  })

  const type = form.watch('type')

  const onSubmit = async (data: CreateNewsInput) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const post = await api.post<{ id: string; type: string }>('/admin/news', data)
      setSuccess(
        post.type === 'announcement'
          ? '✓ Опубликовано, push отправлен всем членам'
          : '✓ Опубликовано',
      )
      form.reset()
    } catch (e) {
      setError((e as Error).message ?? 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Заголовок" error={form.formState.errors.title?.message}>
        <input className={inputCls} {...form.register('title')} />
      </Field>

      <Field label="Текст (Markdown)" error={form.formState.errors.body?.message}>
        <textarea className={inputCls + ' min-h-48 font-mono text-sm'} {...form.register('body')} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Тип">
          <select className={inputCls} {...form.register('type')}>
            <option value="news">Новость</option>
            <option value="announcement">Объявление (с push)</option>
            <option value="pinned">Закреплённое</option>
          </select>
        </Field>
        <Field label="Дата публикации">
          <input
            type="datetime-local"
            className={inputCls}
            {...form.register('publishedAt', { valueAsDate: true })}
          />
        </Field>
        <Field label=" ">
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" {...form.register('isPinned')} />
            <span className="text-sm">Закрепить в начале ленты</span>
          </label>
        </Field>
      </div>

      {type === 'announcement' && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-sm text-amber-300">
          ⚠️ Объявление отправит push всем активным членам — это необратимо
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 border border-red-500/30">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 border border-emerald-500/30">
          {success}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-emerald-600 px-6 py-3 font-medium hover:bg-emerald-500 disabled:opacity-50"
      >
        {saving ? 'Публикация…' : 'Опубликовать'}
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
