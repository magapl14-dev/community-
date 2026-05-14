import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface MeData {
  id: string
  user: {
    id: string
    name: string
    email: string | null
    avatarUrl: string | null
    role: 'admin' | 'km' | 'member'
  }
  memberships: Array<{ status: string; expiresAt: string; plan: string }>
}

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<MeData>('/members/me'),
    staleTime: 5 * 60 * 1000,
  })
}

export function hasActiveMembership(me: MeData | undefined): boolean {
  if (!me) return false
  return me.memberships.some(
    (m) => m.status === 'active' && new Date(m.expiresAt).getTime() > Date.now(),
  )
}
