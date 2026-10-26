import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import './App.css'

const NAV = [['Home', '#home'], ['About', '#about'], ['Features', '#features'], ['Agents', '#agents'], ['Contact', '#contact']]

const TICKER = ['Voice & Text Commands', 'Agentic AI Outreach', 'LinkedIn · Email · WhatsApp', 'Central Alumni Data Lake',
  'One-tap App Invite', 'Built for Colleges', 'Built for Students', 'Free Pilot']

const FEATURES = [
  { icon: '🎙️', title: 'Just say it', color: 'var(--yellow)', text: 'Speak or type a plain instruction. No filters, no forms, no spreadsheets.' },
  { icon: '🔎', title: 'Agents find alumni', color: 'var(--green)', text: 'AI agents search LinkedIn and the web for the exact alumni you described.' },
  { icon: '✉️', title: 'Invites sent for you', color: 'var(--pink)', text: 'Personalised invites go out on WhatsApp, email or LinkedIn automatically.' },
  { icon: '🗄️', title: 'Central data lake', color: 'var(--purple)', text: 'Every search enriches one growing database of alumni, titles and contacts.' },
]

const STATS = [['95%', 'Indian colleges with no working alumni network'], ['1 sentence', 'Is all it takes to invite an alumnus'], ['0', 'Manual busywork — agents do it']]

const STEPS = [
  ['01', 'Give an instruction', 'voice or text', '“Find all alumni of my college in Mumbai who are VP or above and invite them.”'],
  ['02', 'Agents do the work', 'in minutes', 'Search, enrich, verify contacts and write each invite — then save to the data lake.'],
  ['03', 'Alumni join the app', 'on accept', 'The alumni app installs on their phone and they can invite their own batchmates.'],
]
const PERKS = [['Native AI', 'Built around agents, not bolted on.'], ['Any channel', 'WhatsApp, email or LinkedIn — your call.'], ['Self-growing', 'Every accepted invite brings more alumni.'], ['College-owned data', 'Your alumni list stays with your college.']]

const AGENTS = [
  { name: 'Intent Agent', tag: 'Understands you', bio: 'Turns voice or text into college, city, role and channel.', color: '#ffc93c', emoji: '🧠' },
  { name: 'Search Agent', tag: 'Finds alumni', bio: 'Searches LinkedIn and public sources for matching profiles.', color: '#2fbf8f', emoji: '🔎' },
  { name: 'Outreach Agent', tag: 'Sends invites', bio: 'Writes and sends invites on WhatsApp, email or LinkedIn.', color: '#ff8fb1', emoji: '📨' },
  { name: 'Data Lake Agent', tag: 'Remembers all', bio: 'Stores college, name, title, job and contacts centrally.', color: '#7b61ff', emoji: '🗄️' },
]

const AUDIENCE = [
  ['🎒', 'Students', 'Reach alumni for internships, referrals and advice.'],
  ['🏫', 'Colleges', 'Build a living alumni network without any staff overhead.'],
  ['👔', 'Alumni', 'Reconnect with your batch and give back in one tap.'],
  ['🏢', 'Recruiters', 'Hire from trusted college communities.'],
]

const QUOTES = [
  ['“I typed one line and 40 alumni from my college had invites in their WhatsApp. Unreal.”', 'Aarav Mehta', 'Student · Mumbai'],
  ['“We never had an alumni database. Now it fills itself every time someone searches.”', 'Dr. Neha Kulkarni', 'Placement Head'],
  ['“Got a referral for my internship within two days of asking in the app.”', 'Rohan Iyer', 'Final-year student'],
]

const PLANS = [
  { name: 'Student', price: '₹0', per: 'forever', text: 'Search and invite alumni for your own goals.', feats: ['Voice & text commands', '50 invites / month', 'Alumni app access'] },
  { name: 'College', price: '₹4,999', per: '/ month', text: 'A full alumni network for your institution.', feats: ['Unlimited invites', 'Central data lake', 'Admin dashboard', 'Priority agents'], popular: true },
  { name: 'Enterprise', price: 'Custom', per: '', text: 'Universities and multi-campus groups.', feats: ['Multi-college lake', 'Custom channels', 'Dedicated support'] },
]

