import { NavLink, Outlet, Navigate, Link, useNavigate } from 'react-router-dom'
import { getToken, getUser, logout } from '../api'

function TabIcon({ type }) {
  const paths = {
    home: <><path d="m3 9 5-4 5 4v6H9v-4H7v4H3z" /><path d="M5 15h6" /></>,
    lake: <><rect x="3" y="4" width="10" height="10" rx="1" /><path d="M3 8h10M7 8v6" /></>,
    invites: <><rect x="2.5" y="4" width="11" height="8" rx="1.5" /><path d="m3 5 5 4 5-4" /></>,
    profile: <><circle cx="8" cy="5" r="2.5" /><path d="M3.5 14a4.5 4.5 0 0 1 9 0" /></>,
  }
  return <svg className="tab-svg" viewBox="0 0 16 16" aria-hidden="true">{paths[type]}</svg>
}

export default function AppLayout() {
  const nav = useNavigate()
  if (!getToken()) return <Navigate to="/login" replace />
  const user = getUser() || {}
  const side = ({ isActive }) => 'side-link' + (isActive ? ' active' : '')
  const tab = ({ isActive }) => 'tab' + (isActive ? ' on' : '')

  return (
    <div className="shell">
      {/* desktop sidebar */}
      <aside className="side">
        <Link to="/app/dashboard" className="logo"><span>🎓</span> Alumni<b>Loop</b></Link>

        <nav className="side-nav">
          <NavLink to="/app/dashboard" className={side}><span>🏠</span> Dashboard</NavLink>
          <NavLink to="/app/trends" className={side}><span>📊</span> Data Lake</NavLink>
          <NavLink to="/app/invites" className={side}><span>✉️</span> Invites</NavLink>
          <NavLink to="/app/profile" className={side}><span>👤</span> Profile</NavLink>
        </nav>

        <div className="side-user">
          <span className="init">{(user.name || '?')[0].toUpperCase()}</span>
          <div>
            <b>{user.name}</b>
            <small>{user.email}</small>
          </div>
          <button className="side-out" title="Log out" onClick={() => { logout(); nav('/login') }}>⎋</button>
        </div>
      </aside>

      <main className="main"><Outlet /></main>

      {/* mobile bottom tab bar */}
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/app/dashboard" className={tab}><span className="tab-icon"><TabIcon type="home" /></span><span className="tab-label">Home</span></NavLink>
        <NavLink to="/app/trends" className={tab}><span className="tab-icon"><TabIcon type="lake" /></span><span className="tab-label">Lake</span></NavLink>
        <button className="tab-plus" aria-label="New search" onClick={() => nav('/app/dashboard', { state: { focus: Date.now() } })}>+</button>
        <NavLink to="/app/invites" className={tab}><span className="tab-icon"><TabIcon type="invites" /></span><span className="tab-label">Invites</span></NavLink>
        <NavLink to="/app/profile" className={tab}><span className="tab-icon"><TabIcon type="profile" /></span><span className="tab-label">Profile</span></NavLink>
      </nav>
    </div>
  )
}