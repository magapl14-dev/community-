'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthPayload) => void
  }
}

interface TelegramAuthPayload {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export default function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!BOT_USERNAME || !containerRef.current) return

    window.onTelegramAuth = async (user) => {
      const res = await fetch('/api/proxy/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      })
      if (res.ok) {
        // Токены приходят в JSON — для httpOnly cookies нужно прогнать через
        // отдельный route handler, который их установит.
        const { accessToken, refreshToken } = await res.json()
        await fetch('/api/auth/set-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, refreshToken }),
        })
        router.push('/cabinet')
      } else {
        const err = (await res.json().catch(() => ({}))) as { code?: string }
        alert(
          err.code === 'not_registered'
            ? 'Ваш Telegram не зарегистрирован. Подайте заявку на вступление.'
            : 'Не удалось войти через Telegram',
        )
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    containerRef.current.appendChild(script)

    return () => {
      delete window.onTelegramAuth
    }
  }, [router])

  if (!BOT_USERNAME) {
    return (
      <button
        disabled
        className="w-full rounded-xl bg-slate-200 px-6 py-3 text-slate-500 cursor-not-allowed"
      >
        Telegram-вход не настроен
      </button>
    )
  }

  return <div ref={containerRef} className="flex justify-center" />
}
