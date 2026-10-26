import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api, setAuth, getToken } from '../api'

export default function Auth({ mode }) {
  const signup = mode === 'signup'
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (getToken()) return <Navigate to="/app/dashboard" replace />

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const data = await api(signup ? '/auth/signup' : '/auth/login', {
        method: 'POST',
        body: signup ? f : { email: f.email, password: f.password },
      })
      setAuth(data)
      nav('/app/dashboard')
    } catch (e2) {
      setErr(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-blob a" />
      <div className="auth-blob b" />
      <form className="auth-card" onSubmit={submit}>
        <div className="logo"><span>🎓</span> Alumni<b>Loop</b></div>
        <h1>{signup ? 'Create your account' : 'Welcome back'}</h1>
        <p>{signup ? 'Start building your alumni network.' : 'Log in to your dashboard.'}</p>

        {signup && <input className="d-in" placeholder="Full name" value={f.name} onChange={set('name')} required />}
        <input className="d-in" type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
        <input className="d-in" type="password" placeholder="Password (min 6 characters)" value={f.password} onChange={set('password')} required />

        {err && <div className="d-err">{err}</div>}
        <button className="btn orange" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}</button>

        <small>
          {signup ? 'Already have an account? ' : 'New here? '}
          <Link to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Sign up'}</Link>
        </small>
      </form>
    </div>
  )
}