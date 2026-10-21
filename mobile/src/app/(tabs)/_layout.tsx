import type { ColorValue } from 'react-native'
import { Tabs } from 'expo-router/js-tabs'
import { SymbolView, type SymbolViewProps } from 'expo-symbols'
import { useCart } from '../../lib/cart'
import { useLang } from '../../lib/i18n'
import { useTheme } from '../../theme/theme'

function icon(name: SymbolViewProps['name']) {
  return ({ color, size }: { color: ColorValue; size: number }) => <SymbolView name={name} size={size} tintColor={color} />
}

export default function TabsLayout() {
  const { colors } = useTheme()
  const { t, digits } = useLang()
  const { count } = useCart()

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.glassSolid, borderTopColor: colors.outline },
        tabBarLabelStyle: { fontSize: 13 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('মেনু', 'Menu'),
          headerTitle: t('ছায়া বাড়ি', 'Chaya Bari'),
          tabBarIcon: icon({ ios: 'fork.knife', android: 'restaurant_menu' }),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('কার্ট', 'Cart'),
          tabBarIcon: icon({ ios: 'cart', android: 'shopping_cart' }),
          tabBarBadge: count ? digits(count) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.btn[0], color: colors.onAccent },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('অ্যাকাউন্ট', 'Account'),
          tabBarIcon: icon({ ios: 'person.crop.circle', android: 'account_circle' }),
        }}
      />
    </Tabs>
  )
}
