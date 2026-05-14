import { Bot, InlineKeyboard } from 'grammy'
import { addDays } from 'date-fns'
import crypto from 'node:crypto'
import { MEMBERSHIP_PLANS } from '@qd/shared'
import { env } from '../lib/env.js'
import { logger } from '../lib/logger.js'
import { prisma } from '../lib/db.js'
import { issueOneTimeToken } from '../lib/one-time-token.js'
import { buildActivationEmail, getWebBase, sendEmail } from '../lib/email.js'

let bot: Bot | null = null

// HMAC-подпись для callback_data — защита от подделки кнопок
function signCallback(action: string, applicationId: string): string {
  const data = `${action}:${applicationId}`
  const sig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(data)
    .digest('hex')
    .slice(0, 12)
  return `${data}:${sig}`
}

function verifyCallback(payload: string): { action: string; applicationId: string } | null {
  const parts = payload.split(':')
  if (parts.length !== 3) return null
  const [action, applicationId, providedSig] = parts as [string, string, string]
  const expectedSig = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${action}:${applicationId}`)
    .digest('hex')
    .slice(0, 12)
  // timing-safe compare
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))
  ) {
    return null
  }
  return { action, applicationId }
}

export function getAdminBot(): Bot | null {
  if (bot) return bot
  if (!env.TELEGRAM_ADMIN_BOT_TOKEN) return null

  bot = new Bot(env.TELEGRAM_ADMIN_BOT_TOKEN)

  bot.callbackQuery(/^(approve|reject):/, async (ctx) => {
    const parsed = verifyCallback(ctx.callbackQuery.data)
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: 'Недействительная кнопка', show_alert: true })
      return
    }

    const app_ = await prisma.application.findUnique({ where: { id: parsed.applicationId } })
    if (!app_) {
      await ctx.answerCallbackQuery({ text: 'Заявка не найдена', show_alert: true })
      return
    }
    if (app_.status !== 'new' && app_.status !== 'reviewing') {
      await ctx.answerCallbackQuery({ text: 'Уже обработана', show_alert: true })
      return
    }

    if (parsed.action === 'approve') {
      await approveApplication(parsed.applicationId)
      await ctx.editMessageText(`✅ Одобрено: ${app_.name}`)
      await ctx.answerCallbackQuery({ text: 'Заявка одобрена' })
      return
    }

    if (parsed.action === 'reject') {
      await prisma.application.update({
        where: { id: parsed.applicationId },
        data: { status: 'rejected', reviewedAt: new Date() },
      })
      await ctx.editMessageText(`❌ Отклонено: ${app_.name}`)
      await ctx.answerCallbackQuery({ text: 'Заявка отклонена' })
    }
  })

  bot.catch((err) => logger.error({ err }, 'admin-bot error'))
  return bot
}

async function approveApplication(applicationId: string) {
  const { userId, email, name } = await prisma.$transaction(async (tx) => {
    const app_ = await tx.application.findUnique({ where: { id: applicationId } })
    if (!app_) throw new Error('application_not_found')

    const user = await tx.user.create({
      data: {
        email: app_.email,
        passwordHash: null, // установит при активации
        name: app_.name,
        role: 'member',
        isActive: false,
        member: {
          create: {
            joinedClubAt: new Date(),
            position: app_.position,
            industry: app_.industry,
            telegramUsername: app_.telegram?.replace(/^@/, ''),
            phone: app_.phone,
          },
        },
      },
    })

    await tx.membership.create({
      data: {
        userId: user.id,
        plan: 'base',
        amount: MEMBERSHIP_PLANS.base.priceKopeks,
        status: 'active',
        startsAt: new Date(),
        expiresAt: addDays(new Date(), MEMBERSHIP_PLANS.base.durationDays),
        paymentMethod: 'manual',
      },
    })

    await tx.application.update({
      where: { id: app_.id },
      data: { status: 'approved', reviewedAt: new Date() },
    })

    return { userId: user.id, email: app_.email, name: app_.name }
  })

  // Активационное письмо — вне транзакции, не блокируем БД
  if (email) {
    const token = await issueOneTimeToken('activate', userId)
    const url = `${getWebBase()}/auth/activate?token=${token}`
    sendEmail({ ...buildActivationEmail(name, url), to: email }).catch((err) =>
      logger.error({ err, userId, email }, 'activation email failed'),
    )
  }

  return { userId }
}

// ─── Публичный API для нотификаций ───

export async function notifyNewApplication(applicationId: string) {
  const bot_ = getAdminBot()
  if (!bot_ || !env.TELEGRAM_ADMIN_CHAT_ID) return

  const app_ = await prisma.application.findUnique({ where: { id: applicationId } })
  if (!app_) return

  const lines = [
    '🆕 *Новая заявка!*',
    '',
    `*Имя:* ${app_.name}`,
    `*Телефон:* ${app_.phone}`,
    app_.email && `*Email:* ${app_.email}`,
    app_.telegram && `*Telegram:* ${app_.telegram}`,
    app_.position && `*Должность:* ${app_.position}`,
    app_.industry && `*Индустрия:* ${app_.industry}`,
    app_.revenueRange && `*Выручка:* ${app_.revenueRange}`,
    app_.motivation && `*Мотивация:* ${app_.motivation}`,
  ].filter(Boolean) as string[]

  const keyboard = new InlineKeyboard()
    .text('✅ Одобрить', signCallback('approve', app_.id))
    .text('❌ Отклонить', signCallback('reject', app_.id))

  await bot_.api.sendMessage(env.TELEGRAM_ADMIN_CHAT_ID, lines.join('\n'), {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  })
}

export async function notifyKMSubmissions(message: string) {
  const bot_ = getAdminBot()
  if (!bot_ || !env.TELEGRAM_ADMIN_CHAT_ID) return
  await bot_.api.sendMessage(env.TELEGRAM_ADMIN_CHAT_ID, message)
}

export async function startAdminBot() {
  const bot_ = getAdminBot()
  if (!bot_) {
    logger.info('Admin bot not configured (TELEGRAM_ADMIN_BOT_TOKEN missing) — skipping')
    return
  }
  void bot_.start({ onStart: (me) => logger.info({ username: me.username }, 'admin bot started') })
}

export async function stopAdminBot() {
  if (bot) await bot.stop()
}
