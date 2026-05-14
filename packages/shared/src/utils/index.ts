export function formatKopeks(kopeks: number): string {
  const rubles = Math.floor(kopeks / 100)
  return new Intl.NumberFormat('ru-RU').format(rubles) + ' ₽'
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function isExpired(expiresAt: Date | string | null | undefined): boolean {
  if (!expiresAt) return true
  const date = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return date.getTime() < Date.now()
}

export function pluralizeRu(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

const PHONE_RE = /^\+?[78]\d{10}$/

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return '+7' + digits.slice(1)
  }
  if (digits.length === 10) return '+7' + digits
  return null
}

export function isValidPhone(input: string): boolean {
  return PHONE_RE.test(input.replace(/[\s()-]/g, ''))
}
