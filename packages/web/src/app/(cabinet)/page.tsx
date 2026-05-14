import Link from 'next/link'
import { apiServer } from '@/lib/api-server'

interface NewsItem {
  id: string
  title: string
  type: 'news' | 'announcement' | 'pinned'
  isPinned: boolean
  publishedAt: string | null
  author: { name: string }
}

interface EventItem {
  id: string
  title: string
  startAt: string
  location: string | null
  format: 'offline' | 'online' | 'hybrid'
}

export const dynamic = 'force-dynamic'

export default async function CabinetHome() {
  const [news, events] = await Promise.all([
    apiServer<{ items: NewsItem[] }>('/news?limit=5').catch(() => ({ items: [] })),
    apiServer<{ items: EventItem[] }>('/events?limit=5').catch(() => ({ items: [] })),
  ])

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <section className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold">Лента</h2>
        {news.items.length === 0 ? (
          <p className="text-slate-500">Пока ничего нет</p>
        ) : (
          <ul className="space-y-3">
            {news.items.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm transition"
              >
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {n.isPinned && <span className="text-brand">📌</span>}
                  {n.type === 'announcement' && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                      Объявление
                    </span>
                  )}
                  {n.publishedAt && (
                    <span>{new Date(n.publishedAt).toLocaleDateString('ru-RU')}</span>
                  )}
                </div>
                <h3 className="mt-2 font-semibold">{n.title}</h3>
                <p className="mt-1 text-sm text-slate-500">— {n.author.name}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-4">
        <h2 className="text-2xl font-bold">Ближайшие события</h2>
        {events.items.length === 0 ? (
          <p className="text-slate-500">Ничего не запланировано</p>
        ) : (
          <ul className="space-y-3">
            {events.items.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/cabinet/events/${e.id}`}
                  className="block rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition"
                >
                  <div className="text-xs text-slate-500">
                    {new Date(e.startAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="mt-1 font-semibold">{e.title}</div>
                  {e.location && (
                    <div className="text-sm text-slate-500">{e.location}</div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
