import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// Preferences and the cart live in AsyncStorage (plain, like the website's
// localStorage). The sign-in token lives in the OS keychain/keystore.
// Every call swallows storage errors: the app still works, it just forgets.

export const KEYS = {
  lang: 'chaya-lang',
  theme: 'chaya-theme',
  palette: 'chaya-palette',
  paletteRandom: 'chaya-palette-random',
  cart: 'chaya_bari_cart',
  token: 'chaya_bari_token',
} as const

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export async function readToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.token)
  } catch {
    return null
  }
}

export async function writeToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(KEYS.token, token)
    else await SecureStore.deleteItemAsync(KEYS.token)
  } catch {
    /* ignore */
  }
}
