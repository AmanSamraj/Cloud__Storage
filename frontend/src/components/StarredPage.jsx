import { useEffect, useState } from 'react'
import Icon from './Icon'
import StarButton from './StarButton'
import { getStarredItems } from '../api/stars'

function StarredPage({
  onBackToDrive,
  onOpenFolder,
  onDownloadFile,
  onShare,
  onPublicLink,
  onFileContextMenu,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState('grid')
  const [sortBy, setSortBy] = useState('updated_at')

  async function loadStarred() {
    setLoading(true)
    setError('')
    try {
      const data = await getStarredItems()
      setItems(data.items || [])
    } catch (err) {
      setError(err.message || 'Failed to load starred items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStarred()
  }, [])

  function handleUnstar(item) {
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.resourceType === item.resourceType)))
  }

  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name)
    if (sortBy === 'size') return ((b.sizeBytes || 0) - (a.sizeBytes || 0))
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div className="starred-page animate-fadeIn">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
              <span className="text-xl">★</span>
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Starred</h1>
              <p className="text-xs text-muted">
                {loading
                  ? 'Loading starred items...'
                  : `${items.length} ${items.length === 1 ? 'starred item' : 'starred items'}`}
              </p>
            </div>
          </div>
        </div>

        {/* View & Sort Controls */}
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-1.5 text-xs font-medium text-ink outline-none focus:border-[#e4674e]"
            onChange={(e) => setSortBy(e.target.value)}
            value={sortBy}
          >
            <option value="updated_at">Last modified</option>
            <option value="name">Name</option>
            <option value="size">Size</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              className={`rounded-lg p-1.5 text-xs font-bold ${
                view === 'grid' ? 'bg-[#252422] text-white' : 'bg-[#f4f0e9] text-ink'
              }`}
              onClick={() => setView('grid')}
              title="Grid view"
              type="button"
            >
              ☷
            </button>
            <button
              className={`rounded-lg p-1.5 text-xs font-bold ${
                view === 'list' ? 'bg-[#252422] text-white' : 'bg-[#f4f0e9] text-ink'
              }`}
              onClick={() => setView('list')}
              title="List view"
              type="button"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner mt-6">{error}</div>}

      {/* Content */}
      <div className="mt-8">
        {loading ? (
          <div className="empty-state py-16">
            <p className="text-sm text-muted">Loading your starred items...</p>
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="empty-state py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-400">
              <span className="text-3xl">★</span>
            </div>
            <p className="mt-4 font-display text-lg font-bold text-ink">No starred items yet</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Add stars to things that you want to easily find later. Click the star icon on any file or folder to star it.
            </p>
            <button className="auth-submit mt-6 max-w-[160px]" onClick={onBackToDrive} type="button">
              Browse My Drive
            </button>
          </div>
        ) : view === 'list' ? (
          /* List View */
          <div className="file-list overflow-hidden rounded-xl border border-[#e7e1d8] bg-[#fbfaf7]">
            {sortedItems.map((item) => (
              <div
                className="file-list-row group flex items-center justify-between gap-4 p-3 transition hover:bg-[#f5f1ea]"
                key={`${item.resourceType}-${item.id}`}
                onContextMenu={(e) => {
                  if (item.resourceType === 'file' && onFileContextMenu) {
                    onFileContextMenu(e, item)
                  }
                }}
              >
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                  onClick={() => {
                    if (item.resourceType === 'folder' && onOpenFolder) onOpenFolder(item)
                    else if (item.resourceType === 'file' && onDownloadFile) onDownloadFile(item)
                  }}
                >
                  <StarButton
                    isStarred={true}
                    onToggle={(starred) => !starred && handleUnstar(item)}
                    resourceId={item.id}
                    resourceType={item.resourceType}
                  />

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
                    <p className="truncate text-sm font-bold text-ink group-hover:text-coral">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted">
                      {item.resourceType === 'folder'
                        ? 'Folder'
                        : `${formatType(item.mimeType)} · ${formatBytes(item.sizeBytes)}`}{' '}
                      · Modified {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <span className="text-xs text-muted">
                    {item.isOwner ? 'You' : item.owner?.displayName || item.owner?.email}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {item.resourceType === 'folder' ? (
                    <button
                      className="list-action rounded-md bg-[#eee9e1] px-2.5 py-1 text-xs font-semibold text-ink hover:bg-[#e4ddd3]"
                      onClick={() => onOpenFolder && onOpenFolder(item)}
                      type="button"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      className="list-action rounded-md bg-[#eee9e1] px-2.5 py-1 text-xs font-semibold text-ink hover:bg-[#e4ddd3]"
                      onClick={() => onDownloadFile && onDownloadFile(item)}
                      type="button"
                    >
                      Download
                    </button>
                  )}
                  {item.resourceType === 'file' && (
                    <button
                      className="list-action hidden rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-ink md:block"
                      onClick={() => onPublicLink && onPublicLink(item)}
                      type="button"
                    >
                      Public Link
                    </button>
                  )}
                  <button
                    className="list-action hidden rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-ink sm:block"
                    onClick={() => onShare && onShare(item, item.resourceType)}
                    type="button"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grid View */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedItems.map((item) => (
              <div
                className="group relative flex flex-col justify-between rounded-xl border border-[#e5ded4] bg-[#fbfaf7] p-4 shadow-sm transition hover:shadow-md"
                key={`${item.resourceType}-${item.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="shrink-0">
                    {item.resourceType === 'folder' ? (
                      <div className="folder-icon folder-coral">
                        <Icon name="folder" size={22} />
                      </div>
                    ) : (
                      <div className="file-badge file-blue text-xs">
                        {item.mimeType?.split('/').pop()?.slice(0, 4)?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                  </div>
                  <StarButton
                    isStarred={true}
                    onToggle={(starred) => !starred && handleUnstar(item)}
                    resourceId={item.id}
                    resourceType={item.resourceType}
                  />
                </div>

                <div
                  className="mt-4 cursor-pointer"
                  onClick={() => {
                    if (item.resourceType === 'folder' && onOpenFolder) onOpenFolder(item)
                    else if (item.resourceType === 'file' && onDownloadFile) onDownloadFile(item)
                  }}
                >
                  <p className="truncate font-display text-sm font-bold text-ink group-hover:text-coral">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.resourceType === 'folder'
                      ? 'Folder'
                      : `${formatType(item.mimeType)} · ${formatBytes(item.sizeBytes)}`}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#eee9e1] pt-3 text-xs text-muted">
                  <span className="truncate">
                    {item.isOwner ? 'Owned by you' : item.owner?.displayName || item.owner?.email}
                  </span>
                  {item.resourceType === 'folder' ? (
                    <button
                      className="font-bold text-coral hover:underline"
                      onClick={() => onOpenFolder && onOpenFolder(item)}
                      type="button"
                    >
                      Open →
                    </button>
                  ) : (
                    <button
                      className="font-bold text-coral hover:underline"
                      onClick={() => onDownloadFile && onDownloadFile(item)}
                      type="button"
                    >
                      Download
                    </button>
                  )}
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
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
}

export default StarredPage
