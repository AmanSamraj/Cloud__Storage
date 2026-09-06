import { useEffect, useState } from 'react'
import { createShare, listShares, revokeShare, updateShare } from '../api/shares'

function ShareModal({ resource, onClose }) {
  const [shares, setShares] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function loadShares() {
    setLoading(true)
    try {
      const result = await listShares(resource.resourceType, resource.resourceId)
      setShares(result.shares)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadShares() }, [resource.resourceId, resource.resourceType])

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await createShare({ resourceType: resource.resourceType, resourceId: resource.resourceId, granteeEmail: email, role })
      setEmail('')
      await loadShares()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(shareId, nextRole) {
    try {
      await updateShare(shareId, nextRole)
      await loadShares()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function removeShare(shareId) {
    try {
      await revokeShare(shareId)
      setShares((current) => current.filter((share) => share.id !== shareId))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="share-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Access control</p><h2 className="mt-2 truncate font-display text-2xl font-bold text-ink">Share {resource.name}</h2></div><button className="share-close" onClick={onClose} type="button">&#10005;</button></div>
        <form className="share-form mt-6" onSubmit={handleSubmit}><input onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" required type="email" value={email} /><select onChange={(event) => setRole(event.target.value)} value={role}><option value="viewer">Viewer</option><option value="editor">Editor</option></select><button disabled={busy} type="submit">{busy ? 'Adding...' : 'Share'}</button></form>
        {error && <p className="mt-3 text-sm text-coral">{error}</p>}
        <div className="mt-7"><p className="eyebrow">People with access</p>{loading ? <p className="mt-4 text-sm text-muted">Loading access list...</p> : shares.length === 0 ? <p className="mt-4 text-sm text-muted">Only you have access right now.</p> : <div className="share-list mt-3">{shares.map((share) => <div className="share-row" key={share.id}><div className="share-avatar">{(share.user?.display_name || share.user?.email || '?').slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{share.user?.display_name || share.user?.email}</p><p className="truncate text-xs text-muted">{share.user?.email}</p></div><select aria-label={`Role for ${share.user?.email}`} onChange={(event) => changeRole(share.id, event.target.value)} value={share.role}><option value="viewer">Viewer</option><option value="editor">Editor</option></select><button className="revoke-button" onClick={() => removeShare(share.id)} type="button">Revoke</button></div>)}</div>}</div>
      </section>
    </div>
  )
}

export default ShareModal
