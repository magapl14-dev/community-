import { redirect } from 'next/navigation'
import ActivateForm from './ActivateForm'

export default function ActivatePage({ searchParams }: { searchParams: { token?: string } }) {
  if (!searchParams.token) redirect('/auth/login')

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Активация аккаунта</h1>
      <p className="mt-2 text-slate-600">Установите пароль для входа в кабинет.</p>
      <ActivateForm token={searchParams.token} />
    </main>
  )
}
