import { useEffect, useState } from 'react'
import { api } from '../api'

const PALETTE = ['#ff7a3d', '#ffc93c', '#2fbf8f', '#7b61ff', '#ff8fb1', '#1b1b3a', '#8bd3ff', '#b6a0ff']
const STATUS_LABEL = { unverified: 'Discovered', invited: 'Invited', accepted: 'Joined', opted_out: 'Opted out' }
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0)

function Bars({ data, color = 'var(--orange)', map = (x) => x }) {
  if (!data?.length) return <p className="t-none">No data yet</p>
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="t-bars">
      {data.map((d) => (
        <div key={d.label} className="t-bar">
          <span title={d.label}>{map(d.label)}</span>
          <div><i style={{ width: `${(d.count / max) * 100}%`, background: color }} /></div>
          <b>{d.count}</b>
        </div>
      ))}
    </div>
  )
}

function Donut({ data }) {
  if (!data?.length) return <p className="t-none">No data yet</p>
  const total = data.reduce((s, d) => s + d.count, 0)
  let acc = 0
  const stops = data
    .map((d, i) => {
      const s = (acc / total) * 100
      acc += d.count
      return `${PALETTE[i % PALETTE.length]} ${s}% ${(acc / total) * 100}%`
    })
    .join(',')
  return (
    <div className="t-donut-wrap">
      <div className="t-donut" style={{ background: `conic-gradient(${stops})` }}>
        <div><b>{total}</b><span>alumni</span></div>
      </div>
      <ul>
        {data.map((d, i) => (
          <li key={d.label}><i style={{ background: PALETTE[i % PALETTE.length] }} />{d.label}<b>{d.count}</b></li>
        ))}
      </ul>
    </div>
  )
}

function Growth({ data }) {
  if (!data?.length) return <p className="t-none">No records added in the last 30 days</p>
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div className="t-growth">
      {data.map((d) => (
        <div key={d.label} className="t-col" title={`${d.label}: +${d.count}`}>
          <i style={{ height: `${Math.max(8, (d.count / max) * 100)}%` }} />
          <span>{d.label.slice(8)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Trends() {
  const [s, setS] = useState(null)
  const [recent, setRecent] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([api('/alumni/stats'), api('/alumni?limit=8')])
      .then(([stats, list]) => {
        setS(stats)
        setRecent(list.alumni)
      })
      .catch((e) => setErr(e.message))
  }, [])

  if (err) return <div className="dash"><div className="d-err">{err}</div></div>
  if (!s) return <div className="dash"><div className="d-empty"><i className="spin" /> Loading data lake…</div></div>

  const added30 = s.growth.reduce((a, g) => a + g.count, 0)
  const joined = s.byStatus.find((x) => x.label === 'accepted')?.count || 0

  const kpis = [
    ['🗄️', s.total, 'Alumni in the lake', 'var(--yellow)'],
    ['🏫', s.colleges, 'Colleges covered', 'var(--green)'],
    ['✉️', `${pct(s.withEmail, s.total)}%`, 'Have an email', 'var(--pink)'],
    ['📞', `${pct(s.withPhone, s.total)}%`, 'Have a phone', 'var(--purple)'],
  ]

  return (
    <div className="dash">
      <header className="d-head">
        <span className="pill">🗄️ Central data lake</span>
        <h1>Data lake & trends</h1>
        <p>Every search adds to one growing alumni database. Here is what it holds.</p>
      </header>

      <div className="t-kpis">
        {kpis.map(([i, n, l, c]) => (
          <div key={l} className="t-kpi" style={{ background: c }}>
            <span>{i}</span><b>{n}</b><small>{l}</small>
          </div>
        ))}
      </div>

      <div className="t-grid">
        <section className="d-panel t-wide">
          <h3>Records added <small>last 30 days · +{added30}</small></h3>
          <Growth data={s.growth} />
        </section>

        <section className="d-panel">
          <h3>Seniority mix</h3>
          <Donut data={s.bySeniority} />
        </section>

        <section className="d-panel">
          <h3>Invite funnel <small>{joined} joined</small></h3>
          <Bars data={s.byStatus} map={(x) => STATUS_LABEL[x] || x} color="var(--green)" />
        </section>

        <section className="d-panel">
          <h3>Top colleges</h3>
          <Bars data={s.byCollege} color="var(--orange)" />
        </section>

        <section className="d-panel">
          <h3>Top cities</h3>
          <Bars data={s.byCity} color="var(--purple)" />
        </section>

        <section className="d-panel">
          <h3>Top companies</h3>
          <Bars data={s.byCompany} color="var(--pink)" />
        </section>

        <section className="d-panel">
          <h3>Data quality</h3>
          <Bars
            data={[
              { label: 'LinkedIn URL', count: s.withLinkedIn },
              { label: 'Email', count: s.withEmail },
              { label: 'Phone', count: s.withPhone },
            ]}
            color="var(--yellow)"
          />
          <p className="t-note">Average match confidence: <b>{Math.round(s.avgConfidence * 100)}%</b></p>
        </section>

        <section className="d-panel t-wide">
          <h3>Latest records</h3>
          <div className="t-table-wrap">
            <table className="t-table">
              <thead>
                <tr><th>Name</th><th>College</th><th>Title</th><th>Company</th><th>City</th><th>Contact</th></tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a._id}>
                    <td><b>{a.name}</b></td>
                    <td>{a.college}</td>
                    <td>{a.currentTitle || '—'}</td>
                    <td>{a.company || '—'}</td>
                    <td>{a.city || '—'}</td>
                    <td>{a.email ? '✉️' : ''} {a.phone ? '📞' : ''} {a.linkedinUrl ? 'in' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}