import { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import * as Linking from 'expo-linking'
import { Button, Chip, GlassCard, Screen, T } from '../../components/ui'
import { WEB_URL } from '../../lib/api'
import { isGoogleEnabled, useAuth } from '../../lib/auth'
import { useLang } from '../../lib/i18n'
import { PALETTE_TOKENS } from '../../theme/palettes.gen'
import { useTheme, type ThemeMode } from '../../theme/theme'

/** Sign-in (Google only) and appearance: language, theme, palette. */
export default function AccountScreen() {
  const { t, lang, setLang } = useLang()
  const { mode, setMode, palettePref, setPalette } = useTheme()
  const { user, signInWithGoogle, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const signIn = async () => {
    setBusy(true)
    setMessage(null)
    const res = await signInWithGoogle()
    setBusy(false)
    if (!res.ok && res.reason === 'unavailable') {
      setMessage(t('এই ফোনে Google সাইন-ইন চালু করা যায়নি।', 'Google sign-in is not available on this phone.'))
    } else if (!res.ok && res.reason === 'error') {
      setMessage(t('সাইন-ইন হয়নি। আবার চেষ্টা করুন।', 'Sign-in failed. Please try again.'))
    }
  }

  const modes: { id: ThemeMode; bn: string; en: string }[] = [
    { id: 'system', bn: 'সিস্টেম', en: 'System' },
    { id: 'light', bn: 'লাইট', en: 'Light' },
    { id: 'dark', bn: 'ডার্ক', en: 'Dark' },
  ]

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard style={styles.card}>
          {user ? (
            <>
              <T variant="title">{user.name}</T>
              <T variant="muted">{user.email}</T>
              {user.role !== 'CUSTOMER' ? (
                <>
                  <T variant="muted">
                    {t(
                      'অ্যাডমিন ও কিচেনের কাজ ওয়েবসাইটে করুন।',
                      'Admin and kitchen work is done on the website.',
                    )}
                  </T>
                  <Button kind="ghost" label={t('ওয়েবসাইট খুলুন', 'Open the website')} onPress={() => void Linking.openURL(WEB_URL)} />
                </>
              ) : null}
              <Button kind="ghost" label={t('সাইন আউট', 'Sign out')} onPress={() => void logout()} />
            </>
          ) : (
            <>
              <T variant="title">{t('সাইন ইন', 'Sign in')}</T>
              {isGoogleEnabled ? (
                <Button label={t('Google দিয়ে চালিয়ে যান', 'Continue with Google')} busy={busy} onPress={() => void signIn()} />
              ) : (
                <T variant="muted">
                  {t(
                    'এই বিল্ডে Google সাইন-ইন সেট করা নেই। অতিথি হিসেবে মেনু দেখা ও কার্ট চলবে।',
                    'Google sign-in is not set up in this build. You can still browse and fill the cart as a guest.',
                  )}
                </T>
              )}
              {message ? <T variant="muted">{message}</T> : null}
            </>
          )}
        </GlassCard>

        <GlassCard style={styles.card}>
          <T variant="title">{t('ভাষা', 'Language')}</T>
          <View style={styles.row}>
            <Chip label="বাংলা" active={lang === 'bn'} onPress={() => setLang('bn')} />
            <Chip label="English" active={lang === 'en'} onPress={() => setLang('en')} />
          </View>
        </GlassCard>

        <GlassCard style={styles.card}>
          <T variant="title">{t('থিম', 'Theme')}</T>
          <View style={styles.row}>
            {modes.map((m) => (
              <Chip key={m.id} label={t(m.bn, m.en)} active={mode === m.id} onPress={() => setMode(m.id)} />
            ))}
          </View>
          <T variant="title">{t('রং', 'Colours')}</T>
          <View style={styles.row}>
            <Chip label={t('এলোমেলো', 'Random')} active={palettePref === 'random'} onPress={() => setPalette('random')} />
            {PALETTE_TOKENS.map((p) => (
              <Chip key={p.id} label={t(p.bn, p.en)} active={palettePref === p.id} onPress={() => setPalette(p.id)} />
            ))}
          </View>
        </GlassCard>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
