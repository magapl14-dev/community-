import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useState } from 'react'
import { apiFetch } from '@/lib/api'
import { colors, spacing } from '@/theme'

interface EventItem {
  id: string
  title: string
  format: 'offline' | 'online' | 'hybrid'
  startAt: string
  location: string | null
  capacity: number | null
  status: string
  isRegistered?: boolean
}

export default function Events() {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const query = useQuery({
    queryKey: ['events', 'list'],
    queryFn: () => apiFetch<{ items: EventItem[] }>('/events?limit=50'),
    staleTime: 10 * 60 * 1000,
  })

  const register = useMutation({
    mutationFn: ({ eventId, register }: { eventId: string; register: boolean }) =>
      register
        ? apiFetch(`/events/${eventId}/register`, { method: 'POST' })
        : apiFetch(`/events/${eventId}/register`, { method: 'DELETE' }),
    // Optimistic UI: переключаем флаг сразу
    onMutate: async ({ eventId, register }) => {
      await queryClient.cancelQueries({ queryKey: ['events', 'list'] })
      const prev = queryClient.getQueryData<{ items: EventItem[] }>(['events', 'list'])
      queryClient.setQueryData<{ items: EventItem[] }>(['events', 'list'], (data) =>
        data
          ? {
              ...data,
              items: data.items.map((e) =>
                e.id === eventId ? { ...e, isRegistered: register } : e,
              ),
            }
          : data,
      )
      return { prev }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['events', 'list'], ctx.prev)
      const e = err as { code?: string }
      Alert.alert(
        'Ошибка',
        e.code === 'no_capacity'
          ? 'Мест уже не осталось'
          : e.code === 'membership_expired'
            ? 'Членство истекло'
            : 'Не удалось выполнить действие',
      )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const onRefresh = async () => {
    setRefreshing(true)
    await query.refetch()
    setRefreshing(false)
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      data={query.data?.items ?? []}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', color: colors.textMuted, marginTop: 40 }}>
          Запланированных событий нет
        </Text>
      }
      renderItem={({ item }) => (
        <EventCard
          event={item}
          onToggle={(register) => register.mutate({ eventId: item.id, register: !item.isRegistered })}
          mutation={register}
        />
      )}
    />
  )
}

function EventCard({
  event,
  onToggle,
  mutation,
}: {
  event: EventItem
  onToggle: (mutation: ReturnType<typeof useMutation<unknown, unknown, { eventId: string; register: boolean }>>) => void
  mutation: ReturnType<typeof useMutation<unknown, unknown, { eventId: string; register: boolean }>>
}) {
  const isPast = new Date(event.startAt).getTime() < Date.now()
  const isRegistered = event.isRegistered ?? false
  const formatLabel = { offline: 'Офлайн', online: 'Онлайн', hybrid: 'Гибрид' }[event.format]

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
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 12,
          textTransform: 'uppercase',
          fontWeight: '600',
        }}
      >
        {formatLabel} ·{' '}
        {new Date(event.startAt).toLocaleString('ru-RU', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 }}>
        {event.title}
      </Text>
      {event.location && (
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>📍 {event.location}</Text>
      )}

      <View style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center' }}>
        {isPast ? (
          <Text style={{ color: colors.textMuted }}>Прошло</Text>
        ) : (
          <TouchableOpacity
            onPress={() => onToggle(mutation)}
            disabled={mutation.isPending}
            style={{
              backgroundColor: isRegistered ? colors.background : colors.brand,
              borderWidth: isRegistered ? 1 : 0,
              borderColor: colors.border,
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: isRegistered ? colors.text : '#fff',
                fontWeight: '600',
              }}
            >
              {isRegistered ? 'Я иду · отменить' : 'Записаться'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
