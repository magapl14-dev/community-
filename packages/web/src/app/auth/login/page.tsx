import Link from 'next/link'
import LoginForm from './LoginForm'
import TelegramLoginButton from './TelegramLoginButton'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { forgot?: string; reset?: string }
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Вход</h1>

      {searchParams.forgot === 'ok' && (
        <Banner variant="info">
          Если email есть в системе — мы отправили ссылку для сброса пароля.
        </Banner>
      )}
      {searchParams.reset === 'ok' && (
        <Banner variant="success">Пароль обновлён. Войдите с новым паролем.</Banner>
      )}

      <div className="mt-6 space-y-4">
        <TelegramLoginButton />
        <div className="flex items-center gap-3 text-slate-400">
          <hr className="flex-1" />
          <span className="text-sm">или</span>
          <hr className="flex-1" />
        </div>
        <LoginForm />
      </div>

      <div className="mt-6 text-sm text-slate-600 flex justify-between">
        <Link href="/auth/forgot-password" className="hover:underline">
          Забыли пароль?
        </Link>
        <Link href="/apply" className="hover:underline">
          Подать заявку
        </Link>
      </div>
    </main>
  )
}

function Banner({
  variant,
  children,
}: {
  variant: 'info' | 'success'
  children: React.ReactNode
}) {
  const cls = variant === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
  return <div className={`mt-4 rounded-lg px-4 py-3 text-sm ${cls}`}>{children}</div>
}
