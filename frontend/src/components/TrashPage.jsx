import { useEffect, useState } from 'react'
import Icon from './Icon'
import { emptyTrash, getTrashItems, permanentDeleteItem, restoreTrashItem } from '../api/trash'

function TrashPage({ onBackToDrive, onFolderRestored }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function loadTrash() {
    setLoading(true)
    setError('')
    try {
      const data = await getTrashItems()
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load trash items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTrash()
  }, [])

  async function handleRestore(item) {
    setBusyId(item.id)
    setError('')
    setSuccessMessage('')
    try {
      await restoreTrashItem(item.resourceType, item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSuccessMessage(`"${item.name}" has been restored to your drive.`)
      if (onFolderRestored) onFolderRestored(item)
    } catch (err) {
      setError(err.message || 'Failed to restore item')
    } finally {
      setBusyId(null)
    }
  }

  async function handlePermanentDelete(item) {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`,
      )
    ) {
      return
    }

    setBusyId(item.id)
    setError('')
    setSuccessMessage('')
    try {
      await permanentDeleteItem(item.resourceType, item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setSuccessMessage(`"${item.name}" was permanently deleted.`)
    } catch (err) {
      setError(err.message || 'Failed to permanently delete item')
    } finally {
      setBusyId(null)
    }
  }

  async function handleEmptyTrash() {
    if (
      !window.confirm(
        'Are you sure you want to empty the trash? All items will be permanently deleted and cannot be recovered.',
      )
    ) {
      return
    }

    setLoading(true)
    setError('')
    setSuccessMessage('')
    try {
      await emptyTrash()
      setItems([])
      setSuccessMessage('Trash emptied successfully.')
    } catch (err) {
      setError(err.message || 'Failed to empty trash')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="trash-page animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e1] pb-5">
        <div>
          <button
            className="text-xs font-bold text-muted hover:text-ink"
            onClick={onBackToDrive}
            type="button"
          >
            ← Back to My Drive
          </button>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fceded] text-[#d06450]">
              <Icon name="trash" size={20} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Trash</h1>
              <p className="text-xs text-muted">
                {loading
                  ? 'Loading...'
                  : `${items.length} ${items.length === 1 ? 'item' : 'items'} in trash`}
              </p>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <button
            className="rounded-lg border border-[#e8c7c1] bg-[#fff5f3] px-4 py-2 text-xs font-bold text-[#c65440] transition hover:bg-[#fae7e4]"
            onClick={handleEmptyTrash}
            type="button"
          >
            Empty Trash
          </button>
        )}
      </div>

      {/* Info notice */}
      <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-[#e8e2d8] bg-[#fbfaf7] px-4 py-3 text-xs text-[#777169]">
        <span>ℹ</span>
        <span>
          Items in trash can be restored anytime or permanently deleted. Trashed items do not appear in your active drive or search results.
        </span>
      </div>

      {/* Alerts */}
      {error && <div className="error-banner mt-4">{error}</div>}
      {successMessage && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[#c3dfcf] bg-[#f0f9f4] px-4 py-2.5 text-xs font-semibold text-[#285d4e]">
          <span>✓ {successMessage}</span>
          <button
            className="text-muted hover:text-ink"
            onClick={() => setSuccessMessage('')}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="mt-6">
        {loading ? (
          <div className="empty-state py-16">
            <p className="text-sm text-muted">Loading trash...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f2eee8] text-muted">
              <Icon name="trash" size={28} />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-ink">Your trash is empty</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              When you delete files or folders, they will appear here so you can easily restore them if needed.
            </p>
            <button className="auth-submit mt-6 max-w-[160px]" onClick={onBackToDrive} type="button">
              Go to My Drive
            </button>
          </div>
        ) : (
          <div className="file-list overflow-hidden rounded-xl border border-[#e7e1d8] bg-[#fbfaf7]">
            {/* Table Header */}
            <div className="hidden border-b border-[#eee9e1] bg-[#f7f4ee] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted sm:grid sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-5">Name</div>
              <div className="sm:col-span-2">Type</div>
              <div className="sm:col-span-2">Deleted Date</div>
              <div className="text-right sm:col-span-3">Actions</div>
            </div>

            {/* Trashed Item Rows */}
            {items.map((item) => (
              <div
                className="file-list-row flex flex-col gap-3 p-4 transition hover:bg-[#f6f2eb] sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 sm:p-3.5"
                key={`${item.resourceType}-${item.id}`}
              >
                {/* Name Column */}
                <div className="flex min-w-0 items-center gap-3 sm:col-span-5">
                  <div className="shrink-0">
                    {item.resourceType === 'folder' ? (
                      <div className="folder-icon compact folder-coral">
                        <Icon name="folder" size={16} />
                      </div>
                    ) : (
                      <div className="file-badge file-blue text-xs">
                        {item.mimeType?.split('/').pop()?.slice(0, 4)?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[11px] text-muted sm:hidden">
                      {item.resourceType === 'folder'
                        ? 'Folder'
                        : `${formatType(item.mimeType)} · ${formatBytes(item.sizeBytes)}`}{' '}
                      · Deleted {formatDate(item.deletedAt)}
                    </p>
                  </div>
                </div>

                {/* Type Column */}
                <div className="hidden text-xs text-muted sm:col-span-2 sm:block">
                  {item.resourceType === 'folder' ? (
                    <span className="inline-flex rounded-md bg-[#eee9e1] px-2 py-0.5 font-medium text-ink">
                      Folder
                    </span>
                  ) : (
                    <span>
                      {formatType(item.mimeType)} · {formatBytes(item.sizeBytes)}
                    </span>
                  )}
                </div>

                {/* Deleted Date Column */}
                <div className="hidden text-xs text-muted sm:col-span-2 sm:block">
                  {formatDate(item.deletedAt)}
                </div>

                {/* Actions Column */}
                <div className="flex items-center justify-end gap-2 sm:col-span-3">
                  <button
                    className="flex items-center gap-1.5 rounded-lg border border-[#c3dfcf] bg-[#f0f9f4] px-3 py-1.5 text-xs font-bold text-[#285d4e] transition hover:bg-[#e2f3e9] disabled:opacity-50"
                    disabled={busyId === item.id}
                    onClick={() => handleRestore(item)}
                    title="Restore item to your drive"
                    type="button"
                  >
                    <span>↺</span>
                    <span>{busyId === item.id ? 'Restoring...' : 'Restore'}</span>
                  </button>

                  <button
                    className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-bold text-[#c65440] transition hover:border-[#f3d3cb] hover:bg-[#fff5f3] disabled:opacity-50"
                    disabled={busyId === item.id}
                    onClick={() => handlePermanentDelete(item)}
                    title="Permanently delete item"
                    type="button"
                  >
                    Delete forever
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

function formatType(mimeType = '') {
  if (!mimeType) return 'File'
  return mimeType.split('/').pop().split('.').pop().toUpperCase()
}

function formatDate(value) {
  if (!value) return 'Unknown'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default TrashPage
