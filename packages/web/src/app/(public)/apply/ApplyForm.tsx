'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { applicationSchema, type ApplicationInput } from '@qd/shared'
import { submitApplicationAction } from './actions'

const STEP_FIELDS: Array<Array<keyof ApplicationInput>> = [
  ['name', 'phone', 'email', 'telegram'],
  ['position', 'industry', 'revenueRange'],
  ['motivation'],
  ['captchaToken', 'consent'],
]

const SMARTCAPTCHA_KEY = process.env.NEXT_PUBLIC_SMARTCAPTCHA_KEY

export default function ApplyForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      telegram: '',
      position: '',
      industry: '',
      revenueRange: '',
      motivation: '',
      captchaToken: SMARTCAPTCHA_KEY ? '' : 'dev-skip',
      consent: false as unknown as true,
    },
  })

  const onNext = async () => {
    const fields = STEP_FIELDS[step]!
    const ok = await form.trigger(fields)
    if (ok) setStep((s) => Math.min(s + 1, STEP_FIELDS.length - 1))
  }

  const onSubmit = async (data: ApplicationInput) => {
    setSubmitting(true)
    setServerError(null)
    const result = await submitApplicationAction(data)
    setSubmitting(false)
    if (result.ok) router.push('/apply/success')
    else setServerError(result.message)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
      <Stepper current={step} total={STEP_FIELDS.length} />

      {step === 0 && (
        <Section title="Контакты">
          <Field label="Имя" error={form.formState.errors.name?.message}>
            <input className={inputCls} {...form.register('name')} />
          </Field>
          <Field label="Телефон" error={form.formState.errors.phone?.message}>
            <input className={inputCls} type="tel" placeholder="+7…" {...form.register('phone')} />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <input className={inputCls} type="email" {...form.register('email')} />
          </Field>
          <Field label="Telegram (без @)" error={form.formState.errors.telegram?.message}>
            <input className={inputCls} {...form.register('telegram')} />
          </Field>
        </Section>
      )}

      {step === 1 && (
        <Section title="О бизнесе">
          <Field label="Должность" error={form.formState.errors.position?.message}>
            <input className={inputCls} {...form.register('position')} />
          </Field>
          <Field label="Индустрия" error={form.formState.errors.industry?.message}>
            <input className={inputCls} {...form.register('industry')} />
          </Field>
          <Field label="Выручка в год" error={form.formState.errors.revenueRange?.message}>
            <select className={inputCls} {...form.register('revenueRange')}>
              <option value="">Не указывать</option>
              <option>до 10 млн</option>
              <option>10–50 млн</option>
              <option>50–100 млн</option>
              <option>100–500 млн</option>
              <option>от 500 млн</option>
            </select>
          </Field>
        </Section>
      )}

      {step === 2 && (
        <Section title="Что ждёте от клуба">
          <Field label="Расскажите коротко" error={form.formState.errors.motivation?.message}>
            <textarea
              className={inputCls + ' min-h-32'}
              maxLength={1000}
              {...form.register('motivation')}
            />
          </Field>
        </Section>
      )}

      {step === 3 && (
        <Section title="Подтверждение">
          {SMARTCAPTCHA_KEY ? (
            <SmartCaptcha
              sitekey={SMARTCAPTCHA_KEY}
              onSuccess={(token) => form.setValue('captchaToken', token, { shouldValidate: true })}
            />
          ) : (
            <p className="text-sm text-slate-500">
              SmartCaptcha не настроена (NEXT_PUBLIC_SMARTCAPTCHA_KEY) — пропускается в dev
            </p>
          )}
          {form.formState.errors.captchaToken && (
            <p className="text-sm text-red-600">Пройдите проверку</p>
          )}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" className="mt-1" {...form.register('consent')} />
            <span className="text-sm text-slate-600">
              Согласен на обработку персональных данных в соответствии с{' '}
              <a className="underline" href="/privacy" target="_blank">
                политикой конфиденциальности
              </a>
            </span>
          </label>
          {form.formState.errors.consent && (
            <p className="text-sm text-red-600">Требуется согласие</p>
          )}
        </Section>
      )}

      {serverError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700 text-sm">{serverError}</div>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0}
          className="px-5 py-2 rounded-lg border disabled:opacity-30"
        >
          Назад
        </button>
        {step < STEP_FIELDS.length - 1 ? (
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark"
          >
            Далее
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {submitting ? 'Отправка…' : 'Отправить заявку'}
          </button>
        )}
      </div>
    </form>
  )
}

const inputCls = 'w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-brand focus:outline-none'

function Stepper({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-brand' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">{title}</h2>
      {children}
    </div>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </label>
  )
}

// ─── SmartCaptcha ленивая загрузка скрипта Яндекса ───
function SmartCaptcha({ sitekey, onSuccess }: { sitekey: string; onSuccess: (token: string) => void }) {
  if (typeof window !== 'undefined') {
    // Один раз грузим скрипт
    if (!document.getElementById('yandex-smartcaptcha')) {
      const s = document.createElement('script')
      s.id = 'yandex-smartcaptcha'
      s.src = 'https://smartcaptcha.yandexcloud.net/captcha.js'
      s.defer = true
      document.head.appendChild(s)
    }
    const win = window as unknown as {
      smartCaptchaOnSuccess?: (t: string) => void
    }
    win.smartCaptchaOnSuccess = onSuccess
  }

  return (
    <div
      className="smart-captcha"
      data-sitekey={sitekey}
      data-callback="smartCaptchaOnSuccess"
      data-language="ru"
    />
  )
}
