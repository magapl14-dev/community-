import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { apiFetch } from '@/lib/api'
import { colors, spacing } from '@/theme'

interface Article {
  id: string
  title: string
  slug: string
  excerpt: string | null
  publishedAt: string | null
  categoryId: string
}

interface Category {
  id: string
  title: string
  _count: { articles: number }
}

interface File {
  id: string
  filename: string
}

export default function Library() {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const categories = useQuery({
    queryKey: ['library', 'categories'],
    queryFn: () => apiFetch<Category[]>('/library/categories'),
    staleTime: 60 * 60 * 1000,
  })

  const articles = useQuery({
    queryKey: ['library', 'articles', debounced, categoryId],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' })
      if (debounced) params.set('search', debounced)
      if (categoryId) params.set('category', categoryId)
      return apiFetch<{ items: Article[] }>(`/library/articles?${params.toString()}`)
    },
  })

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.sm,
        }}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по статьям…"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 10,
            fontSize: 15,
            color: colors.text,
          }}
        />

        {categories.data && categories.data.length > 0 && (
          <FlatList
            horizontal
            data={[{ id: 'all', title: 'Все', _count: { articles: 0 } } as Category].concat(
              categories.data,
            )}
            keyExtractor={(c) => c.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = item.id === 'all' ? categoryId === null : categoryId === item.id
              return (
                <TouchableOpacity
                  onPress={() => setCategoryId(item.id === 'all' ? null : item.id)}
                  style={{
                    backgroundColor: active ? colors.brand : colors.background,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 16,
                  }}
                >
                  <Text style={{ color: active ? '#fff' : colors.text, fontSize: 13 }}>
                    {item.title}
                  </Text>
                </TouchableOpacity>
              )
            }}
          />
        )}
      </View>

      {articles.isLoading && (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      )}

      <FlatList
        data={articles.data?.items ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          !articles.isLoading ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>
              Ничего не найдено
            </Text>
          ) : null
        }
        renderItem={({ item }) => <ArticleCard article={item} />}
      />
    </View>
  )
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        padding: spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{article.title}</Text>
      {article.excerpt && (
        <Text
          style={{ color: colors.textMuted, fontSize: 14, marginTop: 6 }}
          numberOfLines={2}
        >
          {article.excerpt}
        </Text>
      )}
      <TouchableOpacity
        onPress={async () => {
          const article_ = await apiFetch<{ files: File[] }>(
            `/library/articles/${article.slug}`,
          ).catch(() => null)
          if (article_ && article_.files.length > 0) {
            const first = article_.files[0]
            if (first) {
              const presigned = await apiFetch<{ url: string }>(`/library/files/${first.id}`)
              Linking.openURL(presigned.url)
            }
          }
        }}
        style={{ marginTop: 10 }}
      >
        <Text style={{ color: colors.brand, fontSize: 13 }}>Открыть →</Text>
      </TouchableOpacity>
    </View>
  )
}
