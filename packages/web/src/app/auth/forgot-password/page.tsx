import Link from 'next/link'
import ForgotForm from './ForgotForm'

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold">Восстановление пароля</h1>
      <p className="mt-2 text-slate-600">Введите email — отправим ссылку для сброса.</p>
      <ForgotForm />
      <Link href="/auth/login" className="mt-6 inline-block text-sm hover:underline text-slate-600">
        ← Назад ко входу
      </Link>
    </main>
  )
}
