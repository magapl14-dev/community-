import { apiServer } from '@/lib/api-server'
import Link from 'next/link'

interface Analytics {
  totalMembers: number
  activeMembers: number
  totalEvents: number
  totalRevenueKopeks: number
}

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const stats = await apiServer<Analytics>('/admin/analytics').catch(() => null)

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Дашборд</h2>

      {stats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat title="Всего членов" value={stats.totalMembers.toString()} />
          <Stat title="Активные" value={stats.activeMembers.toString()} accent="emerald" />
          <Stat title="Опубл. событий" value={stats.totalEvents.toString()} />
          <Stat
            title="Активная выручка"
            value={`${(stats.totalRevenueKopeks / 100).toLocaleString('ru-RU')} ₽`}
            accent="brand"
          />
        </div>
      ) : (
        <p className="text-slate-400">Не удалось загрузить статистику</p>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <QuickLink href="/admin/applications" title="Заявки" desc="Одобрить новых членов" />
        <QuickLink href="/admin/events" title="Создать событие" desc="Анонс + регистрация" />
      </section>
    </div>
  )
}

function Stat({
  title,
  value,
  accent,
}: {
  title: string
  value: string
  accent?: 'emerald' | 'brand'
}) {
  const color =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'brand'
        ? 'text-cyan-400'
        : 'text-slate-100'
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
      <div className="text-sm text-slate-400 uppercase tracking-wider">{title}</div>
      <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  )
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-700 bg-slate-800 p-5 hover:bg-slate-700/70 transition block"
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{desc}</p>
    </Link>
  )
}
