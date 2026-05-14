import Link from 'next/link'
import type { Route } from 'next'
import { apiServer } from '@/lib/api-server'
import LibrarySearch from './LibrarySearch'

interface Category {
  id: string
  slug: string
  title: string
  _count: { articles: number }
}

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  coverUrl: string | null
  publishedAt: string | null
  categoryId: string
}

export const dynamic = 'force-dynamic'

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string }
}) {
  const params = new URLSearchParams()
  if (searchParams.search) params.set('search', searchParams.search)
  if (searchParams.category) params.set('category', searchParams.category)
  params.set('limit', '24')

  const [categories, articles] = await Promise.all([
    apiServer<Category[]>('/library/categories').catch(() => []),
    apiServer<{ items: Article[] }>(`/library/articles?${params.toString()}`).catch(() => ({
      items: [],
    })),
  ])

  return (
    <div className="grid gap-8 lg:grid-cols-4">
      <aside className="lg:col-span-1 space-y-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-500 mb-3">
          Категории
        </h3>
        <CategoryLink slug={null} title="Все" current={!searchParams.category} count={null} />
        {categories.map((c) => (
          <CategoryLink
            key={c.id}
            slug={c.id}
            title={c.title}
            current={searchParams.category === c.id}
            count={c._count.articles}
          />
        ))}
      </aside>

      <section className="lg:col-span-3 space-y-5">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold">База знаний</h2>
          <LibrarySearch defaultValue={searchParams.search ?? ''} />
        </div>

        {articles.items.length === 0 ? (
          <p className="text-slate-500">Ничего не найдено</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {articles.items.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/cabinet/library/${a.slug}`}
                  className="block rounded-xl border bg-white overflow-hidden hover:shadow-md transition h-full"
                >
                  {a.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.coverUrl} alt="" className="h-32 w-full object-cover" />
                  )}
                  <div className="p-5">
                    <h3 className="font-semibold">{a.title}</h3>
                    {a.excerpt && (
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{a.excerpt}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function CategoryLink({
  slug,
  title,
  current,
  count,
}: {
  slug: string | null
  title: string
  current: boolean
  count: number | null
}) {
  const href = slug ? `/cabinet/library?category=${slug}` : '/cabinet/library'
  return (
    <Link
      href={href as Route}
      className={
        'block rounded-lg px-3 py-2 text-sm ' +
        (current ? 'bg-brand text-white' : 'text-slate-700 hover:bg-slate-100')
      }
    >
      <span>{title}</span>
      {count !== null && (
        <span className={'ml-2 text-xs ' + (current ? 'text-white/70' : 'text-slate-400')}>
          {count}
        </span>
      )}
    </Link>
  )
}
