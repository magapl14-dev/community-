import { logger } from './logger.js'
import { prisma } from './db.js'

// ─── Expo Push API ───
// Docs: https://docs.expo.dev/push-notifications/sending-notifications/
// Expo проксирует в APNs/FCM, поэтому отдельный FCM-клиент пока не нужен.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_PUSH_BATCH = 100 // лимит Expo

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, unknown>
  /** Идентификатор канала на Android. */
  channelId?: string
  /** Бейдж на иконке iOS. */
  badge?: number
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

interface ExpoSendResponse {
  data?: ExpoPushTicket[]
  errors?: Array<{ message: string }>
}

function isExpoToken(token: string): boolean {
  return token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[')
}

async function expoSend(messages: Array<PushPayload & { to: string }>) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) throw new Error(`Expo Push HTTP ${res.status}`)
  return (await res.json()) as ExpoSendResponse
}

/**
 * Отправляет push одному пользователю — всем его активным токенам.
 * Невалидные токены автоматически помечаются is_active=false.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId, isActive: true },
    select: { id: true, token: true },
  })
  if (tokens.length === 0) return

  await sendToTokens(tokens, payload)
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (userIds.length === 0) return
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds }, isActive: true },
    select: { id: true, token: true },
  })
  if (tokens.length === 0) return

  await sendToTokens(tokens, payload)
}

async function sendToTokens(
  tokens: Array<{ id: string; token: string }>,
  payload: PushPayload,
): Promise<void> {
  const expoTokens = tokens.filter((t) => isExpoToken(t.token))
  if (expoTokens.length === 0) return

  // Батчим по 100
  for (let i = 0; i < expoTokens.length; i += EXPO_PUSH_BATCH) {
    const batch = expoTokens.slice(i, i + EXPO_PUSH_BATCH)
    const messages = batch.map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      channelId: payload.channelId,
      badge: payload.badge,
      priority: 'high' as const,
    }))

    try {
      const result = await expoSend(messages)
      const tickets = result.data ?? []

      // Сопоставляем ticket'ы с токенами по индексу
      const invalidTokenIds: string[] = []
      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'error') {
          const errCode = ticket.details?.error
          if (errCode === 'DeviceNotRegistered' || errCode === 'InvalidCredentials') {
            const tokenRow = batch[idx]
            if (tokenRow) invalidTokenIds.push(tokenRow.id)
          } else {
            logger.warn({ ticket }, 'expo push error')
          }
        }
      })

      if (invalidTokenIds.length > 0) {
        await prisma.pushToken.updateMany({
          where: { id: { in: invalidTokenIds } },
          data: { isActive: false },
        })
        logger.info({ count: invalidTokenIds.length }, 'deactivated invalid push tokens')
      }
    } catch (err) {
      logger.error({ err }, 'expo push batch failed')
    }
  }
}
