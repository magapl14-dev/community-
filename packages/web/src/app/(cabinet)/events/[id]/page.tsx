import { apiServer } from '@/lib/api-server'
import { notFound } from 'next/navigation'
import RegisterButton from './RegisterButton'

interface EventDetail {
  id: string
  title: string
  description: string | null
  format: 'offline' | 'online' | 'hybrid'
  startAt: string
  endAt: string | null
  location: string | null
  capacity: number | null
  coverUrl: string | null
  status: 'published'
  _count: { registrations: number }
}

interface Attendee {
  id: string
  status: 'registered' | 'attended' | 'cancelled'
  user: {
    id: string
    name: string
    avatarUrl: string | null
    member: { position: string | null; company: string | null } | null
  }
}

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  let event: EventDetail
  let attendees: Attendee[] = []

  try {
    [event, attendees] = await Promise.all([
      apiServer<EventDetail>(`/events/${params.id}`),
      apiServer<Attendee[]>(`/events/${params.id}/attendees`).catch(() => []),
    ])
  } catch {
    notFound()
  }

  const meId = await apiServer<{ id: string }>('/members/me')
    .then((m) => m.id)
    .catch(() => null)

  const isRegistered = meId
    ? attendees.some((a) => a.user.id === meId && a.status !== 'cancelled')
    : false

  const seatsLeft =
    event.capacity !== null ? event.capacity - event._count.registrations : null
  const isPast = new Date(event.startAt).getTime() < Date.now()

  return (
    <article className="space-y-6 max-w-3xl">
      {event.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.coverUrl} alt="" className="rounded-xl w-full max-h-96 object-cover" />
      )}

      <header className="space-y-3">
        <div className="text-sm text-slate-500 uppercase tracking-wide">
          {formatBadge(event.format)} ·{' '}
          {new Date(event.startAt).toLocaleString('ru-RU', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <h1 className="text-3xl font-bold">{event.title}</h1>
        {event.location && <p className="text-slate-600">📍 {event.location}</p>}
      </header>

      {event.description && (
        <div className="prose prose-slate max-w-none">
          <p style={{ whiteSpace: 'pre-wrap' }}>{event.description}</p>
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">
            Зарегистрировались: <strong>{event._count.registrations}</strong>
            {event.capacity !== null && <> / {event.capacity}</>}
          </div>
          {seatsLeft !== null && seatsLeft <= 5 && seatsLeft > 0 && !isRegistered && (
            <div className="mt-1 text-sm text-amber-600">Осталось {seatsLeft} мест</div>
          )}
        </div>
        <RegisterButton
          eventId={event.id}
          initialRegistered={isRegistered}
          isPast={isPast}
          isFull={seatsLeft !== null && seatsLeft <= 0}
        />
      </div>

      {attendees.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Участники</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {attendees
              .filter((a) => a.status !== 'cancelled')
              .map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-lg border p-3 bg-white">
                  <div className="size-10 rounded-full bg-brand text-white flex items-center justify-center text-sm font-semibold">
                    {a.user.name
                      .split(' ')
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{a.user.name}</div>
                    {a.user.member?.position && (
                      <div className="text-xs text-slate-500 truncate">
                        {a.user.member.position}
                        {a.user.member.company && ` · ${a.user.member.company}`}
                      </div>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}
    </article>
  )
}

function formatBadge(f: 'offline' | 'online' | 'hybrid'): string {
  return { offline: 'Офлайн', online: 'Онлайн', hybrid: 'Гибрид' }[f]
}
