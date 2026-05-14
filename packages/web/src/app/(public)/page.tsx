import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="text-5xl font-bold text-brand">Quantum Dagestan</h1>
      <p className="mt-4 text-xl text-slate-600">
        Бизнес-сообщество предпринимателей Дагестана. Знакомства, мероприятия, обмен опытом.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/apply"
          className="rounded-xl bg-brand px-6 py-3 text-white hover:bg-brand-dark transition"
        >
          Подать заявку
        </Link>
        <Link
          href="/auth/login"
          className="rounded-xl border border-slate-300 px-6 py-3 hover:bg-slate-50 transition"
        >
          Войти
        </Link>
      </div>

      <section className="mt-20 grid gap-8 md:grid-cols-3">
        <Feature title="Каталог участников" desc="Найди подходящих партнёров и экспертов" />
        <Feature title="Мероприятия" desc="Регистрация, напоминания, материалы" />
        <Feature title="База знаний" desc="Кейсы, гайды, видео" />
      </section>
    </main>
  )
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-slate-600">{desc}</p>
    </div>
  )
}
