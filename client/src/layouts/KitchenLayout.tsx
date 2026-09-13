import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'

export function KitchenLayout() {
  return (
    <div className="page theme-dark">
      <Header variant="kitchen" />
      <main className="page__content">
        <Outlet />
      </main>
    </div>
  )
}
