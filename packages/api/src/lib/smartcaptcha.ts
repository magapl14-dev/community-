import { env, isProd } from './env.js'
import { logger } from './logger.js'

// Yandex SmartCaptcha — серверная валидация
// Docs: https://yandex.cloud/ru/docs/smartcaptcha/concepts/validation

const VALIDATE_URL = 'https://smartcaptcha.yandexcloud.net/validate'

interface ValidateResponse {
  status: 'ok' | 'failed'
  message?: string
  host?: string
}

export async function verifySmartCaptcha(token: string, ip: string): Promise<boolean> {
  const secret = env.SMARTCAPTCHA_SERVER_KEY
  if (!secret) {
    if (isProd) {
      logger.error('SMARTCAPTCHA_SERVER_KEY missing in production')
      return false
    }
    logger.warn('SmartCaptcha skipped (dev mode)')
    return true
  }

  const params = new URLSearchParams({ secret, token, ip })
  try {
    const res = await fetch(`${VALIDATE_URL}?${params.toString()}`)
    if (!res.ok) {
      logger.warn({ status: res.status }, 'SmartCaptcha HTTP error')
      return false
    }
    const data = (await res.json()) as ValidateResponse
    return data.status === 'ok'
  } catch (err) {
    logger.error({ err }, 'SmartCaptcha verify failed')
    return false
  }
}
