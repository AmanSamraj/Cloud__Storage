import Icon from './Icon'

function Breadcrumbs({ items, onNavigate }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <span className="flex items-center gap-2" key={item.id || 'root'}>
          {index > 0 && <span className="text-[#b7b0a6]">/</span>}
          {index === items.length - 1 ? (
            <span className="font-semibold text-ink">{item.name}</span>
          ) : (
            <button className="breadcrumb-muted" onClick={() => onNavigate(item.id)} type="button">{item.name}</button>
          )}
        </span>
      ))}
    </div>
  )
}

function ViewToggle({ view, onChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="Choose file view">
      <button className={view === 'grid' ? 'view-active' : ''} onClick={() => onChange('grid')} type="button">
        <Icon name="grid" size={17} />
      </button>
      <button className={view === 'list' ? 'view-active' : ''} onClick={() => onChange('list')} type="button">
        <Icon name="list" size={18} />
      </button>
    </div>
  )
}

export { Breadcrumbs, ViewToggle }
