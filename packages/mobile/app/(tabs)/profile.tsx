import { useRouter } from 'expo-router'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useMe } from '@/hooks/useMe'
import { useAuthStore } from '@/stores/auth'
import { colors, spacing } from '@/theme'

export default function Profile() {
  const router = useRouter()
  const { data: me, isLoading } = useMe()
  const clearTokens = useAuthStore((s) => s.clearTokens)

  const onLogout = async () => {
    await clearTokens()
    router.replace('/(auth)/onboarding' as never)
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  if (!me) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.danger }}>Не удалось загрузить профиль</Text>
      </View>
    )
  }

  const active = me.memberships.find(
    (m) => m.status === 'active' && new Date(m.expiresAt).getTime() > Date.now(),
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.surface,
          padding: spacing.xl,
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 28 }}>
            {me.user.name
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase()}
          </Text>
        </View>
        <Text style={{ marginTop: spacing.md, fontSize: 20, fontWeight: '700', color: colors.text }}>
          {me.user.name}
        </Text>
        {me.user.email && (
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>{me.user.email}</Text>
        )}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Section title="Членство">
          {active ? (
            <View>
              <Text style={{ color: colors.success, fontWeight: '600', fontSize: 16 }}>
                ✓ Активно
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                до {new Date(active.expiresAt).toLocaleDateString('ru-RU')}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 2 }}>
                тариф: {active.plan}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Не активно</Text>
              <TouchableOpacity
                style={{
                  marginTop: spacing.md,
                  backgroundColor: colors.brand,
                  padding: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                  Продлить
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Section>

        <Section title="Профиль">
          <TouchableOpacity>
            <Text style={{ color: colors.brand, fontSize: 16 }}>Редактировать профиль →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: spacing.sm }}>
            <Text style={{ color: colors.brand, fontSize: 16 }}>Настройки уведомлений →</Text>
          </TouchableOpacity>
        </Section>

        <TouchableOpacity
          onPress={onLogout}
          style={{
            marginTop: spacing.lg,
            padding: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.danger,
          }}
        >
          <Text style={{ color: colors.danger, textAlign: 'center', fontWeight: '600' }}>
            Выйти
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          color: colors.textMuted,
          marginBottom: spacing.sm,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  )
}
