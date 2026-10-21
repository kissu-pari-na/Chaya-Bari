import { FlatList, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import * as Linking from 'expo-linking'
import { Button, Centered, GlassCard, Screen, T } from '../../components/ui'
import { WEB_URL } from '../../lib/api'
import { useCart } from '../../lib/cart'
import { useLang } from '../../lib/i18n'

/** The cart. Totals are a preview; the server prices the order. */
export default function CartScreen() {
  const { t, tc, bdt, digits } = useLang()
  const { items, subtotal, setQuantity } = useCart()

  if (items.length === 0) {
    return (
      <Screen>
        <Centered>
          <T variant="title">{t('আপনার কার্ট খালি', 'Your cart is empty')}</T>
          <Button label={t('মেনু দেখুন', 'Browse the menu')} onPress={() => router.navigate('/')} />
        </Centered>
      </Screen>
    )
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(i) => i.productId}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        renderItem={({ item }) => (
          <GlassCard style={styles.line}>
            <View style={styles.lineText}>
              <T variant="title" numberOfLines={2}>
                {tc(item.name, item.nameEnglish)}
              </T>
              <T variant="price">{bdt(item.price * item.quantity)}</T>
            </View>
            <View style={styles.qtyRow}>
              <Button
                kind="ghost"
                label="−"
                onPress={() => setQuantity(item.productId, item.quantity - 1)}
              />
              <T variant="title" style={styles.qty}>
                {digits(item.quantity)}
              </T>
              <Button kind="ghost" label="+" onPress={() => setQuantity(item.productId, item.quantity + 1)} />
            </View>
          </GlassCard>
        )}
        ListFooterComponent={
          <GlassCard style={styles.summary}>
            <View style={styles.totalRow}>
              <T variant="title">{t('সাবটোটাল', 'Subtotal')}</T>
              <T variant="price">{bdt(subtotal)}</T>
            </View>
            <T variant="muted">
              {t(
                'ডেলিভারি চার্জ ও চূড়ান্ত মোট চেকআউটে দেখানো হবে। অ্যাপে চেকআউট শীঘ্রই আসছে; এখন ওয়েবসাইটে অর্ডার করুন।',
                'Delivery and the final total are shown at checkout. Checkout in the app is coming soon; order on the website for now.',
              )}
            </T>
            <Button
              label={t('ওয়েবসাইটে অর্ডার করুন', 'Order on the website')}
              icon={{ ios: 'safari', android: 'open_in_new' }}
              onPress={() => void Linking.openURL(WEB_URL)}
            />
          </GlassCard>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  gap: { height: 12 },
  line: { gap: 12 },
  lineText: { gap: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qty: { minWidth: 32, textAlign: 'center' },
  summary: { marginTop: 16, gap: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
})
