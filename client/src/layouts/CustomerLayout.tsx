import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'

export function CustomerLayout() {
  return (
    <div className="page">
      <Header variant="customer" />
      <main className="page__content">
        <Outlet />
      </main>
    </div>
  )
}
