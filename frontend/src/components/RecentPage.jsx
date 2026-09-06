import { useEffect, useState } from 'react'
import Icon from './Icon'
import StarButton from './StarButton'
import { getRecentItems } from '../api/recent'

function RecentPage({
  onBackToDrive,
  onOpenFolder,
  onDownloadFile,
  onShare,
  onPublicLink,
  onFileContextMenu,
}) {
  const [data, setData] = useState({ items: [], groups: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadRecent() {
    setLoading(true)
    setError('')
    try {
      const result = await getRecentItems(50)
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load recent items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecent()
  }, [])

  return (
    <div className="recent-page animate-fadeIn">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
              <Icon name="clock" size={20} />
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Recent</h1>
              <p className="text-xs text-muted">
                {loading
                  ? 'Loading recent items...'
                  : `${data.items?.length || 0} recently accessed or modified files & folders`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="error-banner mt-6">{error}</div>}

      {/* Content */}
      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="empty-state py-16">
            <p className="text-sm text-muted">Loading recent files...</p>
          </div>
        ) : !data.groups || data.groups.length === 0 ? (
          <div className="empty-state py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-400">
              <Icon name="clock" size={28} />
            </div>
            <p className="mt-4 font-display text-lg font-bold text-ink">No recent activity</p>
            <p className="mt-1 max-w-sm text-xs text-muted">
              Files you upload, create, or update will show up here organized by date.
            </p>
            <button className="auth-submit mt-6 max-w-[160px]" onClick={onBackToDrive} type="button">
              Upload Files
            </button>
          </div>
        ) : (
          data.groups.map((group) => (
            <section key={group.title}>
              <h2 className="mb-3 font-display text-base font-bold text-ink">{group.title}</h2>
              <div className="file-list overflow-hidden rounded-xl border border-[#e7e1d8] bg-[#fbfaf7]">
                {group.items.map((item) => (
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
                        isStarred={item.isStarred}
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
            </section>
          ))
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
  const date = new Date(value)
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default RecentPage
