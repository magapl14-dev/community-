import { apiServer } from '@/lib/api-server'
import EventEditor from './EventEditor'
import EventsTable from './EventsTable'

interface AdminEvent {
  id: string
  title: string
  format: 'offline' | 'online' | 'hybrid'
  startAt: string
  endAt: string | null
  location: string | null
  capacity: number | null
  status: 'draft' | 'published' | 'cancelled' | 'past'
}

export const dynamic = 'force-dynamic'

export default async function AdminEventsPage() {
  // Используем публичный /events для получения published + расширенно через admin
  // (отдельного admin/events GET нет в текущей API; берём общий список и фильтруем)
  const list = await apiServer<{ items: AdminEvent[] }>('/events?limit=100').catch(() => ({
    items: [] as AdminEvent[],
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Создать событие</h2>
        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <EventEditor />
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">События</h2>
        <EventsTable items={list.items} />
      </div>
    </div>
  )
}
