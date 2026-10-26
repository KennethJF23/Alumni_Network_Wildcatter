const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const getToken = () => localStorage.getItem('al_token')
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('al_user')) } catch { return null }
}
export const setAuth = ({ token, user }) => {
  localStorage.setItem('al_token', token)
  localStorage.setItem('al_user', JSON.stringify(user))
}
export const logout = () => {
  localStorage.removeItem('al_token')
  localStorage.removeItem('al_user')
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && getToken()) {
    logout()
    window.location.href = '/login'
  }
  if (!res.ok) throw new Error(data.error || data.details || `Request failed (${res.status})`)
  return data
}