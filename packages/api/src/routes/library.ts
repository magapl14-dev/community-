import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { paginationSchema } from '@qd/shared'
import { prisma } from '../lib/db.js'
import { presignedDownloadUrl } from '../lib/s3.js'
import { notFound } from '../lib/errors.js'

const articlesQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  search: z.string().max(200).optional(),
})

export async function libraryRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate, app.requireActiveMembership] }

  // GET /library/categories
  app.get('/categories', auth, async () => {
    return prisma.libraryCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { articles: { where: { isPublished: true } } } } },
    })
  })

  // GET /library/articles — c полнотекстовым поиском по ts_vector
  app.get('/articles', auth, async (req) => {
    const { page, limit, category, search } = articlesQuerySchema.parse(req.query)

    if (search && search.trim().length > 0) {
      type ArticleRow = {
        id: string
        category_id: string
        title: string
        slug: string
        excerpt: string | null
        cover_url: string | null
        published_at: Date | null
        rank: number
      }

      const offset = (page - 1) * limit
      const tsquery = Prisma.sql`websearch_to_tsquery('russian', ${search})`
      const categoryClause = category
        ? Prisma.sql`AND category_id = ${category}::uuid`
        : Prisma.empty

      const rows = await prisma.$queryRaw<ArticleRow[]>(Prisma.sql`
        SELECT id, category_id, title, slug, excerpt, cover_url, published_at,
               ts_rank(search_vector, ${tsquery}) AS rank
        FROM library_articles
        WHERE is_published = true
          AND search_vector @@ ${tsquery}
          ${categoryClause}
        ORDER BY rank DESC, published_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset}
      `)
      return { items: rows, page, limit }
    }

    const where = {
      isPublished: true,
      ...(category && { categoryId: category }),
    }
    const [items, total] = await Promise.all([
      prisma.libraryArticle.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          categoryId: true,
          title: true,
          slug: true,
          excerpt: true,
          coverUrl: true,
          publishedAt: true,
        },
      }),
      prisma.libraryArticle.count({ where }),
    ])
    return { items, page, limit, total }
  })

  // GET /library/articles/:id
  app.get<{ Params: { id: string } }>('/articles/:id', auth, async (req) => {
    const article = await prisma.libraryArticle.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }], isPublished: true },
      include: {
        category: { select: { id: true, slug: true, title: true } },
        files: { select: { id: true, filename: true, contentType: true, sizeBytes: true } },
      },
    })
    if (!article) throw notFound()
    return article
  })

  // GET /library/files/:id → presigned URL на 1 час
  app.get<{ Params: { id: string } }>('/files/:id', auth, async (req) => {
    const file = await prisma.libraryFile.findUnique({ where: { id: req.params.id } })
    if (!file) throw notFound()

    const url = await presignedDownloadUrl(file.s3Key, 3600)
    return { url, filename: file.filename, contentType: file.contentType }
  })
}
