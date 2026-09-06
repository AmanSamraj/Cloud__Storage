import Icon from './Icon'
import SearchBar from './SearchBar'
import UploadButton from './UploadButton'

function Topbar({ onUpload, onSelectResult, onViewAllResults, user }) {
  const initials = user?.display_name
    ? user.display_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'AS'

  return (
    <header className="topbar flex flex-wrap items-center gap-4 px-5 py-4 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="brand-mark brand-mark-small">f</div>
        <span className="font-display text-xl font-bold">folio</span>
      </div>

      <SearchBar onSelectResult={onSelectResult} onViewAllResults={onViewAllResults} />

      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <UploadButton onSelect={onUpload} />
        <button aria-label="Notifications" className="icon-button hidden sm:grid" type="button">
          <span className="notification-dot" />
          <span className="text-lg">&#9673;</span>
        </button>
        <div className="profile-chip">
          <div className="avatar">{initials}</div>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-semibold leading-tight text-ink">{user?.display_name || 'Aman Samraj'}</p>
            <p className="mt-0.5 text-[11px] text-muted">{user?.email || 'Personal'}</p>
          </div>
          <span className="hidden text-muted sm:block">&#8964;</span>
        </div>
      </div>
    </header>
  )
}

export default Topbar
