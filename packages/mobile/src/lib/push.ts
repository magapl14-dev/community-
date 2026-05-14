import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { apiFetch } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

let registered = false

/**
 * Регистрирует устройство в push-сервисе.
 * Вызывается после успешной авторизации.
 */
export async function registerPushToken(): Promise<void> {
  if (registered) return
  if (!Device.isDevice) {
    console.info('[push] simulator/emulator — пропуск регистрации')
    return
  }

  // 1. Запросить разрешение
  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    console.info('[push] permission denied')
    return
  }

  // 2. Android: канал
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Quantum Dagestan',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B3A6B',
    })
  }

  // 3. Получить Expo Push Token
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig as { projectId?: string } | undefined)?.projectId
  let tokenData
  try {
    tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )
  } catch (err) {
    console.warn('[push] getExpoPushTokenAsync failed', err)
    return
  }

  // 4. Отправить на бэк
  try {
    await apiFetch('/members/me/push-token', {
      method: 'POST',
      body: {
        token: tokenData.data,
        platform: Platform.OS as 'ios' | 'android',
        appVersion: Constants.expoConfig?.version,
      },
    })
    registered = true
  } catch (err) {
    console.error('[push] register failed', err)
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!registered) return
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null)
    if (tokenData) {
      await apiFetch('/members/me/push-token', {
        method: 'DELETE',
        body: { token: tokenData.data },
      })
    }
  } catch (err) {
    console.warn('[push] unregister failed', err)
  } finally {
    registered = false
  }
}
