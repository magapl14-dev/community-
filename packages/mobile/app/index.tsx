import AsyncStorage from '@react-native-async-storage/async-storage'
import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useAuthStore } from '@/stores/auth'
import { colors } from '@/theme'

export const ONBOARDING_SEEN_KEY = 'qd_onboarding_seen'

export default function Index() {
  const token = useAuthStore((s) => s.accessToken)
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_SEEN_KEY)
      .then((v) => setOnboardingSeen(v === '1'))
      .catch(() => setOnboardingSeen(false))
  }, [])

  if (onboardingSeen === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    )
  }

  if (token) return <Redirect href="/(tabs)" />
  return <Redirect href={onboardingSeen ? '/(auth)/login' : '/(auth)/onboarding'} />
}
