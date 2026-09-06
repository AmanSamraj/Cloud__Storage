import { useMemo, useState } from 'react'

function MoveFolderDialog({ folders, movingFolder, onClose, onSubmit }) {
  const [parentId, setParentId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = useMemo(
    () => folders.filter((folder) => folder.id !== movingFolder.id),
    [folders, movingFolder.id],
  )

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(parentId || null)
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
        <p className="eyebrow">Move folder</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink">Move {movingFolder.name}</h2>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[0.14em] text-muted" htmlFor="destination-folder">Destination</label>
        <select className="dialog-input mt-2" id="destination-folder" onChange={(event) => setParentId(event.target.value)} value={parentId}>
          <option value="">My Drive (root)</option>
          {options.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        <div className="mt-7 flex justify-end gap-2">
          <button className="dialog-cancel" onClick={onClose} type="button">Cancel</button>
          <button className="dialog-confirm" disabled={busy} type="submit">{busy ? 'Moving...' : 'Move folder'}</button>
        </div>
      </form>
    </div>
  )
}

export default MoveFolderDialog
