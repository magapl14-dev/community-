export const ACCESS_TOKEN_TTL_SEC = 15 * 60 // 15 минут
export const REFRESH_TOKEN_TTL_SEC = 30 * 24 * 60 * 60 // 30 дней

export const TELEGRAM_AUTH_MAX_AGE_SEC = 86_400 // 24 часа

export const LOGIN_RATE_LIMIT = {
  maxAttempts: 5,
  windowSec: 60,
  banSec: 900,
} as const

export const MEMBERSHIP_PLANS = {
  base: { priceKopeks: 3_000_000, durationDays: 365 },
} as const

export const MEMBERSHIP_REMINDER_DAYS = [14, 7, 3, 1] as const

export const EVENT_REMINDER_OFFSETS_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '1h': 60 * 60 * 1000,
} as const

export const FIELD_LIMITS = {
  bio: 500,
  lookingFor: 200,
  canHelpWith: 200,
  motivation: 1000,
} as const

export const TIMEZONE = 'Europe/Moscow' // UTC+3, отображение
export const DEFAULT_CITY = 'Махачкала'

export const ERROR_CODES = {
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  accountDisabled: 'account_disabled',
  membershipExpired: 'membership_expired',
  invalidCredentials: 'invalid_credentials',
  invalidTelegramData: 'invalid_telegram_data',
  notRegistered: 'not_registered',
  tooManyAttempts: 'too_many_attempts',
  alreadyRegistered: 'already_registered',
  noCapacity: 'no_capacity',
  eventStarted: 'event_started',
  alreadyProcessed: 'already_processed',
  notFound: 'not_found',
  validation: 'validation_error',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]
