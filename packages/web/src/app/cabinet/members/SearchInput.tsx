'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [value, setValue] = useState(defaultValue)
  const [pending, startTransition] = useTransition()

  const submit = (next: string) => {
    const sp = new URLSearchParams(params.toString())
    if (next) sp.set('search', next)
    else sp.delete('search')
    sp.delete('page')
    startTransition(() => router.push(`/cabinet/members?${sp.toString()}`))
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit(value)
      }}
      className="relative"
    >
      <input
        type="search"
        placeholder="Поиск по имени, компании, био…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-72 rounded-lg border px-4 py-2 focus:border-brand focus:outline-none"
      />
      {pending && (
        <span className="absolute right-3 top-2.5 text-sm text-slate-400">…</span>
      )}
    </form>
  )
}
