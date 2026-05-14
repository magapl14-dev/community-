import Link from 'next/link'
import { apiServer } from '@/lib/api-server'

interface EventItem {
  id: string
  title: string
  format: 'offline' | 'online' | 'hybrid'
  startAt: string
  endAt: string | null
  location: string | null
  capacity: number | null
  coverUrl: string | null
  status: 'published'
}

export const dynamic = 'force-dynamic'

export default async function EventsListPage() {
  const data = await apiServer<{ items: EventItem[] }>('/events?limit=30').catch(() => ({
    items: [] as EventItem[],
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">События</h2>
      {data.items.length === 0 ? (
        <p className="text-slate-500">Запланированных событий нет</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.items.map((e) => (
            <li key={e.id}>
              <Link
                href={`/cabinet/events/${e.id}`}
                className="block rounded-xl border bg-white overflow-hidden hover:shadow-md transition"
              >
                {e.coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.coverUrl} alt="" className="h-40 w-full object-cover" />
                )}
                <div className="p-5">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">
                    {formatBadge(e.format)} ·{' '}
                    {new Date(e.startAt).toLocaleString('ru-RU', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <h3 className="mt-2 font-semibold text-lg">{e.title}</h3>
                  {e.location && (
                    <p className="mt-1 text-sm text-slate-600">{e.location}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatBadge(f: 'offline' | 'online' | 'hybrid'): string {
  return { offline: 'Офлайн', online: 'Онлайн', hybrid: 'Гибрид' }[f]
}
