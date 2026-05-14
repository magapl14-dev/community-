import { apiServer } from '@/lib/api-server'
import ApplicationsTable from './ApplicationsTable'

interface Application {
  id: string
  name: string
  phone: string
  email: string | null
  telegram: string | null
  position: string | null
  industry: string | null
  revenueRange: string | null
  motivation: string | null
  status: 'new' | 'reviewing' | 'approved' | 'rejected'
  reviewedAt: string | null
  createdAt: string
}

export const dynamic = 'force-dynamic'

export default async function AdminApplicationsPage() {
  const items = await apiServer<Application[]>('/admin/applications').catch(() => [])

  const grouped = {
    pending: items.filter((a) => a.status === 'new' || a.status === 'reviewing'),
    processed: items.filter((a) => a.status === 'approved' || a.status === 'rejected'),
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Заявки</h2>

      <section>
        <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Новые ({grouped.pending.length})
        </h3>
        <ApplicationsTable items={grouped.pending} actionable />
      </section>

      <section>
        <h3 className="text-sm uppercase tracking-wider text-slate-400 mb-3">
          Обработанные ({grouped.processed.length})
        </h3>
        <ApplicationsTable items={grouped.processed} actionable={false} />
      </section>
    </div>
  )
}
