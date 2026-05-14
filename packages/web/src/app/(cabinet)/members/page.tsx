import { apiServer } from '@/lib/api-server'
import { MemberCard, type MemberCardData } from '@/components/MemberCard'
import SearchInput from './SearchInput'

interface MembersResponse {
  items: MemberCardData[]
  page: number
  limit: number
  total: number
}

interface MeResponse {
  memberships: Array<{ status: string; expiresAt: string }>
}

export const dynamic = 'force-dynamic'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { search?: string; industry?: string; page?: string }
}) {
  const params = new URLSearchParams()
  if (searchParams.search) params.set('search', searchParams.search)
  if (searchParams.industry) params.set('industry', searchParams.industry)
  if (searchParams.page) params.set('page', searchParams.page)

  let data: MembersResponse | null = null
  let canSeeContacts = false
  let errorMessage: string | null = null

  try {
    const [list, me] = await Promise.all([
      apiServer<MembersResponse>(`/members?${params.toString()}`),
      apiServer<MeResponse>('/members/me').catch(() => null),
    ])
    data = list
    canSeeContacts = Boolean(
      me?.memberships?.some(
        (m) => m.status === 'active' && new Date(m.expiresAt).getTime() > Date.now(),
      ),
    )
  } catch (err) {
    const code = (err as { code?: string }).code
    errorMessage =
      code === 'membership_expired'
        ? 'Каталог доступен при активном членстве.'
        : 'Не удалось загрузить участников'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Участники</h2>
          {data && (
            <p className="mt-1 text-sm text-slate-500">Всего: {data.total}</p>
          )}
        </div>
        <SearchInput defaultValue={searchParams.search ?? ''} />
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-amber-800">{errorMessage}</div>
      )}

      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((m) => (
            <MemberCard key={m.id} member={m} canSeeContacts={canSeeContacts} />
          ))}
          {data.items.length === 0 && (
            <p className="text-slate-500 col-span-full text-center py-10">Ничего не найдено</p>
          )}
        </div>
      )}
    </div>
  )
}
