import { useCallback, useEffect, useMemo, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { ProductCard } from '../../components/ProductCard'
import { Button, Centered, Chip, Screen, T } from '../../components/ui'
import { apiRequest } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import type { Category, Product } from '../../lib/types'
import { useTheme } from '../../theme/theme'

/** The storefront menu: category filter + dishes (same API as the website). */
export default function MenuScreen() {
  const { colors } = useTheme()
  const { t } = useLang()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[] | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const [c, p] = await Promise.all([
        apiRequest<{ categories: Category[] }>('/categories'),
        apiRequest<{ products: Product[] }>('/products'),
      ])
      setCategories(c.categories.filter((x) => x.isActive).sort((a, b) => a.sortOrder - b.sortOrder))
      setProducts(p.products)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const shown = useMemo(
    () => (products ?? []).filter((p) => p.isActive && (!categoryId || p.categoryId === categoryId)),
    [products, categoryId],
  )

  if (error && !products) {
    return (
      <Screen>
        <Centered>
          <T variant="title">{t('মেনু লোড করা যায়নি', 'Could not load the menu')}</T>
          <T variant="muted">{t('ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।', 'Check your connection and try again.')}</T>
          <Button label={t('আবার চেষ্টা করুন', 'Try again')} onPress={() => void load()} />
        </Centered>
      </Screen>
    )
  }
  if (!products) {
    return (
      <Screen>
        <Centered />
      </Screen>
    )
  }

  return (
    <Screen>
      <FlatList
        data={shown}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label={t('সব', 'All')} active={!categoryId} onPress={() => setCategoryId(null)} />
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </ScrollView>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <T variant="muted">{t('এই বিভাগে এখন কোনো খাবার নেই।', 'No dishes in this category right now.')}</T>
          </View>
        }
        renderItem={({ item }) => <ProductCard product={item} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32 },
  chips: { gap: 8, paddingBottom: 16 },
  gap: { height: 16 },
  empty: { padding: 24, alignItems: 'center' },
})