const FAQ = [
  ['How does the voice command work?', 'Tap the mic, say what you need — for example, "Find alumni of my college in Pune who are founders" — and agents handle the rest.'],
  ['Where do you find alumni?', 'Agents look across LinkedIn and other public sources, then save each result to the college data lake with name, title, job and contact details.'],
  ['What happens when an alumnus accepts?', 'They are guided to install the alumni app, and can invite other alumni via WhatsApp or email using the same simple instructions.'],
  ['Is our data safe?', 'Alumni data belongs to your college. Only public and consented information is stored, and members can opt out anytime.'],
  ['Is it really free for students?', 'Yes. Students can use the app free; colleges choose a plan to unlock the full data lake and dashboard.'],
]

const Squiggle = () => (
  <svg className="deco" width="120" height="26" viewBox="0 0 120 26" fill="none">
    <path d="M2 14c10-14 18 12 28 0s18 12 28 0 18 12 28 0 18 12 30 0" stroke="#ff7a3d" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

function Heading({ lines, light }) {
  return (
    <div className={'heading' + (light ? ' light' : '')}>
      <h2>{lines}</h2>
      <Squiggle />
    </div>
  )
}

function Hero() {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [sent, setSent] = useState(null)
  const rec = useRef(null)

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

  const submit = (e) => {
    e.preventDefault()
    if (text.trim()) setSent(text.trim())
  }

  return (
    <section id="home" className="hero wrap">
      <div className="hero-left">
        <span className="pill">🇮🇳 For every college · Voice & text</span>
        <h1>Just <em>ask</em>.<br />Your alumni <em>show up</em>.</h1>
        <p className="lead">Say one sentence. AI agents find your college alumni, invite them on WhatsApp, email or LinkedIn, and grow your network for you.</p>

        <form className="cmd" onSubmit={submit}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Find alumni of my college in Mumbai who are VP or above…"
          />
          <button type="button" className={'mic' + (listening ? ' on' : '')} onClick={toggleMic} aria-label="Voice input">🎙️</button>
          <button type="submit" className="btn dark">Send invites</button>
        </form>
        {sent && (
          <div className="demo">
            <b>Agents started ✓</b>
            <span>“{sent}” → log in to run it for real</span>
            <Link to="/login" className="btn orange sm" style={{ width: 'fit-content', marginTop: 6 }}>Log in to continue</Link>
          </div>
        )}
        <div className="hero-cta">
          <a href="#how" className="btn ghost">See how it works</a>
          <Link to="/login" className="btn orange">Try a free pilot</Link>
        </div>
      </div>

      <div className="hero-art" aria-hidden="true">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="phone">
          <div className="bubble me">Find VPs from my college in Mumbai 🎙️</div>
          <div className="bubble ai">Found 38 alumni. Sending invites on WhatsApp…</div>
          <div className="bubble ai ok">✓ 12 accepted · App installed</div>
        </div>
        <div className="chip c1">🎓 Alumni verified</div>
        <div className="chip c2">🗄️ +38 added to data lake</div>
        <div className="chip c3">💬 WhatsApp · ✉️ Email · in LinkedIn</div>
      </div>
    </section>
  )
}

function Ticker() {
  const items = [...TICKER, ...TICKER, ...TICKER, ...TICKER]
  return (
    <div className="ticker">
      <div className="track">{items.map((t, i) => <span key={i}>{t} <i>✦</i></span>)}</div>
    </div>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="faq">
      {FAQ.map(([q, a], i) => (
        <div key={q} className={'faq-item' + (open === i ? ' open' : '')}>
          <button onClick={() => setOpen(open === i ? -1 : i)}>
            {q}<span>{open === i ? '−' : '+'}</span>
          </button>
          {open === i && <p>{a}</p>}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [menu, setMenu] = useState(false)
  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <a href="#home" className="logo"><span>🎓</span> Alumni<b>Loop</b></a>
          <nav className={menu ? 'open' : ''}>
            {NAV.map(([n, h]) => <a key={n} href={h} onClick={() => setMenu(false)}>{n}</a>)}
            <Link to="/login" className="btn orange sm nav-cta" onClick={() => setMenu(false)}>Get started</Link>
          </nav>
          <Link to="/login" className="btn orange sm">Get started</Link>
          <button className="burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
            {menu ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <Hero />
      <Ticker />

      <section id="features" className="wrap section">
        <div className="row-head">
          <Heading lines="Pick a superpower" />
          <a href="#how" className="btn ghost sm">How it works</a>
        </div>
        <div className="grid4">
          {FEATURES.map((f) => (
            <article key={f.title} className="card feature" style={{ '--c': f.color }}>
              <div className="ico">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="wrap section about">
        <div>
          <h2 className="big">Colleges deserve a network that builds itself</h2>
          <p className="lead">Most Indian colleges have alumni everywhere and a network nowhere. We replace spreadsheets and cold DMs with a native-AI assistant that does the busywork.</p>
          <a href="#how" className="btn dark">Our approach</a>
        </div>
        <div className="stats">
          {STATS.map(([n, l]) => (
            <div key={n} className="stat"><h3>{n}</h3><p>{l}</p></div>
          ))}
        </div>
      </section>

      <section id="how" className="wrap section">
        <Heading lines="How it works" />
        <p className="sub">Three steps, from one sentence to a growing alumni community.</p>
        <div className="steps">
          {STEPS.map(([n, t, s, d]) => (
            <article key={n} className="card step">
              <span className="num">{n}</span>
              <h3>{t}</h3>
              <small>— {s}</small>
              <p>{d}</p>
            </article>
          ))}
        </div>
        <div className="perks">
          {PERKS.map(([t, d]) => (
            <div key={t}><span className="tick">✓</span><h4>{t}</h4><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section id="agents" className="wrap section">
        <div className="row-head">
          <Heading lines="Meet the agents" />
        </div>
        <div className="grid4">
          {AGENTS.map((a) => (
            <article key={a.name} className="card agent">
              <div className="avatar" style={{ background: a.color }}>{a.emoji}</div>
              <small>{a.tag}</small>
              <h3>{a.name}</h3>
              <p>{a.bio}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <Heading lines="Made for everyone" />
        <p className="sub">One network, four kinds of people who all benefit.</p>
        <div className="grid4">
          {AUDIENCE.map(([i, t, d]) => (
            <Link key={t} to="/login" className="card level">
              <span className="ico">{i}</span>
              <h3>{t}</h3>
              <p>{d}</p>
              <span className="arrow">↗</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section channels">
        <div className="chan-art" aria-hidden="true">
          <div className="ch w">💬 WhatsApp</div>
          <div className="ch e">✉️ Email</div>
          <div className="ch l">in LinkedIn</div>
          <div className="ch a">📱 Alumni App</div>
        </div>
        <div>
          <span className="pill">Every channel</span>
          <h2 className="big">Reach alumni where they already are</h2>
          <p className="lead">Choose the channel in your instruction — "invite on WhatsApp" or "email them" — and the outreach agent follows. When they accept, the app installs and they can invite others too.</p>
          <ul className="tags">
            <li>WhatsApp invites</li><li>Email campaigns</li><li>LinkedIn outreach</li><li>In-app referrals</li>
          </ul>
        </div>
      </section>

      <section className="wrap section">
        <Heading lines="What people say" />
        <div className="grid3">
          {QUOTES.map(([q, n, r]) => (
            <figure key={n} className="card quote">
              <div className="stars">★★★★★</div>
              <blockquote>{q}</blockquote>
              <figcaption>
                <span className="init">{n[0]}</span>
                <div><b>{n}</b><small>{r}</small></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <Heading lines="Simple plans" />
        <p className="sub">Free for students. Colleges pay only when the network grows.</p>
        <div className="grid3">
          {PLANS.map((p) => (
            <article key={p.name} className={'card plan' + (p.popular ? ' popular' : '')}>
              {p.popular && <span className="badge">Popular</span>}
              <h3>{p.name}</h3>
              <div className="price">{p.price}<small> {p.per}</small></div>
              <p>{p.text}</p>
              <ul>{p.feats.map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <Link to="/login" className={'btn ' + (p.popular ? 'orange' : 'dark')}>Choose {p.name}</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <Heading lines="No stress, no surprises" />
        <Faq />
      </section>

      <section id="contact" className="wrap">
        <div className="cta">
          <span className="pill light">Free pilot for your college</span>
          <h2>Start building your alumni network today</h2>
          <p>Tell us your college. Say one sentence. Watch the first invites go out.</p>
          <div className="cta-btns">
            <Link to="/login" className="btn orange">Claim your free pilot</Link>
            <a href="#home" className="btn white">Try the command box</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap foot-in">
          <div>
            <a href="#home" className="logo"><span>🎓</span> Alumni<b>Loop</b></a>
            <p>hello@alumniloop.app<br />AI-native alumni networks for Indian colleges.</p>
          </div>
          <div>
            <h4>Pages</h4>
            {NAV.map(([n, h]) => <a key={n} href={h}>{n}</a>)}
          </div>
          <div>
            <h4>Stay updated</h4>
            <form className="sub-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Your email" />
              <button className="btn orange sm">Join</button>
            </form>
          </div>
        </div>
        <div className="wrap copy">© 2026 AlumniLoop · Terms · Privacy</div>
      </footer>
    </>
  )
}