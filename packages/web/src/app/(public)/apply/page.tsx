import ApplyForm from './ApplyForm'

export default function ApplyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold">Заявка на вступление</h1>
      <p className="mt-2 text-slate-600">
        Заполните форму — координатор клуба свяжется с вами в течение 2 дней.
      </p>
      <ApplyForm />
    </main>
  )
}
