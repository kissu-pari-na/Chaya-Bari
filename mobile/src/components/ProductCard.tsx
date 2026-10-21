import { Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { imageUri } from '../lib/api'
import { useCart } from '../lib/cart'
import { useLang } from '../lib/i18n'
import { effectivePrice, type Product } from '../lib/types'
import { radius, useTheme } from '../theme/theme'
import { Button, GlassCard, T } from './ui'

/** One dish in the menu list: photo, name, price, and a quick "add". */
export function ProductCard({ product }: { product: Product }) {
  const { colors } = useTheme()
  const { t, tc, bdt } = useLang()
  const { addItem } = useCart()
  const price = effectivePrice(product)
  const uri = imageUri(product.imageUrl)

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
    >
      <GlassCard style={styles.card}>
        {uri ? (
          <Image source={{ uri }} style={[styles.photo, { backgroundColor: colors.skelA }]} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.photo, { backgroundColor: colors.accentSoft }]} />
        )}
        <View style={styles.body}>
          <T variant="title" numberOfLines={2}>
            {tc(product.name, product.nameEnglish)}
          </T>
          <View style={styles.priceRow}>
            <T variant="price">{bdt(price)}</T>
            {price < product.price ? (
              <T variant="small" style={styles.strike}>
                {bdt(product.price)}
              </T>
            ) : null}
          </View>
          {product.isAvailable ? (
            <Button label={t('কার্টে যোগ করুন', 'Add to cart')} icon={{ ios: 'plus', android: 'add' }} onPress={() => addItem(product)} />
          ) : (
            <T variant="muted">{t('এখন পাওয়া যাচ্ছে না', 'Not available right now')}</T>
          )}
        </View>
      </GlassCard>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: 0 },
  photo: { width: '100%', aspectRatio: 16 / 10, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  body: { padding: 16, gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  strike: { textDecorationLine: 'line-through' },
})
