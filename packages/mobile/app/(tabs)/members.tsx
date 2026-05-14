import { useInfiniteQuery } from '@tanstack/react-query'
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
import { useMe, hasActiveMembership } from '@/hooks/useMe'
import { colors, spacing } from '@/theme'

interface Member {
  id: string
  position: string | null
  company: string | null
  industry: string | null
  bio: string | null
  telegramUsername: string | null
  phone: string | null
  user: { id: string; name: string; avatarUrl: string | null }
}

interface ListResp {
  items: Member[]
  page: number
  limit: number
  total: number
}

export default function Members() {
  const me = useMe()
  const canSeeContacts = hasActiveMembership(me.data)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const query = useInfiniteQuery({
    queryKey: ['members', debouncedSearch],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '24' })
      if (debouncedSearch) params.set('search', debouncedSearch)
      return apiFetch<ListResp>(`/members?${params.toString()}`)
    },
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.limit < last.total ? last.page + 1 : undefined,
    staleTime: 15 * 60 * 1000,
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по имени, компании, био…"
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
      </View>

      {query.isLoading && (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} />
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        onEndReached={() => query.hasNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
          ) : null
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>
              Ничего не найдено
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <MemberCard member={item} canSeeContacts={canSeeContacts} />
        )}
      />
    </View>
  )
}

function MemberCard({
  member,
  canSeeContacts,
}: {
  member: Member
  canSeeContacts: boolean
}) {
  const initials = member.user.name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', fontSize: 16, color: colors.text }}>
            {member.user.name}
          </Text>
          {(member.position || member.company) && (
            <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
              {[member.position, member.company].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
      </View>

      {member.industry && (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: colors.background,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            marginTop: spacing.sm,
          }}
        >
          <Text style={{ fontSize: 12, color: colors.textMuted }}>{member.industry}</Text>
        </View>
      )}

      {member.bio && (
        <Text
          style={{ marginTop: spacing.sm, color: colors.textMuted, fontSize: 14 }}
          numberOfLines={3}
        >
          {member.bio}
        </Text>
      )}

      <View
        style={{
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {canSeeContacts ? (
          <View style={{ gap: 6 }}>
            {member.telegramUsername && (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(`https://t.me/${member.telegramUsername}`)
                }
              >
                <Text style={{ color: colors.brand }}>@{member.telegramUsername}</Text>
              </TouchableOpacity>
            )}
            {member.phone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${member.phone}`)}>
                <Text style={{ color: colors.text }}>{member.phone}</Text>
              </TouchableOpacity>
            )}
            {!member.telegramUsername && !member.phone && (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                контакты не указаны
              </Text>
            )}
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            🔒 Контакты доступны при активном членстве
          </Text>
        )}
      </View>
    </View>
  )
}
