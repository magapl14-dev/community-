'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function LibrarySearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const [pending, startTransition] = useTransition()

  const submit = () => {
    const sp = new URLSearchParams(params.toString())
    if (value) sp.set('search', value)
    else sp.delete('search')
    startTransition(() => router.push(`/cabinet/library?${sp.toString()}`))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="relative"
    >
      <input
        type="search"
        placeholder="Поиск по статьям…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-64 rounded-lg border px-4 py-2 focus:border-brand focus:outline-none"
      />
      {pending && (
        <span className="absolute right-3 top-2.5 text-sm text-slate-400">…</span>
      )}
    </form>
  )
}
