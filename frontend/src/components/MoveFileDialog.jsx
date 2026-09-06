import { useState } from 'react'

function MoveFileDialog({ file, folders, onClose, onSubmit }) {
  const [folderId, setFolderId] = useState(file.folder_id || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSubmit(folderId || null)
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
        <p className="eyebrow">Move file</p>
        <h2 className="mt-2 truncate font-display text-2xl font-bold text-ink">{file.name}</h2>
        <label className="mt-6 block text-xs font-bold uppercase tracking-[0.14em] text-muted" htmlFor="file-destination">Destination folder</label>
        <select className="dialog-input mt-2" id="file-destination" onChange={(event) => setFolderId(event.target.value)} value={folderId}>
          <option value="">My Drive (root)</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        {error && <p className="mt-2 text-sm text-coral">{error}</p>}
        <div className="mt-7 flex justify-end gap-2"><button className="dialog-cancel" onClick={onClose} type="button">Cancel</button><button className="dialog-confirm" disabled={busy} type="submit">{busy ? 'Moving...' : 'Move file'}</button></div>
      </form>
    </div>
  )
}

export default MoveFileDialog
