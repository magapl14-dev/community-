import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAccessToken } from '@/lib/auth-cookies'
import { apiServer } from '@/lib/api-server'
import { logoutAction } from '@/app/auth/actions'

interface Me {
  user: { id: string; name: string; role: 'admin' | 'km' | 'member' }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!getAccessToken()) redirect('/auth/login')

  // Проверка роли: тянем профиль, проверяем доступ
  const me = await apiServer<Me>('/members/me').catch(() => null)
  if (!me || (me.user.role !== 'admin' && me.user.role !== 'km')) {
    redirect('/cabinet')
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="font-bold">Quantum Dagestan · Admin</h1>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/admin" className="hover:text-white">
              Дашборд
            </Link>
            <Link href="/admin/applications" className="hover:text-white">
              Заявки
            </Link>
            <Link href="/admin/members" className="hover:text-white">
              Участники
            </Link>
            <Link href="/admin/events" className="hover:text-white">
              События
            </Link>
            <Link href="/admin/news" className="hover:text-white">
              Новости
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="text-slate-400 hover:text-red-400">
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
