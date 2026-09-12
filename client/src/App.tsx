import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BusinessProfileProvider } from './context/BusinessProfileContext'
import { CartProvider } from './context/CartContext'
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
import { AdminDashboard } from './pages/AdminDashboard'
import { BusinessProfileSettings } from './pages/BusinessProfileSettings'
import { ProductsAdmin } from './pages/admin/ProductsAdmin'
import { CategoriesAdmin } from './pages/admin/CategoriesAdmin'
import { OrderingSettingsAdmin } from './pages/admin/OrderingSettingsAdmin'
import { OrdersAdmin } from './pages/admin/OrdersAdmin'
import { OrderDetailAdmin } from './pages/admin/OrderDetailAdmin'
import { CouponsAdmin } from './pages/admin/CouponsAdmin'
import { DeliveriesAdmin } from './pages/admin/DeliveriesAdmin'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { Invoice } from './pages/Invoice'
import { KitchenHome } from './pages/KitchenHome'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export default function App() {
  return (
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
                <Route path="ordering-settings" element={<OrderingSettingsAdmin />} />
                <Route path="business-profile" element={<BusinessProfileSettings />} />
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
  )
}
