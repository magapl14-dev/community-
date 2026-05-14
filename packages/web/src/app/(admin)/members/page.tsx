import { apiServer } from '@/lib/api-server'

interface AdminUser {
  id: string
  name: string
  email: string | null
  role: 'admin' | 'km' | 'member'
  isActive: boolean
  createdAt: string
  member: {
    position: string | null
    company: string | null
    phone: string | null
  } | null
  memberships: Array<{ status: string; expiresAt: string; plan: string }>
}

export const dynamic = 'force-dynamic'

export default async function AdminMembersPage() {
  const users = await apiServer<AdminUser[]>('/admin/users').catch(() => [] as AdminUser[])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Участники</h2>

      <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Контакты</th>
              <th className="px-4 py-3 text-left">Должность</th>
              <th className="px-4 py-3 text-left">Роль</th>
              <th className="px-4 py-3 text-left">Членство</th>
              <th className="px-4 py-3 text-left">Статус</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const active = u.memberships[0]
              const isExpired = active && new Date(active.expiresAt).getTime() < Date.now()
              return (
                <tr key={u.id} className="border-t border-slate-700">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {u.email && <div>{u.email}</div>}
                    {u.member?.phone && <div>{u.member.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {[u.member?.position, u.member?.company].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {active ? (
                      <>
                        до {new Date(active.expiresAt).toLocaleDateString('ru-RU')}
                        {isExpired && <span className="ml-1 text-red-400">(истёк)</span>}
                      </>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="text-emerald-400">✓ активен</span>
                    ) : (
                      <span className="text-amber-400">не активирован</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Участников нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoleBadge({ role }: { role: 'admin' | 'km' | 'member' }) {
  const styles = {
    admin: 'bg-red-900/50 text-red-300',
    km: 'bg-blue-900/50 text-blue-300',
    member: 'bg-slate-700 text-slate-300',
  }[role]
  return <span className={`rounded px-2 py-0.5 text-xs ${styles}`}>{role}</span>
}
