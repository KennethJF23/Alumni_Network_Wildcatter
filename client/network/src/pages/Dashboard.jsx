import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api'
import AlumniCard from '../components/AlumniCard'
import InviteModal from '../components/InviteModal'

const SENIORITY = ['C-level', 'VP', 'Director', 'Manager', 'Senior', 'Entry']
const EXAMPLES = [
  'Find alumni of SFIT in Mumbai',
]
const EMPTY = { q: '', college: '', city: '', seniority: [], status: '', hasEmail: false, hasPhone: false }
const REASONS = {
  no_email: 'no email yet, use "Find contact" first',
  no_phone: 'no phone number yet',
  opted_out: 'this person opted out',
  already_joined: 'already joined',
  send_failed: 'mail server rejected it',
}

export default function Dashboard() {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState(EMPTY)
  const [more, setMore] = useState(false)
  const [list, setList] = useState({ alumni: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [bulk, setBulk] = useState('')
  const [toast, setToast] = useState('')
  const [tick, setTick] = useState(0)
  const [invite, setInvite] = useState(null) // invite popup
  const [sending, setSending] = useState('')
  const rec = useRef(null)
  const inputRef = useRef(null)
  const loc = useLocation()

  const say = (m) => {
    setToast(m)
    setTimeout(() => setToast(''), 4500)
  }

  // the bottom-bar "+" button lands here and focuses the instruction box
  useEffect(() => {
    if (loc.state?.focus) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [loc.state])

  // ---- load the data lake with the current filters ----
  const load = useCallback(async () => {
    const p = new URLSearchParams({ limit: '60' })
    if (filters.q) p.set('q', filters.q)
    if (filters.college) p.set('college', filters.college)
    if (filters.city) p.set('city', filters.city)
    if (filters.seniority.length) p.set('seniority', filters.seniority.join(','))
    if (filters.status) p.set('status', filters.status)
    if (filters.hasEmail) p.set('hasEmail', 'true')
    if (filters.hasPhone) p.set('hasPhone', 'true')
    try {
      const d = await api(`/alumni?${p}`)
      setList({ alumni: d.alumni, total: d.total ?? d.count })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load, tick])

  // ---- voice ----
  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return alert('Voice input is not supported in this browser. Please type instead.')
    if (listening) return rec.current?.stop()
    const r = new SR()
    r.lang = 'en-IN'
    r.onresult = (e) => setText(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    r.start()
    rec.current = r
    setListening(true)
  }

  // ---- run the agents ----
  const run = async (e) => {
    e?.preventDefault?.()
    if (!text.trim() || running) return
    setRunning(true)
    setError('')
    setSummary(null)
    try {
      const data = await api('/alumni/search', { method: 'POST', body: { query: text.trim() } })
      setSummary(data)
      setFilters({ ...EMPTY, college: data.parsed?.college || '' })
      setTick((t) => t + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  // ---- find contact details (never sends anything) ----
  const enrich = async (id) => {
    setBusyId(id)
    try {
      const r = await api(`/alumni/${id}/enrich`, { method: 'POST' })
      say(r.status === 'found' ? 'Contact details found' : r.note || 'No contact details found')
      setTick((t) => t + 1)
    } catch (err) {
      say(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // ---- invite: open the popup (options + preview), nothing is sent yet ----
  const openInvite = async (a) => {
    setBusyId(a._id)
    try {
      const p = await api(`/alumni/${a._id}/invite-preview`)
      setInvite({ mode: 'single', id: a._id, title: `Invite ${p.name}`, options: p.options })
    } catch (err) {
      say(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const college = summary?.parsed?.college || filters.college

  const openBulkInvite = async () => {
    setBulk('invite')
    try {
      const c = encodeURIComponent(college || '')
      const p = await api(`/alumni/invite-batch/preview?limit=10&college=${c}`)
      if (!p.count) {
        say('No new alumni with an email to invite')
      } else {
        setInvite({
          mode: 'batch',
          title: `Invite ${p.count} alumni`,
          ids: p.recipients.map((r) => r.id),
          options: [
            {
              key: 'email',
              icon: '✉️',
              label: 'Email invite',
              to: `${p.count} recipients`,
              subject: p.sample.subject,
              text: p.sample.text,
              recipients: p.recipients.map((r) => r.name),
            },
          ],
        })
      }
    } catch (err) {
      say(err.message)
    } finally {
      setBulk('')
    }
  }

  // ---- confirmed: actually send (channel = "email" | "email_phone") ----
  const sendEmail = async (channel) => {
    setSending('email')
    try {
      if (invite.mode === 'batch') {
        const r = await api('/alumni/invite-batch', { method: 'POST', body: { ids: invite.ids } })
        say(`${r.sent}/${r.attempted} invites sent`)
      } else {
        const r = await api(`/alumni/${invite.id}/invite`, { method: 'POST', body: { channel } })
        say(r.sent ? 'Invite sent ✓' : `Not sent: ${REASONS[r.reason] || r.reason}${r.error ? ` (${r.error})` : ''}`)
      }
      setInvite(null)
      setTick((t) => t + 1)
    } catch (err) {
      say(err.message)
    } finally {
      setSending('')
    }
  }

  // the link itself opens WhatsApp; this only records the invite
  const whatsappOpened = () => {
    const id = invite.id
    api(`/alumni/${id}/invite`, { method: 'POST', body: { channel: 'whatsapp' } })
      .then(() => setTick((t) => t + 1))
      .catch(() => {})
    say('WhatsApp opened. Press send there to deliver it')
    setTimeout(() => setInvite(null), 400)
  }

  const enrichAll = async () => {
    setBulk('enrich')
    try {
      const c = encodeURIComponent(college || '')
      const r = await api(`/alumni/enrich-batch?limit=5&college=${c}`, { method: 'POST' })
      say(`${r.found}/${r.attempted} contacts found`)
      setTick((t) => t + 1)
    } catch (err) {
      say(err.message)
    } finally {
      setBulk('')
    }
  }

  const setF = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const toggleSen = (s) =>
    setFilters({
      ...filters,
      seniority: filters.seniority.includes(s) ? filters.seniority.filter((x) => x !== s) : [...filters.seniority, s],
    })

  const p = summary?.parsed

  return (
    <div className="dash">
      {/* badges */}
      <div className="d-badges">
        <span className="d-live"><i /> 🎙️ Voice & text</span>
        <span className="d-ready">⚡ 3 Agents Ready</span>
      </div>

      <header className="d-head">
        <h1>Ask for any <em>alumni</em></h1>
        <p>Say or type one instruction. Agents find them and fill the data lake. You review every invite before it goes out.</p>
      </header>

      <div className="d-top">
        {/* instruction */}
        <section className="d-panel ins">
          <label className="d-label" htmlFor="instruction">Instruction</label>
          <textarea
            id="instruction"
            ref={inputRef}
            rows={3}
            className="ins-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                run()
              }
            }}
            placeholder="Find alumni of my college in Mumbai…"
          />

          <div className="ins-actions">
            <button type="button" className={'ins-mic' + (listening ? ' on' : '')} onClick={toggleMic} aria-label="Voice input">🎙️</button>
            <button type="button" className="btn dark ins-run" disabled={running} onClick={run}>
              {running ? 'Working…' : '⚡ Run agents'}
            </button>
          </div>

          {running && (
            <div className="d-run"><i className="spin" /> Intent agent → Search agent → Extraction agent → Data lake…</div>
          )}
          {error && <div className="d-err">{error}</div>}

          <hr className="ins-hr" />
          <div className="d-label">Suggested prompts</div>
          <div className="ins-sug">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="ins-row" onClick={() => setText(x)}>
                <span>{x}</span><i>›</i>
              </button>
            ))}
          </div>
        </section>

        {/* filters */}
        <section className="d-panel flt">
          <div className="flt-head">
            <span className="d-label">Direct filters</span>
            <button type="button" className="flt-clear" onClick={() => setFilters(EMPTY)}>Clear</button>
          </div>

          <label className="fi">
            <span className="fi-ico p">🔎</span>
            <input placeholder="Name, title or company" value={filters.q} onChange={setF('q')} />
          </label>
          <label className="fi">
            <span className="fi-ico y">🏫</span>
            <input placeholder="College or university" value={filters.college} onChange={setF('college')} />
          </label>
          <label className="fi">
            <span className="fi-ico k">📍</span>
            <input placeholder="City or region" value={filters.city} onChange={setF('city')} />
          </label>

          <button type="button" className="flt-more" onClick={() => setMore(!more)}>
            {more ? 'Fewer filters ▴' : 'More filters ▾'}
          </button>

          {more && (
            <div className="flt-extra">
              <div className="d-chips" style={{ marginTop: 0 }}>
                {SENIORITY.map((s) => (
                  <button key={s} type="button" className={'d-chip' + (filters.seniority.includes(s) ? ' on' : '')} onClick={() => toggleSen(s)}>{s}</button>
                ))}
              </div>
              <select className="d-in" value={filters.status} onChange={setF('status')}>
                <option value="">All statuses</option>
                <option value="unverified">New</option>
                <option value="invited">Invited</option>
                <option value="accepted">Joined</option>
              </select>
              <div className="d-filter-row">
                <label className="d-check"><input type="checkbox" checked={filters.hasEmail} onChange={(e) => setFilters({ ...filters, hasEmail: e.target.checked })} /> Has email</label>
                <label className="d-check"><input type="checkbox" checked={filters.hasPhone} onChange={(e) => setFilters({ ...filters, hasPhone: e.target.checked })} /> Has phone</label>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* run summary */}
      {summary && (
        <div className="d-sum">
          <div className="d-sum-top">
            <b>Done ✓</b>
            <div className="d-tags">
              {p?.college && <span>🏫 {p.college}</span>}
              {p?.city && <span>📍 {p.city}</span>}
              {p?.minSeniority && <span>⭐ {p.minSeniority}+</span>}
              {p?.titles?.slice(0, 3).map((t) => <span key={t}>💼 {t}</span>)}
            </div>
          </div>
          <div className="d-sum-stats">
            <div><b>{summary.found ?? 0}</b><span>results scanned</span></div>
            <div><b>{summary.peopleExtracted ?? 0}</b><span>people found</span></div>
            <div><b>{summary.saved ?? 0}</b><span>saved to lake</span></div>
            <div><b>{Object.values(summary.excluded || {}).reduce((a, b) => a + b, 0)}</b><span>filtered out</span></div>
          </div>
          {summary.message && <p className="d-note">{summary.message}</p>}
          <div className="d-sum-actions">
            <button className="btn orange sm" disabled={!!bulk} onClick={enrichAll}>
              {bulk === 'enrich' ? 'Finding…' : '📇 Find contacts (5)'}
            </button>
            <button className="btn dark sm" disabled={!!bulk} onClick={openBulkInvite}>
              {bulk === 'invite' ? 'Loading…' : '✉️ Preview bulk invite'}
            </button>
          </div>
        </div>
      )}

      {/* results */}
      <div className="d-count">Showing <b>{list.alumni.length}</b> of <b>{list.total}</b> alumni</div>

      {loading ? (
        <div className="d-empty"><i className="spin" /> Loading data lake…</div>
      ) : list.alumni.length === 0 ? (
        <div className="d-empty">
          <span>🗄️</span>
          <h3>No alumni match yet</h3>
          <p>Run a command above, or loosen the filters.</p>
        </div>
      ) : (
        <div className="ac-grid">
          {list.alumni.map((a) => (
            <AlumniCard
              key={a._id}
              a={a}
              busy={busyId === a._id}
              onEnrich={() => enrich(a._id)}
              onInvite={() => openInvite(a)}
            />
          ))}
        </div>
      )}

      <InviteModal
        data={invite}
        sending={sending}
        onClose={() => setInvite(null)}
        onEmail={sendEmail}
        onWhatsApp={whatsappOpened}
      />

      {toast && <div className="d-toast">{toast}</div>}
    </div>
  )
}