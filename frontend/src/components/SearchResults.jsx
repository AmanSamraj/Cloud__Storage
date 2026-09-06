import { useEffect, useState } from 'react'
import Icon from './Icon'
import { searchResources, toggleStar } from '../api/search'

const FILE_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'folder', label: 'Folders' },
  { value: 'file', label: 'All files' },
  { value: 'document', label: 'Documents & PDFs' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'code', label: 'Code & Data' },
  { value: 'archive', label: 'Archives (ZIP, TAR)' },
]

const OWNER_OPTIONS = [
  { value: 'all', label: 'Anyone' },
  { value: 'me', label: 'Owned by me' },
  { value: 'shared', label: 'Shared with me' },
]

const SORT_OPTIONS = [
  { value: 'updated_at', label: 'Last modified' },
  { value: 'name', label: 'Name' },
  { value: 'created_at', label: 'Date created' },
  { value: 'size_bytes', label: 'File size' },
]

function SearchResults({
  initialParams = {},
  onOpenFolder,
  onDownloadFile,
  onShare,
  onPublicLink,
  onFileContextMenu,
  onClose,
}) {
  const [query, setQuery] = useState(initialParams.q || '')
  const [type, setType] = useState(initialParams.type || 'all')
  const [owner, setOwner] = useState(initialParams.owner || 'all')
  const [starredOnly, setStarredOnly] = useState(Boolean(initialParams.starred))
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [limit] = useState(15)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ results: [], pagination: { total: 0, totalPages: 1, page: 1 } })
  const [error, setError] = useState('')
  const [view, setView] = useState('list') // 'list' or 'grid'

  async function performSearch(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const response = await searchResources({
        q: query.trim(),
        type,
        owner,
        starred: starredOnly ? 'true' : undefined,
        sortBy,
        sortOrder,
        page: targetPage,
        limit,
      })
      setData(response)
      setPage(response.pagination?.page || targetPage)
    } catch (err) {
      setError(err.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  // Trigger search when any filter, sorting, or initial query changes
  useEffect(() => {
    performSearch(1)
  }, [type, owner, starredOnly, sortBy, sortOrder])

  function handleSearchSubmit(event) {
    event.preventDefault()
    performSearch(1)
  }

  function handleResetFilters() {
    setQuery('')
    setType('all')
    setOwner('all')
    setStarredOnly(false)
    setSortBy('updated_at')
    setSortOrder('desc')
  }

  async function handleToggleStar(event, item) {
    event.stopPropagation()
    const nextStarState = !item.isStarred
    // Optimistic update
    setData((prev) => ({
      ...prev,
      results: prev.results.map((r) =>
        r.id === item.id && r.resourceType === item.resourceType
          ? { ...r, isStarred: nextStarState }
          : r,
      ),
    }))

    try {
      await toggleStar(item.resourceType, item.id, nextStarState)
    } catch (err) {
      console.error('Failed to toggle star:', err)
      // Rollback on failure
      setData((prev) => ({
        ...prev,
        results: prev.results.map((r) =>
          r.id === item.id && r.resourceType === item.resourceType
            ? { ...r, isStarred: !nextStarState }
            : r,
        ),
      }))
    }
  }

  return (
    <div className="search-results-page">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eee9e1] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg p-1.5 text-muted hover:bg-[#f2eee8] hover:text-ink"
              onClick={onClose}
              title="Back to drive"
              type="button"
            >
              ← Back to drive
            </button>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
            {query ? `Search results for "${query}"` : 'Search & Filter Files'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading
              ? 'Searching...'
              : `Found ${data.pagination?.total || 0} matching ${
                  data.pagination?.total === 1 ? 'item' : 'items'
                }`}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            className={`rounded-lg p-2 ${view === 'list' ? 'bg-[#252422] text-white' : 'bg-[#f4f0e9] text-ink'}`}
            onClick={() => setView('list')}
            title="List view"
            type="button"
          >
            ☰ List
          </button>
          <button
            className={`rounded-lg p-2 ${view === 'grid' ? 'bg-[#252422] text-white' : 'bg-[#f4f0e9] text-ink'}`}
            onClick={() => setView('grid')}
            title="Grid view"
            type="button"
          >
            ☷ Grid
          </button>
        </div>
      </div>

      {/* Interactive Filter Bar */}
      <div className="search-filters-bar mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#e5ded4] bg-[#fbfaf7] p-4">
        {/* Search Input in bar */}
        <form className="flex min-w-[200px] flex-1 items-center gap-2" onSubmit={handleSearchSubmit}>
          <input
            className="w-full rounded-lg border border-[#ddd6cc] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#e4674e]"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by file or folder name..."
            type="search"
            value={query}
          />
          <button
            className="rounded-lg bg-[#252422] px-4 py-2 text-xs font-bold text-white transition hover:bg-black"
            type="submit"
          >
            Search
          </button>
        </form>

        {/* Type Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted">Type:</span>
          <select
            className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-[#e4674e]"
            onChange={(e) => setType(e.target.value)}
            value={type}
          >
            {FILE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Owner Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted">Owner:</span>
          <select
            className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-[#e4674e]"
            onChange={(e) => setOwner(e.target.value)}
            value={owner}
          >
            {OWNER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Starred Toggle */}
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${
            starredOnly
              ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm'
              : 'border-[#ddd6cc] bg-white text-[#777169] hover:bg-[#f5f1ea]'
          }`}
          onClick={() => setStarredOnly(!starredOnly)}
          type="button"
        >
          <span className={starredOnly ? 'text-amber-500' : 'text-gray-400'}>★</span>
          Starred only
        </button>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted">Sort:</span>
          <select
            className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-2 text-xs font-medium text-ink outline-none focus:border-[#e4674e]"
            onChange={(e) => setSortBy(e.target.value)}
            value={sortBy}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg border border-[#ddd6cc] bg-white p-2 text-xs font-bold text-ink hover:bg-[#f5f1ea]"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
            type="button"
          >
            {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
          </button>
        </div>

        {/* Reset Filter Button */}
        <button
          className="text-xs font-bold text-coral underline hover:text-[#b54c38]"
          onClick={handleResetFilters}
          type="button"
        >
          Reset
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="error-banner mt-6">{error}</div>}

      {/* Results Container */}
      <div className="mt-8">
        {loading ? (
          <div className="empty-state py-16">
            <p className="font-semibold text-ink">Searching your cloud storage...</p>
            <p className="mt-1 text-xs text-muted">Querying indexed database records</p>
          </div>
        ) : data.results.length === 0 ? (
          <div className="empty-state py-16">
            <Icon name="search" size={32} />
            <p className="mt-3 font-semibold text-ink">No matching files or folders found</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              We couldn&apos;t find anything matching your filters. Try adjusting your query keywords
              or reset the filters.
            </p>
            <button
              className="auth-submit mt-5 max-w-[180px]"
              onClick={handleResetFilters}
              type="button"
            >
              Clear all filters
            </button>
          </div>
        ) : view === 'list' ? (
          /* List View */
          <div className="file-list">
            {data.results.map((item) => (
              <div
                className="file-list-row group flex items-center justify-between gap-4 p-3 transition hover:bg-[#f5f1ea]"
                key={`${item.resourceType}-${item.id}`}
                onContextMenu={(e) => {
                  if (item.resourceType === 'file' && onFileContextMenu) {
                    onFileContextMenu(e, item)
                  }
                }}
              >
                {/* Left Item Info */}
                <div
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                  onClick={() => {
                    if (item.resourceType === 'folder' && onOpenFolder) {
                      onOpenFolder(item)
                    } else if (item.resourceType === 'file' && onDownloadFile) {
                      onDownloadFile(item)
                    }
                  }}
                >
                  <button
                    className="p-1 text-lg text-gray-300 transition hover:scale-110 hover:text-amber-500"
                    onClick={(e) => handleToggleStar(e, item)}
                    title={item.isStarred ? 'Unstar' : 'Star'}
                    type="button"
                  >
                    <span className={item.isStarred ? 'text-amber-500' : 'text-gray-300'}>
                      {item.isStarred ? '★' : '☆'}
                    </span>
                  </button>

                  <div className="shrink-0">
                    {item.resourceType === 'folder' ? (
                      <div className="folder-icon compact folder-coral">
                        <Icon name="folder" size={17} />
                      </div>
                    ) : (
                      <div className="file-badge file-blue">
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
                        : `${formatType(item.mimeType)} · ${formatBytes(item.sizeBytes)}`}
                    </p>
                  </div>
                </div>

                {/* Owner info */}
                <div className="hidden min-w-[140px] items-center gap-2 sm:flex">
                  <div className="share-avatar text-[10px]">
                    {(item.owner?.displayName || item.owner?.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 truncate text-xs text-muted">
                    <p className="truncate font-medium text-ink">
                      {item.isOwner ? 'You (Owner)' : item.owner?.displayName || item.owner?.email}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {formatDate(item.updatedAt)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex shrink-0 items-center gap-1.5">
                  {item.resourceType === 'folder' ? (
                    <button
                      className="list-action rounded-md bg-[#eee9e1] px-2.5 py-1 text-xs font-semibold text-ink hover:bg-[#e4ddd3]"
                      onClick={() => onOpenFolder && onOpenFolder(item)}
                      type="button"
                    >
                      Open Folder
                    </button>
                  ) : (
                    <>
                      <button
                        className="list-action rounded-md bg-[#eee9e1] px-2.5 py-1 text-xs font-semibold text-ink hover:bg-[#e4ddd3]"
                        onClick={() => onDownloadFile && onDownloadFile(item)}
                        type="button"
                      >
                        Download
                      </button>
                      <button
                        className="list-action hidden rounded-md px-2 py-1 text-xs font-semibold text-muted hover:text-ink md:block"
                        onClick={() => onPublicLink && onPublicLink(item)}
                        type="button"
                      >
                        Public Link
                      </button>
                    </>
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
            {data.results.map((item) => (
              <div
                className="group relative flex flex-col justify-between rounded-xl border border-[#e5ded4] bg-[#fbfaf7] p-4 shadow-sm transition hover:shadow-md"
                key={`${item.resourceType}-${item.id}`}
              >
                {/* Header */}
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
                  <button
                    className="p-1 text-base text-gray-300 transition hover:scale-110"
                    onClick={(e) => handleToggleStar(e, item)}
                    title={item.isStarred ? 'Unstar' : 'Star'}
                    type="button"
                  >
                    <span className={item.isStarred ? 'text-amber-500' : 'text-gray-300'}>
                      {item.isStarred ? '★' : '☆'}
                    </span>
                  </button>
                </div>

                {/* Body */}
                <div className="mt-4">
                  <p
                    className="truncate font-display text-sm font-bold text-ink group-hover:text-coral"
                    title={item.name}
                  >
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {item.resourceType === 'folder'
                      ? 'Folder'
                      : `${formatType(item.mimeType)} · ${formatBytes(item.sizeBytes)}`}
                  </p>
                </div>

                {/* Footer / Owner */}
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

        {/* Pagination Bar */}
        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#eee9e1] pt-5">
            <p className="text-xs text-muted">
              Showing {(data.pagination.page - 1) * limit + 1}–
              {Math.min(data.pagination.page * limit, data.pagination.total)} of{' '}
              {data.pagination.total} results
            </p>

            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-[#f4f0e9] disabled:opacity-40"
                disabled={data.pagination.page <= 1}
                onClick={() => performSearch(data.pagination.page - 1)}
                type="button"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and around current page
                    return (
                      p === 1 ||
                      p === data.pagination.totalPages ||
                      Math.abs(p - data.pagination.page) <= 1
                    );
                  })
                  .map((p, idx, arr) => (
                    <span key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-xs text-muted">...</span>
                      )}
                      <button
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          p === data.pagination.page
                            ? 'bg-[#252422] text-white'
                            : 'bg-white text-ink hover:bg-[#f4f0e9]'
                        }`}
                        onClick={() => performSearch(p)}
                        type="button"
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>

              <button
                className="rounded-lg border border-[#ddd6cc] bg-white px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-[#f4f0e9] disabled:opacity-40"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => performSearch(data.pagination.page + 1)}
                type="button"
              >
                Next →
              </button>
            </div>
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

export default SearchResults
