import type { ExpoConfig } from 'expo/config'
import { PALETTE_TOKENS } from './src/theme/palettes.gen.ts'

// The brand palette (Ember & Gold) supplies the splash background, so the
// native splash matches the first screen. Colours are never hard-coded here.
const ember = PALETTE_TOKENS.find((p) => p.id === 'ember')!

// iOS Google sign-in needs the reversed iOS OAuth client id as a URL scheme.
// Without an iOS client id the plugin is left out (Android does not need it).
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''
const iosUrlScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.replace('.apps.googleusercontent.com', '')}`
  : ''

const config: ExpoConfig = {
  name: 'ছায়া বাড়ি',
  slug: 'chaya-bari',
  version: '0.1.0',
  platforms: ['ios', 'android'],
  orientation: 'portrait',
  // Deep links: chayabari://track/<token> (https App Links / Universal Links come
  // with the live domain, see vault node mobile-app).
  scheme: 'chayabari',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.chayabari.app',
    supportsTablet: true,
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'com.chayabari.app',
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 240,
        backgroundColor: ember.light.canvas,
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: ember.dark.canvas },
      },
    ],
    'expo-secure-store',
    'expo-image',
    ...(iosUrlScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, unknown]]
      : []),
  ],
  experiments: { typedRoutes: true },
  extra: {
    // Filled in by `eas init` (links the project to the owner's Expo account).
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
}

export default config
