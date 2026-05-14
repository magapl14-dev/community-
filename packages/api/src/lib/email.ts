import { env } from './env.js'
import { logger } from './logger.js'

// ─── Unisender API ───
// Docs: https://www.unisender.com/ru/support/integration/api/

const UNISENDER_URL = 'https://api.unisender.com/ru/api'

interface UnisenderResponse {
  result?: { id: number }
  error?: string
  code?: string
}

export interface SendEmailInput {
  to: string
  toName?: string
  subject: string
  htmlBody: string
  textBody?: string
}

const SENDER_EMAIL = 'noreply@quantum-dag.ru'
const SENDER_NAME = 'Quantum Dagestan'

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!env.UNISENDER_API_KEY) {
    logger.warn({ to: input.to, subject: input.subject }, 'email skipped (UNISENDER_API_KEY missing)')
    return
  }

  const params = new URLSearchParams({
    format: 'json',
    api_key: env.UNISENDER_API_KEY,
    email: input.to,
    sender_name: SENDER_NAME,
    sender_email: SENDER_EMAIL,
    subject: input.subject,
    body: input.htmlBody,
    list_id: '1', // системный список — настроить в кабинете Unisender
    lang: 'ru',
  })

  const res = await fetch(`${UNISENDER_URL}/sendEmail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = (await res.json()) as UnisenderResponse
  if (data.error) {
    throw new Error(`Unisender error: ${data.error} (${data.code ?? '—'})`)
  }
  logger.info({ to: input.to, subject: input.subject, msgId: data.result?.id }, 'email sent')
}

// ─── Шаблоны ───

const WEB_BASE = 'https://quantum-dag.ru'

export function buildActivationEmail(name: string, activationUrl: string): SendEmailInput {
  return {
    to: '',
    subject: 'Добро пожаловать в Quantum Dagestan',
    htmlBody: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1B3A6B">Здравствуйте, ${escapeHtml(name)}!</h1>
        <p>Ваша заявка одобрена. Чтобы активировать аккаунт, перейдите по ссылке:</p>
        <p style="margin:24px 0">
          <a href="${activationUrl}" style="background:#1B3A6B;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px">
            Активировать аккаунт
          </a>
        </p>
        <p style="color:#64748b;font-size:14px">Ссылка действительна 48 часов.</p>
      </div>
    `,
  }
}

export function buildMembershipActivatedEmail(
  name: string,
  amountKopecks: number,
  expiresAt: Date,
): SendEmailInput {
  const amount = (amountKopecks / 100).toLocaleString('ru-RU')
  const expires = expiresAt.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })
  return {
    to: '',
    subject: 'Членство Quantum Dagestan активировано',
    htmlBody: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1B3A6B">Спасибо за оплату, ${escapeHtml(name)}!</h1>
        <p>Ваше членство активировано. Оплачено: <strong>${amount} ₽</strong>.</p>
        <p>Период действия — до <strong>${expires}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${WEB_BASE}/cabinet" style="background:#1B3A6B;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px">
            Перейти в личный кабинет
          </a>
        </p>
        <p style="color:#64748b;font-size:14px">
          Фискальный чек придёт отдельным письмом от ЮKassa (54-ФЗ).
        </p>
      </div>
    `,
  }
}

export function buildPasswordResetEmail(resetUrl: string): SendEmailInput {
  return {
    to: '',
    subject: 'Сброс пароля Quantum Dagestan',
    htmlBody: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h1 style="color:#1B3A6B">Восстановление пароля</h1>
        <p>Кто-то запросил сброс пароля для вашего аккаунта. Если это были вы:</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#1B3A6B;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px">
            Сбросить пароль
          </a>
        </p>
        <p style="color:#64748b;font-size:14px">Ссылка действительна 24 часа. Если это не вы — просто игнорируйте.</p>
      </div>
    `,
  }
}

export function getWebBase(): string {
  return WEB_BASE
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return c
    }
  })
}
