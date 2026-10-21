import { useEffect } from 'react'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '../lib/auth'
import { CartProvider } from '../lib/cart'
import { LanguageProvider, useLang } from '../lib/i18n'
import { ThemeProvider, useTheme } from '../theme/theme'

void SplashScreen.preventAutoHideAsync()

function RootStack() {
  const { colors, scheme } = useTheme()
  const { t } = useLang()
  const { loading } = useAuth()

  // Keep the brand splash up until the stored session has been checked.
  useEffect(() => {
    if (!loading) SplashScreen.hide()
  }, [loading])

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.canvas },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: t('খাবারের বিবরণ', 'Dish details') }} />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <RootStack />
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  )
}
