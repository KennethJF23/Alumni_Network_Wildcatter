import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../api'

export default function Splash() {
  const nav = useNavigate()

  const go = () =>
    nav(getToken() ? '/app/dashboard' : localStorage.getItem('al_seen') ? '/login' : '/welcome', { replace: true })

  useEffect(() => {
    const t = setTimeout(go, 2000)
    return () => clearTimeout(t)
    // eslint-disable-next-line
  }, [])

  return (
    <div className="splash" onClick={go} onKeyDown={go} role="button" tabIndex={0} aria-label="Continue">
      <i className="sp-blob a" /><i className="sp-blob b" /><i className="sp-blob c" />
      <div className="sp-center">
        <div className="sp-icon">🎓</div>
        <h1>Alumni<b>Loop</b></h1>
        <p>Ask. Connect. Grow.</p>
      </div>
      <div className="sp-bar"><i /></div>
    </div>
  )
}