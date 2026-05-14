import NewsEditor from './NewsEditor'

export const dynamic = 'force-dynamic'

export default function AdminNewsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Опубликовать новость</h2>
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
        <NewsEditor />
      </div>
      <p className="text-sm text-slate-400">
        Тип <strong>announcement</strong> с заполненной датой публикации автоматически
        отправляет push-уведомление всем активным членам.
      </p>
    </div>
  )
}
