import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Button, Centered, GlassCard, Screen, T } from '../../components/ui'
import { apiRequest, imageUri } from '../../lib/api'
import { useCart } from '../../lib/cart'
import { useLang } from '../../lib/i18n'
import { effectivePrice, type Product } from '../../lib/types'
import { useTheme } from '../../theme/theme'

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const { t, tc, bdt, digits } = useLang()
  const { addItem } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState(false)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    apiRequest<{ product: Product }>(`/products/${encodeURIComponent(id)}`)
      .then((r) => setProduct(r.product))
      .catch(() => setError(true))
  }, [id])

  if (error) {
    return (
      <Screen>
        <Centered>
          <T variant="title">{t('খাবারটি পাওয়া যায়নি', 'Dish not found')}</T>
        </Centered>
      </Screen>
    )
  }
  if (!product) {
    return (
      <Screen>
        <Centered />
      </Screen>
    )
  }

  const uri = imageUri(product.imageUrl)
  const price = effectivePrice(product)

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        {uri ? <Image source={{ uri }} style={[styles.photo, { backgroundColor: colors.skelA }]} contentFit="cover" /> : null}
        <GlassCard style={styles.card}>
          <T variant="h1">{tc(product.name, product.nameEnglish)}</T>
          <T variant="price">{bdt(price)}</T>
          {product.reviewCount > 0 ? (
            <T variant="muted">
              {`★ ${digits(product.avgRating.toFixed(1))} · ${t(`${digits(product.reviewCount)}টি রিভিউ`, `${product.reviewCount} reviews`)}`}
            </T>
          ) : null}
          {product.description ? <T>{product.description}</T> : null}
          {product.prepInfo ? <T variant="muted">{product.prepInfo}</T> : null}
        </GlassCard>

        {product.isAvailable ? (
          <GlassCard style={styles.card}>
            <View style={styles.qtyRow}>
              <Button kind="ghost" label="−" onPress={() => setQty((q) => Math.max(1, q - 1))} />
              <T variant="title" style={styles.qty}>
                {digits(qty)}
              </T>
              <Button kind="ghost" label="+" onPress={() => setQty((q) => q + 1)} />
            </View>
            <Button
              label={`${t('কার্টে যোগ করুন', 'Add to cart')} · ${bdt(price * qty)}`}
              onPress={() => {
                addItem(product, qty)
                router.back()
              }}
            />
          </GlassCard>
        ) : (
          <T variant="muted">{t('এখন পাওয়া যাচ্ছে না', 'Not available right now')}</T>
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 22 },
  card: { gap: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  qty: { minWidth: 40, textAlign: 'center' },
})
