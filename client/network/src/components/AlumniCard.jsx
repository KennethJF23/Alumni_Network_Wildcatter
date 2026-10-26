const GRADS = [
  'linear-gradient(135deg,#ffc93c,#ff7a3d 45%,#ff8fb1)',
  'linear-gradient(135deg,#7b61ff,#ff8fb1 60%,#ffc93c)',
  'linear-gradient(135deg,#2fbf8f,#7b61ff 70%,#1b1b3a)',
  'linear-gradient(135deg,#ff8fb1,#ff7a3d 50%,#7b61ff)',
  'linear-gradient(135deg,#ffc93c,#2fbf8f 50%,#7b61ff)',
]
const AVATARS = ['#ffc93c', '#2fbf8f', '#ff8fb1', '#7b61ff', '#ff7a3d']
const STATUS = {
  unverified: ['New', 'new'],
  invited: ['Invited', 'invited'],
  accepted: ['Joined', 'joined'],
  opted_out: ['Opted out', 'out'],
}

const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function AlumniCard({ a, busy, onEnrich, onInvite }) {
  const h = hash(a.name)
  const [label, tone] = STATUS[a.consentStatus] || STATUS.unverified
  const joined = a.consentStatus === 'accepted'
  const out = a.consentStatus === 'opted_out'
  const conf = a.confidence != null ? `${Math.round(a.confidence * 100)}%` : '—'

  return (
    <article className="ac">
      <div className="ac-cover" style={{ background: GRADS[h % GRADS.length] }}>
        <div className="ac-avatar" style={{ background: AVATARS[h % AVATARS.length] }}>
          {initials(a.name)}
          {joined && <i className="ac-dot" />}
        </div>
      </div>

      <div className="ac-meta"><span className={'ac-badge ' + tone}>● {label}</span></div>

      <div className="ac-id">
        <div>
          <h3>{a.name}</h3>
          <p>{[a.currentTitle, a.company].filter(Boolean).join(' · ') || 'Title not found yet'}</p>
          <small>{[a.college, a.city].filter(Boolean).join(' · ')}</small>
        </div>
        <button className="ac-round" title="Find contact details" disabled={busy} onClick={onEnrich}>
          {busy ? '…' : '📇'}
        </button>
      </div>

      <div className="ac-stats">
        <div><span>Level</span><b>{a.seniority || 'Unknown'}</b></div>
        <div><span>Match</span><b>{conf}</b></div>
        <div><span>Batch</span><b>{a.graduationYear || '—'}</b></div>
      </div>

      <div className="ac-about">
        <h5>About</h5>
        <p>{a.snippet || 'No public summary available.'}</p>
        <div className="ac-contact">
          <span className={a.email ? 'ok' : ''}>✉️ {a.email || 'no email'}</span>
          <span className={a.phone ? 'ok' : ''}>📞 {a.phone || 'no phone'}</span>
        </div>
      </div>

      <div className="ac-actions">
        <button className="btn dark ac-main" disabled={busy || joined || out} onClick={onInvite}>
          {joined ? 'Joined ✓' : out ? 'Opted out' : a.consentStatus === 'invited' ? 'Resend invite' : 'Invite'}
        </button>
        {a.linkedinUrl ? (
          <a className="ac-round big" href={a.linkedinUrl} target="_blank" rel="noreferrer" title="Open LinkedIn">in</a>
        ) : (
          <span className="ac-round big off" title="No LinkedIn URL">in</span>
        )}
      </div>
    </article>
  )
}