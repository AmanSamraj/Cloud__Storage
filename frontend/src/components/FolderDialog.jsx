import { useState } from 'react'

function FolderDialog({ title, confirmLabel, initialName = '', onClose, onSubmit }) {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (!name.trim()) return setError('Enter a folder name')

    setBusy(true)
    setError('')
    try {
      await onSubmit(name.trim())
      onClose()
    } catch (submitError) {
      setError(submitError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="dialog-card" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <p className="eyebrow">Folder action</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink">{title}</h2>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[0.14em] text-muted" htmlFor="folder-name">Folder name</label>
        <input autoFocus className="dialog-input mt-2" id="folder-name" onChange={(event) => setName(event.target.value)} value={name} />
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        <div className="mt-7 flex justify-end gap-2">
          <button className="dialog-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="dialog-confirm" disabled={busy} type="submit">{busy ? 'Working...' : confirmLabel}</button>
        </div>
      </form>
    </div>
  )
}

export default FolderDialog
