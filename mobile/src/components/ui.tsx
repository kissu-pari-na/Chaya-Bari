import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useLang } from '../lib/i18n'
import { linear, radius, useTheme } from '../theme/theme'

// Glossy Glass building blocks (design.md §5–6) for React Native. Every colour
// comes from useTheme(); nothing here hard-codes one (R-DSN-001).

/** Full-screen canvas with the soft aurora wash behind the content. */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.fill,
        { backgroundColor: colors.canvas, backgroundImage: linear(160, [colors.aur[0], colors.canvas2, colors.aur[3]]) },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** A glass card: translucent fill, bright top edge, soft shadow. */
export function GlassCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glass,
          borderColor: colors.edge,
          boxShadow: `0 12px 32px -12px ${colors.btnGlow}`,
          backgroundImage: linear(165, [colors.glossSheen, 'transparent']),
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

/** Body / heading text in the theme colours. Bangla is never letter-spaced (R-DSN-006). */
export function T({
  children,
  variant = 'body',
  style,
  numberOfLines,
}: {
  children: ReactNode
  variant?: 'body' | 'muted' | 'title' | 'h1' | 'price' | 'small'
  style?: StyleProp<TextStyle>
  numberOfLines?: number
}) {
  const { colors } = useTheme()
  const { lang } = useLang()
  const base: TextStyle = {
    color: variant === 'muted' || variant === 'small' ? colors.muted : variant === 'price' ? colors.accentInk : colors.text,
    fontSize: { body: 17, muted: 15, small: 13, title: 19, h1: 28, price: 17 }[variant],
    lineHeight: lang === 'bn' ? { body: 30, muted: 26, small: 22, title: 30, h1: 40, price: 28 }[variant] : undefined,
    fontWeight: variant === 'title' || variant === 'h1' || variant === 'price' ? '700' : '400',
    letterSpacing: lang === 'en' && variant === 'h1' ? -0.5 : 0,
  }
  return (
    <Text style={[base, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  )
}

/** Primary (gradient) or ghost button. Touch target ≥48px (R-DSN-010). */
export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  icon,
}: {
  label: string
  onPress: () => void
  kind?: 'primary' | 'ghost'
  disabled?: boolean
  busy?: boolean
  icon?: SymbolViewProps['name']
}) {
  const { colors } = useTheme()
  const primary = kind === 'primary'
  const fg = primary ? colors.onAccent : colors.text
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        primary
          ? { backgroundColor: colors.btn[0], backgroundImage: linear(120, colors.btn), boxShadow: `0 10px 24px -10px ${colors.btnGlow}` }
          : { backgroundColor: colors.glassInset, borderColor: colors.edge, borderWidth: 1 },
        { opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={20} tintColor={fg} /> : null}
          <Text style={{ color: fg, fontSize: 16, fontWeight: '700' }}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

/** A selectable pill (category filter, segmented choices). */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        active
          ? { backgroundColor: colors.btn[0], backgroundImage: linear(120, colors.btn), borderColor: 'transparent' }
          : { backgroundColor: colors.glass, borderColor: colors.edge },
      ]}
    >
      <Text style={{ color: active ? colors.onAccent : colors.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

/** Centred spinner / message for loading and empty states. */
export function Centered({ children }: { children?: ReactNode }) {
  const { colors } = useTheme()
  return <View style={styles.centered}>{children ?? <ActivityIndicator color={colors.accent} size="large" />}</View>
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  card: { borderRadius: radius.card, borderWidth: 1, padding: 16, overflow: 'hidden' },
  btn: {
    minHeight: 50,
    borderRadius: radius.btn,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chip: { minHeight: 48, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
})
