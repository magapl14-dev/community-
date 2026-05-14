'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

interface Props {
  fileId: string
  filename: string
  sizeBytes: number
}

export default function FileLink({ fileId, filename, sizeBytes }: Props) {
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const { url } = await api.get<{ url: string }>(`/library/files/${fileId}`)
      // Presigned URL — открываем в новой вкладке
      window.open(url, '_blank', 'noopener')
    } catch {
      alert('Не удалось получить ссылку на файл')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={download}
      disabled={busy}
      className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3 hover:bg-slate-50 disabled:opacity-50 w-full text-left"
    >
      <span className="text-2xl">📎</span>
      <span className="flex-1 min-w-0">
        <span className="block font-medium truncate">{filename}</span>
        <span className="text-xs text-slate-500">{formatSize(sizeBytes)}</span>
      </span>
      {busy && <span className="text-sm text-slate-400">…</span>}
    </button>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
