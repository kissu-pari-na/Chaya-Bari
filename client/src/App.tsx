import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BusinessProfileProvider } from './context/BusinessProfileContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { CustomerLayout } from './layouts/CustomerLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { KitchenLayout } from './layouts/KitchenLayout'
import { CustomerHome } from './pages/CustomerHome'
import { ProductList } from './pages/ProductList'
import { ProductDetail } from './pages/ProductDetail'
import { AdminDashboard } from './pages/AdminDashboard'
import { BusinessProfileSettings } from './pages/BusinessProfileSettings'
import { ProductsAdmin } from './pages/admin/ProductsAdmin'
import { CategoriesAdmin } from './pages/admin/CategoriesAdmin'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { Invoice } from './pages/Invoice'
import { KitchenHome } from './pages/KitchenHome'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

export default function App() {
  return (
    <AuthProvider>
      <BusinessProfileProvider>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Customer (public browsing) */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<CustomerHome />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/invoice" element={<Invoice />} />
          </Route>

          {/* Admin (ADMIN only) */}
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="categories" element={<CategoriesAdmin />} />
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
      </BusinessProfileProvider>
    </AuthProvider>
  )
}
