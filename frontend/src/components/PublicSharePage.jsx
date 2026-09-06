import { useEffect, useState } from 'react'
import { getPublicLink } from '../api/linkShares'

function PublicSharePage({ token }) {
  const [file, setFile] = useState(null)
  const [password, setPassword] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function loadFile(nextPassword = '') {
    if (nextPassword) {
      setBusy(true)
    } else {
      setLoading(true)
    }
    setError('')
    try {
      const result = await getPublicLink(token, nextPassword)
      setFile(result)
      setNeedsPassword(false)
    } catch (requestError) {
      setNeedsPassword(requestError.status === 401)
      setError(requestError.message)
    } finally {
      setLoading(false)
      setBusy(false)
    }
  }

  useEffect(() => { loadFile() }, [token])

  return (
    <main className="public-share-page">
      <section className="public-share-card">
        <div className="brand-lockup">
          <div className="brand-mark">f</div>
          <span className="font-display text-2xl font-bold text-ink">folio</span>
        </div>
        {loading ? (
          <p className="mt-10 text-sm text-muted">Checking public link...</p>
        ) : file ? (
          <>
            <p className="eyebrow mt-10">Public file share</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="public-file-icon">
                {file.file.mimeType?.split('/')[1]?.slice(0, 4)?.toUpperCase() || 'FILE'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-xl font-bold text-ink" title={file.file.name}>{file.file.name}</h1>
                <p className="text-xs text-muted">{file.file.mimeType} · {formatBytes(file.file.sizeBytes)}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              <a
                className="auth-submit flex items-center justify-center gap-2 text-center"
                href={file.url}
                download={file.file.name}
              >
                Download file
              </a>
            </div>
            <p className="mt-4 text-center text-xs text-muted">Direct download link is securely signed and valid for {file.expiresIn}s.</p>
          </>
        ) : needsPassword ? (
          <form className="mt-10" onSubmit={(event) => { event.preventDefault(); loadFile(password) }}>
            <h1 className="font-display text-2xl font-bold text-ink">Password required</h1>
            <p className="mt-1 text-sm text-muted">This file is password protected. Enter the password to unlock.</p>
            <input
              autoFocus
              className="auth-input mt-5"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              value={password}
            />
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
            <button className="auth-submit mt-4" disabled={busy} type="submit">{busy ? 'Verifying...' : 'Unlock file'}</button>
          </form>
        ) : (
          <div className="mt-10">
            <h1 className="font-display text-2xl font-bold text-ink">Link unavailable</h1>
            <p className="mt-2 text-sm text-coral">{error || 'This link may have expired or been revoked by the owner.'}</p>
          </div>
        )}
      </section>
    </main>
  )
}

function formatBytes(bytes = 0) {
  if (!bytes) return 'Empty file'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export default PublicSharePage

