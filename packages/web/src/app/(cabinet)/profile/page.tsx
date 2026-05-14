import { apiServer } from '@/lib/api-server'
import ProfileEditor from './ProfileEditor'

interface Me {
  id: string
  position: string | null
  company: string | null
  industry: string | null
  city: string | null
  bio: string | null
  lookingFor: string | null
  canHelpWith: string | null
  telegramUsername: string | null
  phone: string | null
  skills: string[]
  isPublic: boolean
  joinedClubAt: string
  user: {
    id: string
    name: string
    email: string | null
    avatarUrl: string | null
  }
}

interface MembershipsResp extends Array<{ status: string; expiresAt: string; plan: string }> {}

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const [me, memberships] = await Promise.all([
    apiServer<Me>('/members/me'),
    apiServer<MembershipsResp>('/payments/history').catch(() => [] as MembershipsResp),
  ])

  const active = memberships.find(
    (m) => m.status === 'active' && new Date(m.expiresAt).getTime() > Date.now(),
  )

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <aside className="space-y-4 lg:col-span-1">
        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">
            Членство
          </h3>
          {active ? (
            <div className="mt-3">
              <div className="text-emerald-600 font-medium">Активно</div>
              <div className="mt-1 text-sm text-slate-600">
                до {new Date(active.expiresAt).toLocaleDateString('ru-RU')}
              </div>
              <div className="mt-1 text-sm text-slate-500">тариф: {active.plan}</div>
            </div>
          ) : (
            <div className="mt-3">
              <div className="text-red-600 font-medium">Не активно</div>
              <a
                href="/cabinet/billing"
                className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm text-white"
              >
                Продлить
              </a>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">
            В клубе с
          </h3>
          <div className="mt-2 text-slate-700">
            {new Date(me.joinedClubAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
      </aside>

      <section className="lg:col-span-2">
        <ProfileEditor initial={me} />
      </section>
    </div>
  )
}
