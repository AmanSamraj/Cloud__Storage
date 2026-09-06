import { useState } from 'react'
import { createLinkShare, revokeLinkShare } from '../api/linkShares'

function PublicLinkModal({ onClose, resource }) {
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdLink, setCreatedLink] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const result = await createLinkShare({
        resourceType: 'file',
        resourceId: resource.id,
        password: password || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      })
      setCreatedLink(result.link)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(createdLink.url)
    setCopied(true)
  }

  async function revokeLink() {
    try {
      await revokeLinkShare(createdLink.id)
      onClose()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="share-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Public access</p><h2 className="mt-2 truncate font-display text-2xl font-bold text-ink">Share {resource.name}</h2></div><button className="share-close" onClick={onClose} type="button">&#10005;</button></div>
        {!createdLink ? <form className="mt-7" onSubmit={handleCreate}><label className="auth-label">Optional password<input className="auth-input" minLength="8" onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" value={password} /></label><label className="auth-label mt-4">Optional expiry<input className="auth-input" onChange={(event) => setExpiresAt(event.target.value)} type="datetime-local" value={expiresAt} /></label>{error && <p className="mt-3 text-sm text-coral">{error}</p>}<button className="auth-submit mt-6" disabled={busy} type="submit">{busy ? 'Creating...' : 'Generate public link'}</button></form> : <div className="mt-7"><p className="text-sm text-muted">Anyone with this link can view and download this file until it expires.</p><div className="public-link-box mt-4">{createdLink.url}</div><div className="mt-3 flex gap-2"><button className="dialog-confirm" onClick={copyLink} type="button">{copied ? 'Copied' : 'Copy link'}</button><button className="dialog-cancel" onClick={revokeLink} type="button">Revoke link</button></div></div>}
        {!createdLink && <button className="dialog-cancel mt-3 w-full" onClick={onClose} type="button">Cancel</button>}
      </section>
    </div>
  )
}

export default PublicLinkModal
