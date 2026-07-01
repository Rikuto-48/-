import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'ダッシュボード', end: true },
  { to: '/sections', label: '測定データ入力' },
  { to: '/plans', label: '整備計画・記録' },
  { to: '/thresholds', label: '整備基準値設定' },
]

export default function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <h1>軌道整備計算シート</h1>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
