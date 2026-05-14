import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { apiFetch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { colors, spacing } from '@/theme'

interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface ApiError extends Error {
  status?: number
  code?: string
}

const WEB_BASE = 'https://quantum-dag.ru'

function errorToMessage(err: ApiError): string {
  if (err.status === 429) return err.message || 'Слишком много попыток. Попробуйте позже.'
  if (err.code === 'invalid_credentials') return 'Неверный email или пароль'
  if (err.code === 'account_disabled') return 'Аккаунт отключён. Свяжитесь с КМ.'
  if (err.code === 'validation_error') return 'Проверьте корректность email и пароля'
  return 'Не удалось войти. Проверьте соединение и попробуйте ещё раз.'
}

export default function Login() {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = email.trim().length > 3 && password.length >= 8 && !loading

  const onSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const pair = await apiFetch<TokenPair>('/auth/login', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), password },
      })
      await setTokens(pair.accessToken, pair.refreshToken)
      router.replace('/(tabs)')
    } catch (e) {
      setError(errorToMessage(e as ApiError))
    } finally {
      setLoading(false)
    }
  }

  const openTelegram = () => {
    // Полноценная мобильная Telegram-авторизация требует server-side state flow
    // (login-session id + /start handler в боте + polling клиента). Пока просто
    // открываем бота — пользователь авторизуется веб-виджетом и приходит сюда с паролем.
    Linking.openURL('https://t.me/quantum_dag_bot')
  }

  const openForgotPassword = () => {
    Linking.openURL(`${WEB_BASE}/auth/forgot-password`)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: spacing.xl }}>
          Вход
        </Text>

        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!loading}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: spacing.lg,
            fontSize: 16,
            color: colors.text,
            marginBottom: spacing.lg,
          }}
        />

        <Text style={{ color: colors.textMuted, marginBottom: spacing.xs }}>Пароль</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          editable={!loading}
          placeholder="Не менее 8 символов"
          placeholderTextColor={colors.textMuted}
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: spacing.lg,
            fontSize: 16,
            color: colors.text,
            marginBottom: spacing.sm,
          }}
        />

        <TouchableOpacity onPress={openForgotPassword} disabled={loading}>
          <Text style={{ color: colors.brand, textAlign: 'right', marginBottom: spacing.lg }}>
            Забыли пароль?
          </Text>
        </TouchableOpacity>

        {error && (
          <Text style={{ color: colors.danger, marginBottom: spacing.lg }}>{error}</Text>
        )}

        <TouchableOpacity
          onPress={onSubmit}
          disabled={!canSubmit}
          style={{
            backgroundColor: canSubmit ? colors.brand : colors.textMuted,
            padding: spacing.lg,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>Войти</Text>
          )}
        </TouchableOpacity>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginVertical: spacing.xl,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          <Text style={{ marginHorizontal: spacing.md, color: colors.textMuted }}>или</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        </View>

        <TouchableOpacity
          onPress={openTelegram}
          disabled={loading}
          style={{
            backgroundColor: '#0088cc',
            padding: spacing.lg,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            Войти через Telegram
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
