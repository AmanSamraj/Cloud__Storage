import { useState } from 'react'
import { login, register } from '../api/auth'

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const result = mode === 'login'
        ? await login(form.email, form.password)
        : await register(form.email, form.password, form.displayName)
      onAuthenticated(result.user)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-lockup"><div className="brand-mark">f</div><span className="font-display text-2xl font-bold text-ink">folio</span></div>
        <p className="eyebrow mt-12">Private workspace</p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.04em] text-ink">Your files, in one place.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Sign in to continue to your personal cloud drive.</p>

        <div className="auth-tabs mt-8"><button className={mode === 'login' ? 'auth-tab-active' : ''} onClick={() => { setMode('login'); setError('') }} type="button">Log in</button><button className={mode === 'register' ? 'auth-tab-active' : ''} onClick={() => { setMode('register'); setError('') }} type="button">Create account</button></div>
        <form className="mt-6" onSubmit={handleSubmit}>
          {mode === 'register' && <label className="auth-label">Name<input className="auth-input" name="displayName" onChange={updateField} placeholder="Your name" required value={form.displayName} /></label>}
          <label className="auth-label">Email<input className="auth-input" name="email" onChange={updateField} placeholder="you@example.com" required type="email" value={form.email} /></label>
          <label className="auth-label mt-4">Password<input className="auth-input" minLength="8" name="password" onChange={updateField} placeholder="At least 8 characters" required type="password" value={form.password} /></label>
          {error && <p className="mt-3 text-sm text-coral">{error}</p>}
          <button className="auth-submit mt-6" disabled={busy} type="submit">{busy ? 'Please wait...' : mode === 'login' ? 'Log in to folio' : 'Create my account'}</button>
        </form>
      </section>
    </main>
  )
}

export default AuthPage
