import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, getUser, logout } from '../api'

const ROWS = [
  ['📊', 'Data lake & trends', '/app/trends'],
  ['✉️', 'My invites', '/app/invites'],
]

export default function Profile() {
  const nav = useNavigate()
  const user = getUser() || {}
  const [s, setS] = useState(null)

  useEffect(() => {
    api('/alumni/stats').then(setS).catch(() => {})
  }, [])

  const count = (k) => s?.byStatus?.find((x) => x.label === k)?.count || 0

  return (
    <div className="dash pf">
      <section className="ac pf-card">
        <div className="ac-cover" style={{ background: 'linear-gradient(135deg,#7b61ff,#ff8fb1 60%,#ffc93c)' }}>
          <div className="ac-avatar" style={{ background: 'var(--yellow)' }}>{(user.name || '?')[0].toUpperCase()}</div>
        </div>
        <div className="ac-meta" />
        <div className="ac-id">
          <div>
            <h3>{user.name}</h3>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="ac-stats">
          <div><span>In lake</span><b>{s?.total ?? '—'}</b></div>
          <div><span>Invited</span><b>{s ? count('invited') : '—'}</b></div>
          <div><span>Joined</span><b>{s ? count('accepted') : '—'}</b></div>
        </div>
      </section>

      <section className="d-panel pf-list">
        {ROWS.map(([i, l, to]) => (
          <Link key={l} to={to} className="pf-row"><span>{i}</span>{l}<i>›</i></Link>
        ))}
        <a className="pf-row" href="mailto:hello@alumniloop.app"><span>💬</span>Help & support<i>›</i></a>
        <button className="pf-row out" onClick={() => { logout(); nav('/login') }}><span>⎋</span>Log out</button>
      </section>
    </div>
  )
}