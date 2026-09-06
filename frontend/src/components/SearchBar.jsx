import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { searchResources } from '../api/search'

function SearchBar({ onSelectResult, onViewAllResults }) {
  const [query, setQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quickResults, setQuickResults] = useState([])
  const [quickFilter, setQuickFilter] = useState('all') // 'all', 'file', 'folder', 'starred'
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)
  const debounceTimerRef = useRef(null)

  // Global '/' keyboard shortcut to focus search input
  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      } else if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Perform debounced live search when query or quickFilter changes
  useEffect(() => {
    if (!query.trim() && quickFilter === 'all') {
      setQuickResults([])
      setLoading(false)
      return
    }

    clearTimeout(debounceTimerRef.current)
    setLoading(true)

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const typeParam = ['file', 'folder'].includes(quickFilter) ? quickFilter : 'all'
        const starredParam = quickFilter === 'starred' ? 'true' : undefined
        const data = await searchResources({
          q: query.trim(),
          type: typeParam,
          starred: starredParam,
          limit: 6,
        })
        setQuickResults(data.results || [])
        setDropdownOpen(true)
      } catch (err) {
        console.error('Search preview error:', err)
      } finally {
        setLoading(false)
      }
    }, 200)

    return () => clearTimeout(debounceTimerRef.current)
  }, [query, quickFilter])

  function handleSubmit(event) {
    event.preventDefault()
    setDropdownOpen(false)
    if (onViewAllResults) {
      onViewAllResults({
        q: query.trim(),
        type: ['file', 'folder'].includes(quickFilter) ? quickFilter : 'all',
        starred: quickFilter === 'starred' ? 'true' : undefined,
      })
    }
  }

  function handleItemClick(item) {
    setDropdownOpen(false)
    if (onSelectResult) {
      onSelectResult(item)
    }
  }

  return (
    <div className="search-wrapper relative order-3 flex-1 sm:order-none" ref={wrapperRef}>
      <form onSubmit={handleSubmit}>
        <label className="search-box flex min-w-[220px] items-center gap-3">
          <Icon className="text-muted" name="search" size={19} />
          <input
            aria-label="Search files and folders"
            autoComplete="off"
            onChange={(e) => {
              setQuery(e.target.value)
              setDropdownOpen(true)
            }}
            onFocus={() => {
              if (query.trim() || quickResults.length > 0) setDropdownOpen(true)
            }}
            placeholder="Search files, folders, or type '/'..."
            ref={inputRef}
            type="search"
            value={query}
          />
          {query ? (
            <button
              className="clear-search-btn"
              onClick={(e) => {
                e.preventDefault()
                setQuery('')
                setQuickResults([])
                setDropdownOpen(false)
                inputRef.current?.focus()
              }}
              type="button"
            >
              ✕
            </button>
          ) : (
            <span className="search-shortcut" title="Press '/' to search">/</span>
          )}
        </label>
      </form>

      {/* Live Dropdown Preview */}
      {dropdownOpen && (
        <div className="search-dropdown">
          {/* Quick Filter Bar */}
          <div className="search-dropdown-filters">
            <span className="search-dropdown-label">Filter:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'file', label: 'Files' },
              { id: 'folder', label: 'Folders' },
              { id: 'starred', label: '★ Starred' },
            ].map((filter) => (
              <button
                className={`search-dropdown-chip ${quickFilter === filter.id ? 'active' : ''}`}
                key={filter.id}
                onClick={() => setQuickFilter(filter.id)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="search-dropdown-message">Searching...</div>
          ) : quickResults.length > 0 ? (
            <div className="search-dropdown-results">
              {quickResults.map((item) => (
                <button
                  className="search-dropdown-item"
                  key={`${item.resourceType}-${item.id}`}
                  onClick={() => handleItemClick(item)}
                  type="button"
                >
                  <div className="search-dropdown-icon">
                    {item.resourceType === 'folder' ? (
                      <div className="folder-icon compact folder-coral">
                        <Icon name="folder" size={16} />
                      </div>
                    ) : (
                      <div className="file-badge file-blue">
                        {item.mimeType?.split('/').pop()?.slice(0, 4)?.toUpperCase() || 'FILE'}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-ink">
                      {item.name}
                      {item.isStarred && <span className="ml-1.5 text-amber-500">★</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {item.resourceType === 'folder'
                        ? 'Folder'
                        : `${item.mimeType || 'File'} · ${formatBytes(item.sizeBytes)}`}
                      {' · '}
                      {item.isOwner ? 'Owned by you' : `Shared by ${item.owner?.displayName || item.owner?.email || 'someone'}`}
                    </p>
                  </div>
                  <span className="search-dropdown-action text-xs text-muted">
                    {item.resourceType === 'folder' ? 'Open →' : 'View'}
                  </span>
                </button>
              ))}

              <button className="search-dropdown-viewall" onClick={handleSubmit} type="button">
                <span>View all search results for &ldquo;{query || quickFilter}&rdquo;</span>
                <span className="font-bold">→</span>
              </button>
            </div>
          ) : query.trim() ? (
            <div className="search-dropdown-message">
              No matching files or folders found.
              <button
                className="mt-2 block text-xs font-semibold text-coral underline"
                onClick={handleSubmit}
                type="button"
              >
                Open advanced search
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`
}

export default SearchBar
