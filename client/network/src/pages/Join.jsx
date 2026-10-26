import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'

export default function Join() {
  const { id } = useParams()
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [prompt, setPrompt] = useState(null) // browser install prompt
  const [installed, setInstalled] = useState(false)

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone

  useEffect(() => {
    api(`/alumni/join/${id}`)
      .then((d) => {
        setInfo(d)
        setDone(d.joined)
      })
      .catch((e) => setErr(e.message))
  }, [id])

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const accept = async () => {
    setBusy(true)
    setErr('')
    try {
      await api(`/alumni/join/${id}/accept`, { method: 'POST', body: phone.trim() ? { phone: phone.trim() } : {} })
      setDone(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const install = async () => {
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  const first = (info?.name || '').split(' ')[0]

  return (
    <div className="auth-wrap">
      <div className="auth-blob a" />
      <div className="auth-blob b" />
      <div className="auth-card">
        <div className="logo"><span>🎓</span> Alumni<b>Loop</b></div>

        {!info && !err && <p><i className="spin" /> Loading your invite…</p>}

        {!info && err && (
          <>
            <h1>Invite not found</h1>
            <p>This link may be old or incorrect.</p>
            <Link to="/home" className="btn ghost">Visit AlumniLoop</Link>
          </>
        )}

        {info && !done && (
          <>
            <h1>Hi {first}, join the {info.college} alumni network</h1>
            <p>Find batchmates, share referrals and mentor juniors. It's free.</p>
            {!info.hasPhone && (
              <input
                className="d-in"
                type="tel"
                placeholder="Mobile number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
            {err && <div className="d-err">{err}</div>}
            <button className="btn orange" disabled={busy} onClick={accept}>
              {busy ? 'Joining…' : 'Join the network'}
            </button>
          </>
        )}

        {info && done && (
          <>
            <h1>You're in, {first} 🎉</h1>
            <p>Welcome to the {info.college} alumni network. Get the app on your device to find batchmates and invite others.</p>

            {standalone || installed ? (
              <Link to="/signup" className="btn orange">Open the app</Link>
            ) : prompt ? (
              <button className="btn orange" onClick={install}>⬇️ Install the app</button>
            ) : isIOS ? (
              <div className="jn-note">
                <b>Add to Home Screen</b>
                <ol>
                  <li>Tap the Share button in Safari</li>
                  <li>Choose “Add to Home Screen”</li>
                </ol>
              </div>
            ) : (
              <div className="jn-note">
                Look for the install icon ⊕ in the address bar, or open the browser menu and choose “Install app”.
              </div>
            )}

            <Link to="/signup" className="btn ghost">Create your account</Link>
            <small><Link to="/login">I already have an account</Link></small>
          </>
        )}
      </div>
    </div>
  )
}