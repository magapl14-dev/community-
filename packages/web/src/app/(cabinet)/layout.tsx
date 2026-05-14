import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessToken } from '@/lib/auth-cookies'
import { logoutAction } from '@/app/auth/actions'

export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  if (!getAccessToken()) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold text-brand">Quantum Dagestan · Кабинет</h1>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/cabinet" className="hover:text-brand">
              Главная
            </Link>
            <Link href="/cabinet/members" className="hover:text-brand">
              Участники
            </Link>
            <Link href="/cabinet/events" className="hover:text-brand">
              События
            </Link>
            <Link href="/cabinet/library" className="hover:text-brand">
              База знаний
            </Link>
            <Link href="/cabinet/profile" className="hover:text-brand">
              Профиль
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-slate-500 hover:text-red-600">
                Выйти
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
