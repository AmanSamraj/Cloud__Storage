const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Authentication request failed')
  return body
}

export async function getCurrentUser() {
  try {
    return (await request('/auth/me')).user
  } catch (error) {
    if (error.message === 'Authentication required' || error.message.includes('token')) return null
    throw error
  }
}

export function login(email, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function register(email, password, displayName) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
