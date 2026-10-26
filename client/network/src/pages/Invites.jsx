import { useEffect, useState } from 'react'
import { api } from '../api'

const TABS = [['all', 'All'], ['invited', 'Invited'], ['accepted', 'Joined']]
const BADGE = { invited: ['Invited', 'invited'], accepted: ['Joined', 'joined'] }
const COLORS = ['#ffc93c', '#2fbf8f', '#ff8fb1', '#7b61ff', '#ff7a3d']
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const when = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '')

export default function Invites() {
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('all')
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/alumni?status=invited,accepted&mine=true&limit=200')
      .then((d) => setRows(d.alumni))
      .catch((e) => setErr(e.message))
  }, [])

  const shown = (rows || []).filter((r) => tab === 'all' || r.consentStatus === tab)

  return (
    <div className="dash">
      <header className="d-head">
        <span className="pill">✉️ Outreach</span>
        <h1>Invites</h1>
        <p>Everyone you invited, and who has joined the app.</p>
      </header>

      <div className="d-chips" style={{ marginTop: 0 }}>
        {TABS.map(([k, l]) => (
          <button key={k} className={'d-chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {err && <div className="d-err">{err}</div>}
      {!rows && !err && <div className="d-empty"><i className="spin" /> Loading…</div>}
      {rows && shown.length === 0 && (
        <div className="d-empty">
          <span>✉️</span>
          <h3>No invites yet</h3>
          <p>Tap + to find alumni, then invite them.</p>
        </div>
      )}

      <div className="iv-list">
        {shown.map((a) => {
          const [label, tone] = BADGE[a.consentStatus] || BADGE.invited
          return (
            <div key={a._id} className="iv-row">
              <span className="iv-av" style={{ background: COLORS[hash(a.name) % COLORS.length] }}>{(a.name || '?')[0]}</span>
              <div className="iv-main">
                <b>{a.name}</b>
                <small>{[a.currentTitle, a.company].filter(Boolean).join(' · ') || a.college}</small>
              </div>
              <div className="iv-side">
                <span className={'ac-badge ' + tone}>● {label}</span>
                <small>{a.inviteChannel === 'whatsapp' ? '💬' : '✉️'} {when(a.joinedAt || a.invitedAt)}</small>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}