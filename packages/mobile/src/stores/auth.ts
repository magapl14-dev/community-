import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  setTokens: (access: string, refresh: string) => Promise<void>
  clearTokens: () => Promise<void>
  hydrate: () => Promise<void>
}

const ACCESS_KEY = 'qd_access_token'
const REFRESH_KEY = 'qd_refresh_token'

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access)
    await SecureStore.setItemAsync(REFRESH_KEY, refresh)
    set({ accessToken: access, refreshToken: refresh })
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
    set({ accessToken: null, refreshToken: null })
  },

  hydrate: async () => {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ])
    set({ accessToken: access, refreshToken: refresh })
  },
}))
