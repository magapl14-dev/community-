import Link from 'next/link'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import FileLink from './FileLink'

interface Article {
  id: string
  title: string
  body: string // Markdown — отрисовываем как pre-wrap пока без MD-парсера
  coverUrl: string | null
  publishedAt: string | null
  category: { id: string; slug: string; title: string }
  files: Array<{ id: string; filename: string; contentType: string; sizeBytes: number }>
}

export const dynamic = 'force-dynamic'

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const article = await apiServer<Article>(`/library/articles/${params.slug}`).catch(() => null)
  if (!article) notFound()

  return (
    <article className="max-w-3xl space-y-6">
      <div className="text-sm text-slate-500">
        <Link href="/cabinet/library" className="hover:underline">
          ← Все статьи
        </Link>
        {' · '}
        <Link
          href={`/cabinet/library?category=${article.category.id}`}
          className="hover:underline"
        >
          {article.category.title}
        </Link>
      </div>

      {article.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={article.coverUrl} alt="" className="rounded-xl w-full max-h-96 object-cover" />
      )}

      <h1 className="text-3xl font-bold">{article.title}</h1>

      <div className="prose prose-slate max-w-none whitespace-pre-wrap">{article.body}</div>

      {article.files.length > 0 && (
        <section className="border-t pt-6">
          <h2 className="font-semibold mb-3">Файлы</h2>
          <ul className="space-y-2">
            {article.files.map((f) => (
              <li key={f.id}>
                <FileLink fileId={f.id} filename={f.filename} sizeBytes={f.sizeBytes} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
