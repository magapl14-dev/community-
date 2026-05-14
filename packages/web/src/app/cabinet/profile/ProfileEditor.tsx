'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateMemberSchema, type UpdateMemberInput, FIELD_LIMITS } from '@qd/shared'
import { api } from '@/lib/api'

interface Initial {
  position: string | null
  company: string | null
  industry: string | null
  city: string | null
  bio: string | null
  lookingFor: string | null
  canHelpWith: string | null
  telegramUsername: string | null
  phone: string | null
  skills: string[]
  isPublic: boolean
  user: { id: string; name: string; avatarUrl: string | null }
}

export default function ProfileEditor({ initial }: { initial: Initial }) {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState(initial.user.avatarUrl)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<UpdateMemberInput>({
    resolver: zodResolver(updateMemberSchema),
    defaultValues: {
      position: initial.position ?? '',
      company: initial.company ?? '',
      industry: initial.industry ?? '',
      city: initial.city ?? '',
      bio: initial.bio ?? '',
      lookingFor: initial.lookingFor ?? '',
      canHelpWith: initial.canHelpWith ?? '',
      telegramUsername: initial.telegramUsername ?? '',
      phone: initial.phone ?? '',
      skills: initial.skills ?? [],
      isPublic: initial.isPublic,
    },
  })

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл больше 5 MB')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/proxy/upload/avatar', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('upload failed')
      const { avatarUrl: newUrl } = (await res.json()) as { avatarUrl: string }
      setAvatarUrl(newUrl)
      router.refresh()
    } catch {
      setError('Не удалось загрузить аватар')
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (data: UpdateMemberInput) => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await api.patch('/members/me', data)
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError((e as Error).message || 'Не удалось сохранить')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Аватар */}
      <div className="rounded-xl border bg-white p-5 flex items-center gap-5">
        <Avatar src={avatarUrl} name={initial.user.name} />
        <div className="flex-1">
          <div className="font-semibold text-lg">{initial.user.name}</div>
          <label className="mt-2 inline-block">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={onAvatarChange}
              disabled={uploading}
              className="hidden"
            />
            <span className="cursor-pointer rounded-lg border px-4 py-2 text-sm hover:bg-slate-50 inline-block">
              {uploading ? 'Загрузка…' : 'Изменить фото'}
            </span>
          </label>
        </div>
      </div>

      {/* Поля */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <Row>
          <Field label="Должность" error={form.formState.errors.position?.message}>
            <input className={inputCls} {...form.register('position')} />
          </Field>
          <Field label="Компания" error={form.formState.errors.company?.message}>
            <input className={inputCls} {...form.register('company')} />
          </Field>
        </Row>
        <Row>
          <Field label="Индустрия" error={form.formState.errors.industry?.message}>
            <input className={inputCls} {...form.register('industry')} />
          </Field>
          <Field label="Город" error={form.formState.errors.city?.message}>
            <input className={inputCls} {...form.register('city')} />
          </Field>
        </Row>

        <Field
          label={`О себе (${form.watch('bio')?.length ?? 0}/${FIELD_LIMITS.bio})`}
          error={form.formState.errors.bio?.message}
        >
          <textarea
            className={inputCls + ' min-h-24'}
            maxLength={FIELD_LIMITS.bio}
            {...form.register('bio')}
          />
        </Field>

        <Row>
          <Field label="Что ищу" error={form.formState.errors.lookingFor?.message}>
            <input className={inputCls} maxLength={FIELD_LIMITS.lookingFor} {...form.register('lookingFor')} />
          </Field>
          <Field label="Чем помогу" error={form.formState.errors.canHelpWith?.message}>
            <input className={inputCls} maxLength={FIELD_LIMITS.canHelpWith} {...form.register('canHelpWith')} />
          </Field>
        </Row>

        <Row>
          <Field label="Telegram (без @)" error={form.formState.errors.telegramUsername?.message}>
            <input className={inputCls} {...form.register('telegramUsername')} />
          </Field>
          <Field label="Телефон" error={form.formState.errors.phone?.message}>
            <input className={inputCls} type="tel" {...form.register('phone')} />
          </Field>
        </Row>

        <label className="flex items-start gap-3 pt-2 cursor-pointer">
          <input type="checkbox" className="mt-1" {...form.register('isPublic')} />
          <span>
            <span className="font-medium">Показывать профиль в каталоге</span>
            <span className="block text-sm text-slate-500">
              Если выключить — другие участники не увидят ваш профиль
            </span>
          </span>
        </label>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {saved && <span className="text-emerald-600 text-sm">✓ Сохранено</span>}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand px-6 py-3 text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand focus:outline-none'

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </label>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className="size-20 rounded-full object-cover bg-slate-100" />
    )
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div className="size-20 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xl">
      {initials}
    </div>
  )
}
