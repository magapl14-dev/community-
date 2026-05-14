export type UserRole = 'admin' | 'km' | 'member'

export type EventFormat = 'offline' | 'online' | 'hybrid'

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'past'

export type MembershipStatus = 'pending' | 'active' | 'expired' | 'cancelled'

export type ApplicationStatus = 'new' | 'reviewing' | 'approved' | 'rejected'

export type NewsType = 'news' | 'announcement' | 'pinned'

export type RegistrationStatus = 'registered' | 'attended' | 'cancelled'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface PublicUser {
  id: string
  name: string
  avatarUrl: string | null
  role: UserRole
}

export interface ApiErrorBody {
  code: string
  message?: string
  details?: unknown
}

export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}
