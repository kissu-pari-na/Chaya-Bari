import { Routes, Route } from 'react-router-dom'
import { BusinessProfileProvider } from './context/BusinessProfileContext'
import { CustomerLayout } from './layouts/CustomerLayout'
import { AdminLayout } from './layouts/AdminLayout'
import { CustomerHome } from './pages/CustomerHome'
import { AdminDashboard } from './pages/AdminDashboard'
import { BusinessProfileSettings } from './pages/BusinessProfileSettings'
import { OrderConfirmation } from './pages/OrderConfirmation'
import { Invoice } from './pages/Invoice'

export default function App() {
  return (
    <BusinessProfileProvider>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<CustomerHome />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />
          <Route path="/invoice" element={<Invoice />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="business-profile" element={<BusinessProfileSettings />} />
        </Route>
      </Routes>
    </BusinessProfileProvider>
  )
}
