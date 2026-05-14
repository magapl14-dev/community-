import crypto from 'node:crypto'
import { env } from './env.js'

// ─── ЮKassa API v3 — минимальный клиент ───
// Docs: https://yookassa.ru/developers/api

const API_URL = 'https://api.yookassa.ru/v3'

export interface CreatePaymentInput {
  amountKopeks: number
  description: string
  returnUrl: string
  metadata: Record<string, string>
  receipt: {
    customerEmail?: string | null
    customerPhone?: string | null
    description: string
    amountKopeks: number
  }
}

export interface YukassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: { value: string; currency: string }
  confirmation: { type: string; confirmation_url: string }
  paid: boolean
}

export interface YukassaWebhookEvent {
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded'
  object: {
    id: string
    status: string
    amount: { value: string; currency: string }
    metadata?: Record<string, string>
  }
}

function authHeader(): string {
  if (!env.YUKASSA_SHOP_ID || !env.YUKASSA_SECRET_KEY) {
    throw new Error('YUKASSA_SHOP_ID and YUKASSA_SECRET_KEY are required')
  }
  const credentials = `${env.YUKASSA_SHOP_ID}:${env.YUKASSA_SECRET_KEY}`
  return 'Basic ' + Buffer.from(credentials).toString('base64')
}

function kopeksToValue(kopeks: number): string {
  return (kopeks / 100).toFixed(2)
}

export async function createPayment(input: CreatePaymentInput): Promise<YukassaPayment> {
  const idempotenceKey = crypto.randomUUID()

  const body = {
    amount: { value: kopeksToValue(input.amountKopeks), currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: input.returnUrl },
    description: input.description,
    metadata: input.metadata,
    receipt: {
      customer: {
        ...(input.receipt.customerEmail && { email: input.receipt.customerEmail }),
        ...(input.receipt.customerPhone && { phone: input.receipt.customerPhone }),
      },
      items: [
        {
          description: input.receipt.description,
          quantity: '1.00',
          amount: { value: kopeksToValue(input.receipt.amountKopeks), currency: 'RUB' },
          vat_code: 1, // 1 = НДС не облагается (УСН)
          payment_subject: 'service',
          payment_mode: 'full_payment',
        },
      ],
    },
  }

  const res = await fetch(`${API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`YuKassa createPayment failed (${res.status}): ${errorText}`)
  }

  return (await res.json()) as YukassaPayment
}

export async function getPayment(paymentId: string): Promise<YukassaPayment> {
  const res = await fetch(`${API_URL}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  })
  if (!res.ok) throw new Error(`YuKassa getPayment failed (${res.status})`)
  return (await res.json()) as YukassaPayment
}
