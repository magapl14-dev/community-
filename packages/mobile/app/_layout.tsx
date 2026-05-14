import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useAuthStore } from '@/stores/auth'
import { registerPushToken } from '@/lib/push'

export default function RootLayout() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
        },
      }),
  )

  const hydrate = useAuthStore((s) => s.hydrate)
  const accessToken = useAuthStore((s) => s.accessToken)

  // Гидрация токенов из SecureStore при старте
  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Регистрация push-токена при появлении access-токена
  useEffect(() => {
    if (accessToken) {
      registerPushToken().catch((err) => console.warn('[push] register error', err))
    }
  }, [accessToken])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
