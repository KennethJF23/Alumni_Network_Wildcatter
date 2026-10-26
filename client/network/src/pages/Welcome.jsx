import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SLIDES = [
  { id: 'welcome', color: 'var(--yellow)', title: ['Welcome to ', 'AlumniLoop'], text: 'Build your college alumni network just by asking. Find alumni, invite them and grow together.' },
  { id: 'ask', color: 'var(--pink)', title: ['Just ', 'say it'], text: 'Speak or type one sentence, like “Find VPs from my college in Mumbai”. No filters, no forms.' },
  { id: 'agents', color: 'var(--green)', title: ['Agents do the ', 'busywork'], text: 'AI agents search LinkedIn and the web, fill your data lake and prepare every invite for you to approve.' },
]

function Art({ id }) {
  if (id === 'welcome') {
    return (
      <>
        <div className="ob-emoji">🎓</div>
        <span className="chip c1">🎓 Alumni verified</span>
        <span className="chip c2">🗄️ Central data lake</span>
        <span className="chip c3">💬 ✉️ in</span>
      </>
    )
  }
  if (id === 'ask') {
    return (
      <div className="ob-chat">
        <div className="bubble me">Find VPs from my college in Mumbai 🎙️</div>
        <div className="bubble ai">Found 38 alumni. Review the invite before it goes out.</div>
      </div>
    )
  }
  return (
    <div className="ob-chat">
      <div className="bubble ai ok">✓ 38 added to data lake</div>
      <div className="bubble ai">✉️ Invite ready for your approval</div>
      <div className="bubble ai ok">💬 12 joined the app</div>
    </div>
  )
}

export default function Welcome() {
  const nav = useNavigate()
  const [i, setI] = useState(0)
  const x0 = useRef(null)
  const last = i === SLIDES.length - 1
  const s = SLIDES[i]

  const finish = () => {
    localStorage.setItem('al_seen', '1')
    nav('/login', { replace: true })
  }
  const next = () => (last ? finish() : setI(i + 1))

  const onTouchEnd = (e) => {
    if (x0.current == null) return
    const dx = e.changedTouches[0].clientX - x0.current
    x0.current = null
    if (dx < -50 && !last) setI(i + 1)
    if (dx > 50 && i > 0) setI(i - 1)
  }

  return (
    <div className="mob ob" onTouchStart={(e) => { x0.current = e.touches[0].clientX }} onTouchEnd={onTouchEnd}>
      <div className="ob-top">
        {!last ? <button className="ob-skip" onClick={finish}>Skip</button> : <span />}
      </div>

      <div className="ob-art" style={{ '--c': s.color }} key={s.id}>
        <div className="ob-blob" />
        <Art id={s.id} />
      </div>

      <div className="ob-copy" key={s.id + '-t'}>
        <h1>{s.title[0]}<em>{s.title[1]}</em></h1>
        <p>{s.text}</p>
      </div>

      <div className="ob-foot">
        <div className="ob-dots">
          {SLIDES.map((_, n) => (
            <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} />
          ))}
        </div>
        <button className="btn orange ob-next" onClick={next}>{last ? 'Get Started' : 'Next'}</button>
      </div>
    </div>
  )
}