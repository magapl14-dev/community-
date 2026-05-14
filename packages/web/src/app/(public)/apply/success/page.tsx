import Link from 'next/link'

export default function ApplySuccess() {
  return (
    <main className="mx-auto max-w-xl px-6 py-20 text-center">
      <div className="text-5xl">✅</div>
      <h1 className="mt-4 text-3xl font-bold">Заявка отправлена</h1>
      <p className="mt-3 text-slate-600">
        Координатор клуба свяжется с вами в течение 2 рабочих дней. После одобрения вы получите
        письмо со ссылкой для активации аккаунта.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-lg border px-6 py-3 hover:bg-slate-50"
      >
        На главную
      </Link>
    </main>
  )
}
