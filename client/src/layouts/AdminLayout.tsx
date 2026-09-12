import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'

export function AdminLayout() {
  return (
    <div className="page theme-light">
      <Header variant="admin" />
      <main className="page__content">
        <Outlet />
      </main>
    </div>
  )
}
