import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

function AdminLayout() {
  async function handleLogout() {
    await supabase?.auth.signOut()
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <nav className="admin-nav">
          <NavLink to="/admin/leads" className={({ isActive }) => (isActive ? 'active' : '')}>
            見込み客管理
          </NavLink>
          <NavLink to="/admin/calendar" className={({ isActive }) => (isActive ? 'active' : '')}>
            コンテンツカレンダー
          </NavLink>
          <NavLink to="/admin/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
            実績ダッシュボード
          </NavLink>
          <NavLink to="/admin/messages" className={({ isActive }) => (isActive ? 'active' : '')}>
            今日のLINE配信
          </NavLink>
        </nav>
        <button type="button" className="logout-button" onClick={handleLogout}>
          ログアウト
        </button>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
