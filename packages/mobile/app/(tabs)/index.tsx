import { useQuery } from '@tanstack/react-query'
import { useNetInfo } from '@react-native-community/netinfo'
import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { colors, spacing } from '@/theme'

interface NewsItem {
  id: string
  title: string
  type: 'news' | 'announcement' | 'pinned'
  isPinned: boolean
  publishedAt: string | null
  author: { name: string }
}

interface EventItem {
  id: string
  title: string
  startAt: string
  location: string | null
}

export default function Home() {
  const router = useRouter()
  const { isConnected } = useNetInfo()
  const [refreshing, setRefreshing] = useState(false)

  const newsQuery = useQuery({
    queryKey: ['news', 'feed'],
    queryFn: () => apiFetch<{ items: NewsItem[] }>('/news?limit=20'),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })

  const eventsQuery = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => apiFetch<{ items: EventItem[] }>('/events?limit=5'),
    staleTime: 10 * 60 * 1000,
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([newsQuery.refetch(), eventsQuery.refetch()])
    setRefreshing(false)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isConnected === false && newsQuery.data && (
        <View
          style={{
            backgroundColor: colors.warning + '20',
            padding: spacing.sm,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 12 }}>
            Нет связи — показаны кэшированные данные
          </Text>
        </View>
      )}

      {newsQuery.isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.brand} />
        </View>
      )}

      {newsQuery.error && !newsQuery.data && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: colors.danger }}>Не удалось загрузить ленту</Text>
          <TouchableOpacity onPress={() => newsQuery.refetch()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.brand }}>Повторить</Text>
          </TouchableOpacity>
        </View>
      )}

      {newsQuery.data && (
        <FlatList
          data={newsQuery.data.items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brand}
            />
          }
          ListHeaderComponent={() =>
            (eventsQuery.data?.items.length ?? 0) > 0 ? (
              <View style={{ marginBottom: spacing.md }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    marginBottom: spacing.sm,
                    fontWeight: '600',
                  }}
                >
                  Ближайшие события
                </Text>
                {eventsQuery.data!.items.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    onPress={() => router.push(`/events/${e.id}` as never)}
                    style={{
                      backgroundColor: colors.brand,
                      padding: spacing.md,
                      borderRadius: 12,
                      marginBottom: spacing.sm,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{e.title}</Text>
                    <Text style={{ color: '#fff', opacity: 0.8, fontSize: 12, marginTop: 2 }}>
                      {new Date(e.startAt).toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {e.location && ` · ${e.location}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => <NewsCard item={item} />}
          ListEmptyComponent={() => (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>
              Пока ничего нет
            </Text>
          )}
        />
      )}
    </View>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
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
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
        {item.isPinned && <Text style={{ fontSize: 12 }}>📌</Text>}
        {item.type === 'announcement' && (
          <View
            style={{
              backgroundColor: colors.warning + '20',
              paddingHorizontal: 8,
              borderRadius: 4,
            }}
          >
            <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '600' }}>
              ОБЪЯВЛЕНИЕ
            </Text>
          </View>
        )}
        {item.publishedAt && (
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {new Date(item.publishedAt).toLocaleDateString('ru-RU')}
          </Text>
        )}
      </View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{item.title}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: 13 }}>
        {item.author.name}
      </Text>
    </View>
  )
}
