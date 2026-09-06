import Icon from './Icon'

const navigation = [
  { label: 'My Drive', icon: 'home', count: null },
  { label: 'Shared with me', icon: 'users', count: null },
  { label: 'Starred', icon: 'star', count: null },
  { label: 'Recent', icon: 'clock', count: null },
  { label: 'Trash', icon: 'trash', count: null },
]

function Sidebar({ activeItem, onNavigate, onNewFolder }) {
  return (
    <aside className="sidebar-shell hidden w-[252px] shrink-0 flex-col justify-between px-5 py-6 lg:flex">
      <div>
        <div className="mb-12 flex items-center gap-3 px-2">
          <div className="brand-mark">f</div>
          <span className="font-display text-[1.45rem] font-bold tracking-tight">
            folio
          </span>
        </div>

        <button className="new-button mb-9 flex w-full items-center justify-center gap-2" onClick={onNewFolder} type="button">
          <Icon name="plus" size={18} strokeWidth={2.4} />
          <span>New</span>
        </button>

        <nav aria-label="Main navigation" className="space-y-1">
          {navigation.map((item) => {
            const isActive = activeItem === item.label

            return (
              <button
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                key={item.label}
                onClick={() => onNavigate(item.label)}
                type="button"
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="space-y-4">
        <div className="storage-meter">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Storage</span>
            <span className="text-muted">68%</span>
          </div>
          <div className="meter-track"><div className="meter-fill" /></div>
          <p className="mt-2 text-xs text-muted">6.8 GB of 10 GB used</p>
        </div>
        <p className="px-2 text-[11px] uppercase tracking-[0.18em] text-muted">Personal workspace</p>
      </div>
    </aside>
  )
}

export default Sidebar
