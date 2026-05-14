import { redirect } from 'next/navigation'
import ResetForm from './ResetForm'

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  if (!searchParams.token) redirect('/auth/login')

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Сброс пароля</h1>
      <p className="mt-2 text-slate-600">Установите новый пароль для вашего аккаунта.</p>
      <ResetForm token={searchParams.token} />
    </main>
  )
}
