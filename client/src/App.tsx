import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BusinessProfileProvider } from './context/BusinessProfileContext'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext'
import { TranslationProvider } from './context/TranslationContext'
import { ThemeProvider } from './context/ThemeContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CustomerLayout } from './layouts/CustomerLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { KitchenLayout } from './layouts/KitchenLayout'
import { CustomerHome } from './pages/CustomerHome'
import { ProductList } from './pages/ProductList'
import { ProductDetail } from './pages/ProductDetail'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { MyOrders } from './pages/MyOrders'
import { OrderDetail } from './pages/OrderDetail'
import { OrderReview } from './pages/OrderReview'
import { AdminDashboard } from './pages/AdminDashboard'
import { BusinessProfileSettings } from './pages/BusinessProfileSettings'
import { ProductsAdmin } from './pages/admin/ProductsAdmin'
import { CategoriesAdmin } from './pages/admin/CategoriesAdmin'
import { OrderingSettingsAdmin } from './pages/admin/OrderingSettingsAdmin'
import { OrdersAdmin } from './pages/admin/OrdersAdmin'
import { OrderDetailAdmin } from './pages/admin/OrderDetailAdmin'
import { CouponsAdmin } from './pages/admin/CouponsAdmin'
import { DeliveriesAdmin } from './pages/admin/DeliveriesAdmin'
import { MaterialsAdmin } from './pages/admin/MaterialsAdmin'
import { PurchasesAdmin } from './pages/admin/PurchasesAdmin'
import { CostingAdmin } from './pages/admin/CostingAdmin'
import { RecipeAdmin } from './pages/admin/RecipeAdmin'
import { ExpensesAdmin } from './pages/admin/ExpensesAdmin'
import { ReportsAdmin } from './pages/admin/ReportsAdmin'
import { AnalyticsAdmin } from './pages/admin/AnalyticsAdmin'
import { UsersAdmin } from './pages/admin/UsersAdmin'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { Invoice } from './pages/Invoice'
import { KitchenHome } from './pages/KitchenHome'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TranslationProvider>
          <AuthProvider>
            <BusinessProfileProvider>
              <CartProvider>
                <Routes>
            {/* Auth */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer (public browsing) */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<CustomerHome />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/invoice" element={<Invoice />} />

              {/* Customer, auth required */}
              <Route element={<ProtectedRoute roles={['CUSTOMER']} />}>
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/orders" element={<MyOrders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/orders/:id/review" element={<OrderReview />} />
              </Route>
            </Route>

            {/* Admin (ADMIN only) */}
            <Route element={<ProtectedRoute roles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrdersAdmin />} />
                <Route path="orders/:id" element={<OrderDetailAdmin />} />
                <Route path="deliveries" element={<DeliveriesAdmin />} />
                <Route path="products" element={<ProductsAdmin />} />
                <Route path="categories" element={<CategoriesAdmin />} />
                <Route path="coupons" element={<CouponsAdmin />} />
                <Route path="materials" element={<MaterialsAdmin />} />
                <Route path="purchases" element={<PurchasesAdmin />} />
                <Route path="costing" element={<CostingAdmin />} />
                <Route path="products/:id/recipe" element={<RecipeAdmin />} />
                <Route path="expenses" element={<ExpensesAdmin />} />
                <Route path="reports" element={<ReportsAdmin />} />
                <Route path="analytics" element={<AnalyticsAdmin />} />
                <Route path="ordering-settings" element={<OrderingSettingsAdmin />} />
                <Route path="business-profile" element={<BusinessProfileSettings />} />
                <Route path="users" element={<UsersAdmin />} />
              </Route>
            </Route>

            {/* Kitchen (KITCHEN only) */}
            <Route element={<ProtectedRoute roles={['KITCHEN']} />}>
              <Route path="/kitchen" element={<KitchenLayout />}>
                <Route index element={<KitchenHome />} />
              </Route>
            </Route>
                </Routes>
              </CartProvider>
            </BusinessProfileProvider>
          </AuthProvider>
        </TranslationProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
